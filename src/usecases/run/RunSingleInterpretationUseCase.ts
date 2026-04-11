import type { CredentialRepository } from '../../repositories/credential/CredentialRepository'
import type { SourceFileRef } from '../../types/file'
import type { ModelConfig } from '../../types/config'
import type { ParsedDocument } from '../../types/parser'
import type { ModelUsage } from '../../types/llm'
import type { ChunkingMetadata } from '../../types/prompt'
import type { DocumentParser } from '../../services/parser/DocumentParser'
import type { PromptComposer } from '../../services/prompt/PromptComposer'
import type { LLMClient } from '../../services/llm/LLMClient'
import type { MarkdownWriter } from '../../services/output/MarkdownWriter'
import { isNonEmpty, isValidUrl } from '../../utils/validate'
import { normalizeOpenAIEndpoint } from '../../utils/endpoint'

const CHUNK_MAX_CHARS = 20000
const CHUNK_SUMMARY_MAX_CHARS = 12000

export interface RunSingleInterpretationInput {
  file: SourceFileRef
  outputDir: string
  promptContent: string
  promptName?: string
  modelConfig: ModelConfig
  runtimeApiKey?: string
  signal?: AbortSignal
  onStageChange?: (stage: string) => void
}

export interface RunSingleInterpretationResult {
  outputPath: string
  content: string
  chunking?: ChunkingMetadata
}

export class RunSingleInterpretationUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepository,
    private readonly documentParser: DocumentParser,
    private readonly promptComposer: PromptComposer,
    private readonly llmClient: LLMClient,
    private readonly markdownWriter: MarkdownWriter,
  ) {}

  async execute(input: RunSingleInterpretationInput): Promise<RunSingleInterpretationResult> {
    input.onStageChange?.('正在校验任务参数')
    const normalizedEndpoint = normalizeOpenAIEndpoint(input.modelConfig.endpoint, input.modelConfig.endpointMode)

    if (!isNonEmpty(input.outputDir)) {
      throw new Error('输出目录不能为空')
    }

    if (!isNonEmpty(input.promptContent)) {
      throw new Error('提示词不能为空')
    }

    if (!isNonEmpty(normalizedEndpoint) || !isValidUrl(normalizedEndpoint)) {
      throw new Error('模型 Endpoint 无效')
    }

    if (!isNonEmpty(input.modelConfig.modelName)) {
      throw new Error('模型名称不能为空')
    }

    input.onStageChange?.('正在读取 API Key')
    const runtimeApiKey = input.runtimeApiKey?.trim() ?? ''
    const savedApiKey = runtimeApiKey ? '' : (await this.credentialRepository.loadApiKey())?.trim() ?? ''
    const apiKey = runtimeApiKey || savedApiKey

    if (!apiKey) {
      throw new Error('未找到可用的 API Key')
    }

    input.onStageChange?.(`正在解析文档：${input.file.name}`)
    let document: ParsedDocument
    try {
      document = await this.documentParser.parse(input.file)
    } catch (error) {
      throw new Error(`文档解析失败: ${normalizeErrorMessage(error)}`)
    }

    const runResult = await this.generateInterpretation({
      document,
      promptContent: input.promptContent,
      modelConfig: input.modelConfig,
      apiKey,
      signal: input.signal,
      onStageChange: input.onStageChange,
    })

    input.onStageChange?.('正在写入结果文件')
    try {
      const writeResult = await this.markdownWriter.write(input.outputDir, {
        source: document,
        promptName: input.promptName,
        modelName: input.modelConfig.modelName,
        endpointSummary: summarizeEndpoint(normalizedEndpoint),
        generatedAt: new Date().toISOString(),
        content: runResult.content,
        usage: runResult.usage,
        chunking: runResult.chunking,
        chunkSummaries: runResult.chunkSummaries,
        truncation: runResult.truncation,
      })

      return {
        outputPath: writeResult.outputPath,
        content: runResult.content,
        chunking: runResult.chunking,
      }
    } catch (error) {
      throw new Error(`结果写入失败: ${normalizeErrorMessage(error)}`)
    }
  }

  private async generateInterpretation(input: {
    document: ParsedDocument
    promptContent: string
    modelConfig: ModelConfig
    apiKey: string
    signal?: AbortSignal
    onStageChange?: (stage: string) => void
  }): Promise<{
    content: string
    usage?: ModelUsage
    chunking?: ChunkingMetadata
    chunkSummaries?: string[]
    truncation: {
      applied: boolean
      originalLength: number
      finalLength: number
    }
  }> {
    const normalizedText = input.document.text.trim()
    const chunks = splitDocumentIntoChunks(normalizedText, CHUNK_MAX_CHARS)

    if (chunks.length <= 1) {
      input.onStageChange?.('正在组装提示词')
      const composed = this.promptComposer.compose({
        promptContent: input.promptContent,
        document: input.document,
      })

      input.onStageChange?.('正在调用模型')
      const modelResult = await this.callModel({
        modelConfig: input.modelConfig,
        apiKey: input.apiKey,
        prompt: composed.userPrompt,
        signal: input.signal,
      })

      return {
        content: modelResult.content,
        usage: modelResult.usage,
        chunking: {
          enabled: false,
          originalLength: normalizedText.length,
          finalLength: composed.truncation.finalLength,
        },
        chunkSummaries: undefined,
        truncation: composed.truncation,
      }
    }

    input.onStageChange?.(`检测到长文，准备分块处理（共 ${chunks.length} 段）`)

    const chunkSummaries: string[] = []
    const chunkAppendixEntries: string[] = []
    let usage: ModelUsage = createEmptyUsage()

    for (let index = 0; index < chunks.length; index += 1) {
      const chunkText = chunks[index]
      input.onStageChange?.(`正在解读分块 ${index + 1}/${chunks.length}`)

      const chunkDocument: ParsedDocument = {
        ...input.document,
        text: chunkText,
      }

      const composed = this.promptComposer.compose({
        promptContent: buildChunkPrompt(input.promptContent, index + 1, chunks.length),
        document: chunkDocument,
      })

      const modelResult = await this.callModel({
        modelConfig: input.modelConfig,
        apiKey: input.apiKey,
        prompt: composed.userPrompt,
        signal: input.signal,
      })

      usage = mergeUsage(usage, modelResult.usage)
      const chunkSummary = trimChunkSummary(modelResult.content, index + 1)
      chunkSummaries.push(chunkSummary)
      chunkAppendixEntries.push(modelResult.content.trim())
    }

    input.onStageChange?.('正在汇总分块结果')
    const summaryBundle = chunkSummaries.join('\n\n')
    const finalPrompt = buildFinalSummaryPrompt(input.promptContent, input.document, summaryBundle)

    try {
      const finalResult = await this.callModel({
        modelConfig: input.modelConfig,
        apiKey: input.apiKey,
        prompt: finalPrompt,
        signal: input.signal,
      })

      usage = mergeUsage(usage, finalResult.usage)

      return {
        content: finalResult.content,
        usage,
        chunking: {
          enabled: true,
          chunkCount: chunks.length,
          originalLength: normalizedText.length,
          finalLength: summaryBundle.length,
          degraded: false,
        },
        chunkSummaries: chunkAppendixEntries,
        truncation: {
          applied: false,
          originalLength: normalizedText.length,
          finalLength: normalizedText.length,
        },
      }
    } catch (error) {
      const firstError = normalizeErrorMessage(error)
      input.onStageChange?.('长文汇总首次失败，正在缩减上下文后重试')

      const retrySummaryBundle = shrinkSummaryBundle(chunkSummaries)
      const retryPrompt = buildFinalSummaryPrompt(input.promptContent, input.document, retrySummaryBundle)

      try {
        const retryResult = await this.callModel({
          modelConfig: input.modelConfig,
          apiKey: input.apiKey,
          prompt: retryPrompt,
          signal: input.signal,
        })

        usage = mergeUsage(usage, retryResult.usage)

        return {
          content: retryResult.content,
          usage,
          chunking: {
            enabled: true,
            chunkCount: chunks.length,
            originalLength: normalizedText.length,
            finalLength: retrySummaryBundle.length,
            degraded: false,
          },
          chunkSummaries: chunkAppendixEntries,
          truncation: {
            applied: false,
            originalLength: normalizedText.length,
            finalLength: normalizedText.length,
          },
        }
      } catch (retryError) {
        const degradeReason = `首次汇总失败：${firstError}；缩减后重试失败：${normalizeErrorMessage(retryError)}`
        input.onStageChange?.('长文汇总失败，正在降级输出分块摘要')

        return {
          content: buildDegradedContent(chunkAppendixEntries, degradeReason),
          usage,
          chunking: {
            enabled: true,
            chunkCount: chunks.length,
            originalLength: normalizedText.length,
            finalLength: retrySummaryBundle.length,
            degraded: true,
            degradeReason,
          },
          chunkSummaries: chunkAppendixEntries,
          truncation: {
            applied: false,
            originalLength: normalizedText.length,
            finalLength: normalizedText.length,
          },
        }
      }
    }
  }

  private async callModel(input: {
    modelConfig: ModelConfig
    apiKey: string
    prompt: string
    signal?: AbortSignal
  }) {
    try {
      return await this.llmClient.generate({
        endpoint: normalizeOpenAIEndpoint(input.modelConfig.endpoint, input.modelConfig.endpointMode),
        endpointMode: input.modelConfig.endpointMode,
        modelName: input.modelConfig.modelName,
        apiKey: input.apiKey,
        prompt: input.prompt,
        timeoutMs: input.modelConfig.timeoutMs,
        temperature: input.modelConfig.temperature,
        maxTokens: input.modelConfig.maxTokens,
        signal: input.signal,
      })
    } catch (error) {
      throw new Error(`模型调用失败: ${normalizeErrorMessage(error)}`)
    }
  }
}

function splitDocumentIntoChunks(text: string, maxChars: number): string[] {
  const normalized = text.trim()
  if (!normalized) {
    return ['']
  }

  if (normalized.length <= maxChars) {
    return [normalized]
  }

  const sectionChunks = splitBySections(normalized, maxChars)
  if (sectionChunks.length > 1) {
    return sectionChunks
  }

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph
      continue
    }

    const candidate = `${current}\n\n${paragraph}`
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }

    chunks.push(current)
    current = paragraph
  }

  if (current) {
    chunks.push(current)
  }

  return chunks.flatMap((chunk) => splitOversizedChunk(chunk, maxChars)).filter(Boolean)
}

function splitBySections(text: string, maxChars: number): string[] {
  const sections = buildSections(text)
  if (sections.length <= 1) {
    return [text]
  }

  const chunks: string[] = []
  let current = ''

  for (const section of sections) {
    if (!current) {
      current = section
      continue
    }

    const candidate = `${current}\n\n${section}`
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }

    chunks.push(current)
    current = section
  }

  if (current) {
    chunks.push(current)
  }

  return chunks.flatMap((chunk) => splitOversizedChunk(chunk, maxChars)).filter(Boolean)
}

function buildSections(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) {
    return [text]
  }

  const sections: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph
      continue
    }

    if (isSectionHeading(paragraph)) {
      sections.push(current)
      current = paragraph
      continue
    }

    current = `${current}\n\n${paragraph}`
  }

  if (current) {
    sections.push(current)
  }

  return sections.length > 1 ? sections : [text]
}

function isSectionHeading(paragraph: string): boolean {
  const firstLine = paragraph.split(/\r?\n/)[0]?.trim() ?? ''
  if (!firstLine || firstLine.length > 120) {
    return false
  }

  if (/^#{1,6}\s+/.test(firstLine)) {
    return true
  }

  if (/^##\s*第\s*\d+\s*页$/.test(firstLine)) {
    return true
  }

  if (/^(abstract|introduction|background|methods?|materials? and methods?|results?|discussion|conclusion|references|keywords)\b/i.test(firstLine)) {
    return true
  }

  if (/^(chapter\s+\d+|section\s+\d+)\b/i.test(firstLine)) {
    return true
  }

  if (/^(第[一二三四五六七八九十百零\d]+章|第[一二三四五六七八九十百零\d]+节)\b/.test(firstLine)) {
    return true
  }

  if (/^(\d+([.．]\d+)*[.．]?|[IVXLC]+[.．])\s+/.test(firstLine)) {
    return true
  }

  return /^[A-Z][A-Z\s\d,&/:-]{3,}$/.test(firstLine)
}

function splitOversizedChunk(chunk: string, maxChars: number): string[] {
  if (chunk.length <= maxChars) {
    return [chunk]
  }

  const parts: string[] = []
  let cursor = 0

  while (cursor < chunk.length) {
    parts.push(chunk.slice(cursor, cursor + maxChars).trim())
    cursor += maxChars
  }

  return parts.filter(Boolean)
}

function buildChunkPrompt(promptContent: string, chunkIndex: number, chunkCount: number): string {
  return [
    promptContent,
    '',
    `补充要求：当前仅处理整篇文献的第 ${chunkIndex}/${chunkCount} 个分块。`,
    '请只基于当前分块输出结构化阶段性解读，明确保留：研究目标、方法、数据/实验、关键发现、局限性。',
    '如果当前分块信息不完整，请明确说明“本分块未提供足够信息”。',
  ].join('\n')
}

function buildFinalSummaryPrompt(promptContent: string, document: ParsedDocument, summaryBundle: string): string {
  return [
    '你将收到一篇长文献分块解读后的阶段性结果，请综合它们输出最终完整解读。',
    '',
    promptContent,
    '',
    '补充要求：',
    '- 需要合并重复信息，消除前后冲突',
    '- 如果不同分块信息不一致，请明确指出',
    '- 输出时不要再按“分块 1/2/3”组织，而是生成面向整篇文献的一体化结论',
    '',
    `文件名：${document.name}`,
    `文件类型：${document.kind}`,
    '以下是各分块的阶段性解读：',
    summaryBundle,
  ].join('\n')
}

function trimChunkSummary(content: string, chunkIndex: number): string {
  const normalized = content.trim()
  const summary = normalized.length > CHUNK_SUMMARY_MAX_CHARS
    ? `${normalized.slice(0, CHUNK_SUMMARY_MAX_CHARS)}...`
    : normalized

  return `### 分块 ${chunkIndex}\n${summary}`
}

function buildDegradedContent(chunkSummaries: string[], degradeReason: string): string {
  return [
    '由于长文汇总阶段失败，当前结果已自动降级为“分块摘要拼接版”。',
    '',
    `汇总失败原因：${degradeReason}`,
    '',
    '以下为各分块阶段性解读，可用于人工复核或后续再次汇总：',
    '',
    ...chunkSummaries.flatMap((summary, index) => [
      `## 分块 ${index + 1}`,
      summary,
      '',
    ]),
  ].join('\n')
}

function shrinkSummaryBundle(chunkSummaries: string[]): string {
  return chunkSummaries
    .map((summary, index) => {
      const normalized = summary.trim()
      const body = normalized.replace(/^###\s+分块\s+\d+\s*/u, '').trim()
      const shortened = body.length > 3000 ? `${body.slice(0, 3000)}...` : body
      return `### 分块 ${index + 1}\n${shortened}`
    })
    .join('\n\n')
}

function createEmptyUsage(): ModelUsage {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  }
}

function mergeUsage(base: ModelUsage, incoming: ModelUsage | undefined): ModelUsage {
  return {
    promptTokens: (base.promptTokens ?? 0) + (incoming?.promptTokens ?? 0),
    completionTokens: (base.completionTokens ?? 0) + (incoming?.completionTokens ?? 0),
    totalTokens: (base.totalTokens ?? 0) + (incoming?.totalTokens ?? 0),
  }
}

function summarizeEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint)
    return `${url.protocol}//${url.host}${url.pathname}`
  } catch {
    return 'invalid-endpoint'
  }
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (error && typeof error === 'object') {
    try {
      const serialized = JSON.stringify(error)
      if (serialized && serialized !== '{}') {
        return serialized
      }
    } catch {
      return '未知对象错误'
    }
  }

  return '未知错误'
}
