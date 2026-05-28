import type { CredentialRepository } from '../../repositories/credential/CredentialRepository'
import type { SourceFileRef } from '../../types/file'
import type { ModelConfig } from '../../types/config'
import type { ParsedDocument } from '../../types/parser'
import type { ModelUsage } from '../../types/llm'
import type { ChunkingMetadata } from '../../types/prompt'
import type { DocumentParser } from '../../services/parser/DocumentParser'
import type { PromptComposer } from '../../services/prompt/PromptComposer'
import type { LLMClient } from '../../services/llm/LLMClient'
import { ModelClientFactory } from '../../services/llm/ModelClientFactory'
import { SmartChunkingService } from '../../services/chunking/SmartChunkingService'
import { chunkCacheService } from '../../services/chunking/ChunkCacheService'
import { PaperAnalyzer } from '../../services/analyzer/PaperAnalyzer'
import type { MarkdownWriter } from '../../services/output/MarkdownWriter'
import { performanceMonitor } from '../../services/monitoring/PerformanceMonitorService'
import { errorHandler } from '../../services/error/ErrorHandlerService'
import { isNonEmpty, isValidUrl } from '../../utils/validate'
import { normalizeOpenAIEndpoint } from '../../utils/endpoint'
import { globalThrottler } from '../../utils/requestThrottler'
import { pluginManager } from '../../plugins/PluginManager'

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
  enableChunking?: boolean
}

export interface RunSingleInterpretationResult {
  outputPath: string
  content: string
  chunking?: ChunkingMetadata
}

export class RunSingleInterpretationUseCase {
  private readonly smartChunkingService: SmartChunkingService
  private readonly paperAnalyzer: PaperAnalyzer

  constructor(
    private readonly credentialRepository: CredentialRepository,
    private readonly documentParser: DocumentParser,
    private readonly promptComposer: PromptComposer,
    private readonly modelClientFactory: typeof ModelClientFactory,
    private readonly markdownWriter: MarkdownWriter,
  ) {
    this.smartChunkingService = new SmartChunkingService()
    this.paperAnalyzer = new PaperAnalyzer()
  }

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

    // 初始化插件管理器
    if (!pluginManager.isInitialized()) {
      await pluginManager.initialize()
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
      // 触发文档解析前的插件事件
      await pluginManager.emitDocumentBeforeParse(input.file)

      const parseId = performanceMonitor.start('document_parse', 'parser', { filename: input.file.name })
      document = await this.documentParser.parse(input.file)
      performanceMonitor.end(parseId)

      // 触发文档解析后的插件事件
      document.text = await pluginManager.emitDocumentAfterParse(input.file, document.text)
    } catch (error) {
      const errorInfo = errorHandler.handleError(error)
      throw new Error(`文档解析失败: ${errorInfo.message}\n${errorInfo.details}\n建议: ${errorInfo.suggestion}`)
    }

    const runResult = await this.generateInterpretation({
      document,
      promptContent: input.promptContent,
      modelConfig: input.modelConfig,
      apiKey,
      signal: input.signal,
      onStageChange: input.onStageChange,
      enableChunking: input.enableChunking,
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
        paperDirection: runResult.paperDirection,
        truncation: runResult.truncation,
      })

      return {
        outputPath: writeResult.outputPath,
        content: runResult.content,
        chunking: runResult.chunking,
      }
    } catch (error) {
      const errorInfo = errorHandler.handleError(error)
      throw new Error(`结果写入失败: ${errorInfo.message}\n${errorInfo.details}\n建议: ${errorInfo.suggestion}`)
    }
  }

  private async generateInterpretation(input: {
    document: ParsedDocument
    promptContent: string
    modelConfig: ModelConfig
    apiKey: string
    signal?: AbortSignal
    onStageChange?: (stage: string) => void
    enableChunking?: boolean
  }): Promise<{
    content: string
    usage?: ModelUsage
    chunking?: ChunkingMetadata
    chunkSummaries?: string[]
    paperDirection?: any
    truncation: {
      applied: boolean
      originalLength: number
      finalLength: number
    }
  }> {
    const normalizedText = input.document.text.trim()
    const maxTokens = input.modelConfig.maxTokens || this.smartChunkingService.getDefaultMaxTokens(input.modelConfig.modelName)
    
    // 分析论文方向
    let paperDirection = undefined
    try {
      input.onStageChange?.('正在分析论文研究方向')
      const analyzeId = performanceMonitor.start('paper_direction_analysis', 'analyzer', { model: input.modelConfig.modelName })
      paperDirection = await this.paperAnalyzer.analyzePaperDirection(normalizedText, input.modelConfig, input.apiKey)
      performanceMonitor.end(analyzeId)
    } catch (error) {
      // 方向分析失败不影响主要功能
      console.warn('论文方向分析失败:', error)
    }

    // 检查是否启用分块处理
    if (!input.enableChunking) {
      input.onStageChange?.('正在组装提示词（不分块模式）')
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
        paperDirection,
        truncation: composed.truncation,
      }
    }

    // 启用分块处理
    const chunkResults = this.smartChunkingService.chunkByMaxTokens(normalizedText, maxTokens)
    const chunks = chunkResults.map(chunk => chunk.text)

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
        paperDirection,
        truncation: composed.truncation,
      }
    }

    input.onStageChange?.(`检测到长文，准备分块处理（共 ${chunks.length} 段，每段最大 ${maxTokens} tokens）`)

    const chunkSummaries: string[] = []
    const chunkAppendixEntries: string[] = []
    let usage: ModelUsage = createEmptyUsage()

    // 并行处理分块，每次处理2个分块（根据API限制调整）
    const batchSize = 2
    for (let batchStart = 0; batchStart < chunks.length; batchStart += batchSize) {
      // 检查是否取消
      if (input.signal?.aborted) {
        throw new Error('任务已取消')
      }
      
      const batchEnd = Math.min(batchStart + batchSize, chunks.length)
      const batchChunks = chunks.slice(batchStart, batchEnd)
      
      const batchResults = await Promise.all(
        batchChunks.map(async (chunkText, batchIndex) => {
          // 检查是否取消
          if (input.signal?.aborted) {
            throw new Error('任务已取消')
          }
          
          const actualIndex = batchStart + batchIndex
          const chunkTokenCount = this.smartChunkingService.calculateTotalTokens(chunkText)
          
          // 检查分块是否在缓存中
          const cachedResult = chunkCacheService.get(chunkText, input.modelConfig.modelName)
          if (cachedResult) {
            input.onStageChange?.(`从缓存中获取分块 ${actualIndex + 1}/${chunks.length} 的结果`)
            return {
              summary: trimChunkSummary(cachedResult, actualIndex + 1),
              fullContent: cachedResult,
              usage: undefined
            }
          }

          input.onStageChange?.(`正在解读分块 ${actualIndex + 1}/${chunks.length}（${chunkTokenCount} tokens）`)

          const chunkDocument: ParsedDocument = {
            ...input.document,
            text: chunkText,
          }

          const composed = this.promptComposer.compose({
            promptContent: buildChunkPrompt(input.promptContent, actualIndex + 1, chunks.length),
            document: chunkDocument,
            skipTruncation: true,
          })

          const modelResult = await this.callModel({
            modelConfig: input.modelConfig,
            apiKey: input.apiKey,
            prompt: composed.userPrompt,
            signal: input.signal,
          })

          // 将分块结果存入缓存
          chunkCacheService.set(chunkText, input.modelConfig.modelName, modelResult.content.trim(), chunkTokenCount)

          return {
            summary: trimChunkSummary(modelResult.content, actualIndex + 1),
            fullContent: modelResult.content.trim(),
            usage: modelResult.usage
          }
        })
      )

      // 处理批处理结果
      batchResults.forEach((result) => {
        chunkSummaries.push(result.summary)
        chunkAppendixEntries.push(result.fullContent)
        if (result.usage) {
          usage = mergeUsage(usage, result.usage)
        }
      })
    }

    // 检查是否取消
    if (input.signal?.aborted) {
      throw new Error('任务已取消')
    }
    
    input.onStageChange?.('正在汇总分块结果')
    
    // 使用滚动汇总方式，避免单次请求token数过多
    const finalContent = await this.performRollupSummary(
      chunkSummaries,
      input.promptContent,
      input.document,
      input.modelConfig,
      input.apiKey,
      input.signal,
      input.onStageChange
    )
    
    usage = mergeUsage(usage, finalContent.usage)

    return {
      content: finalContent.content,
      usage,
      chunking: {
        enabled: true,
        chunkCount: chunks.length,
        originalLength: normalizedText.length,
        finalLength: finalContent.content.length,
        maxTokens,
        degraded: finalContent.degraded,
        degradeReason: finalContent.degradeReason,
      },
      chunkSummaries: chunkAppendixEntries,
      paperDirection,
      truncation: {
        applied: false,
        originalLength: normalizedText.length,
        finalLength: normalizedText.length,
      },
    }
  }

  private async callModel(input: {
    modelConfig: ModelConfig
    apiKey: string
    prompt: string
    signal?: AbortSignal
  }) {
    try {
      const callId = performanceMonitor.start('model_call', 'llm', {
        model: input.modelConfig.modelName,
        provider: input.modelConfig.providerType,
        promptLength: input.prompt.length
      })
      
      // 使用节流器限制API调用频率
      await globalThrottler.throttle()
      
      // 触发模型调用前的插件事件
      const processedPrompt = await pluginManager.emitModelBeforeCall(input.prompt, input.modelConfig)
      
      const llmClient = this.modelClientFactory.createClient(input.modelConfig.providerType)
      const result = await llmClient.generate({
        endpoint: normalizeOpenAIEndpoint(input.modelConfig.endpoint, input.modelConfig.endpointMode),
        endpointMode: input.modelConfig.endpointMode,
        modelName: input.modelConfig.modelName,
        apiKey: input.apiKey,
        prompt: processedPrompt,
        timeoutMs: input.modelConfig.timeoutMs,
        temperature: input.modelConfig.temperature,
        maxTokens: input.modelConfig.maxTokens,
        signal: input.signal,
      })
      
      // 触发模型调用后的插件事件
      result.content = await pluginManager.emitModelAfterCall(result.content, input.modelConfig)
      
      performanceMonitor.end(callId)
      return result
    } catch (error) {
      const errorInfo = errorHandler.handleError(error)
      throw new Error(`模型调用失败: ${errorInfo.message}\n${errorInfo.details}\n建议: ${errorInfo.suggestion}`)
    }
  }

  private async performRollupSummary(
    chunkSummaries: string[],
    promptContent: string,
    document: ParsedDocument,
    modelConfig: ModelConfig,
    apiKey: string,
    signal?: AbortSignal,
    onStageChange?: (stage: string) => void
  ): Promise<{
    content: string
    usage?: ModelUsage
    degraded: boolean
    degradeReason?: string
  }> {
    const MAX_ROLLUP_CHUNKS = 5
    const totalChunks = chunkSummaries.length
    
    // 如果分块数量不多，可以直接一次性汇总
    if (totalChunks <= MAX_ROLLUP_CHUNKS) {
      const summaryBundle = chunkSummaries.join('\n\n')
      const finalPrompt = buildFinalSummaryPrompt(promptContent, document, summaryBundle)
      
      try {
        const finalResult = await this.callModel({
          modelConfig,
          apiKey,
          prompt: finalPrompt,
          signal,
        })
        return {
          content: finalResult.content,
          usage: finalResult.usage,
          degraded: false,
        }
      } catch (error) {
        return {
          content: buildDegradedContent(chunkSummaries, normalizeErrorMessage(error)),
          degraded: true,
          degradeReason: normalizeErrorMessage(error),
        }
      }
    }
    
    // 使用滚动汇总策略
    onStageChange?.(`使用滚动汇总策略（共 ${totalChunks} 个分块）`)
    
    let currentSummary = ''
    let accumulatedUsage: ModelUsage = createEmptyUsage()
    let degradeReason: string | undefined
    
    for (let i = 0; i < totalChunks; i += MAX_ROLLUP_CHUNKS) {
      // 检查是否取消
      if (signal?.aborted) {
        throw new Error('任务已取消')
      }
      
      const endIndex = Math.min(i + MAX_ROLLUP_CHUNKS, totalChunks)
      const batch = chunkSummaries.slice(i, endIndex)
      
      onStageChange?.(`汇总分块 ${i + 1}-${endIndex}/${totalChunks}`)
      
      // 构建滚动汇总提示词
      let rollupPrompt: string
      if (i === 0) {
        // 第一轮：直接汇总前几个分块
        const batchBundle = batch.join('\n\n')
        rollupPrompt = buildRollupPrompt(promptContent, document, batchBundle, 1, Math.ceil(totalChunks / MAX_ROLLUP_CHUNKS))
      } else {
        // 后续轮次：将之前的汇总结果与新分块合并
        const batchBundle = batch.join('\n\n')
        rollupPrompt = buildRollupPrompt(
          promptContent, 
          document, 
          batchBundle, 
          Math.floor(i / MAX_ROLLUP_CHUNKS) + 1, 
          Math.ceil(totalChunks / MAX_ROLLUP_CHUNKS),
          currentSummary
        )
      }
      
      try {
        const result = await this.callModel({
          modelConfig,
          apiKey,
          prompt: rollupPrompt,
          signal,
        })
        
        currentSummary = result.content
        accumulatedUsage = mergeUsage(accumulatedUsage, result.usage)
        
      } catch (error) {
        const errorMsg = normalizeErrorMessage(error)
        degradeReason = `汇总分块 ${i + 1}-${endIndex} 时失败: ${errorMsg}`
        onStageChange?.(degradeReason)
        
        // 返回降级内容
        return {
          content: buildDegradedContent(chunkSummaries, degradeReason),
          usage: accumulatedUsage,
          degraded: true,
          degradeReason,
        }
      }
    }
    
    return {
      content: currentSummary,
      usage: accumulatedUsage,
      degraded: false,
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

function buildRollupPrompt(
  promptContent: string,
  document: ParsedDocument,
  summaryBundle: string,
  currentRound: number,
  totalRounds: number,
  previousSummary?: string
): string {
  const parts = [
    '你将收到一篇长文献分块解读后的阶段性结果，请综合它们输出汇总解读。',
    '',
    promptContent,
    '',
    '补充要求：',
    '- 需要合并重复信息，消除前后冲突',
    '- 如果不同分块信息不一致，请明确指出',
    '- 输出时按逻辑组织，保持连贯性',
    '',
    `文件名：${document.name}`,
    `文件类型：${document.kind}`,
    `汇总阶段：第 ${currentRound}/${totalRounds} 轮`,
  ]
  
  if (previousSummary && currentRound > 1) {
    parts.push(
      '',
      '以下是前一轮的汇总结果（请与本轮新内容合并）：',
      previousSummary,
    )
  }
  
  parts.push(
    '',
    '以下是本轮待汇总的分块阶段性解读：',
    summaryBundle,
  )
  
  return parts.join('\n')
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
