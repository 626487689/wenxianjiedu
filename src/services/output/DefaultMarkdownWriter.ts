import type { MarkdownWriter } from './MarkdownWriter'
import type { MarkdownOutputInput, OutputWriteResult } from '../../types/output'
import type { FileGateway } from '../../repositories/file/FileGateway'
import { buildOutputFileName } from './fileName'
import { joinFilePath } from '../../utils/path'

export class DefaultMarkdownWriter implements MarkdownWriter {
  constructor(private readonly fileGateway: FileGateway) {}

  async write(outputDir: string, input: MarkdownOutputInput): Promise<OutputWriteResult> {
    const fileName = buildOutputFileName(input.source.name)
    const outputPath = joinFilePath(outputDir, fileName)
    const truncationStatus = input.truncation?.applied ? '是' : '否'
    const truncationDetail = input.truncation?.applied
      ? `（原始正文长度：${input.truncation.originalLength}，送模正文长度：${input.truncation.finalLength}）`
      : ''
    const usageLines = formatUsage(input)
    const chunkingLines = formatChunking(input)
    const paperDirectionLines = formatPaperDirection(input)
    const appendixLines = formatChunkAppendix(input)

    const content = [
      '# 文献解读结果',
      '',
      '## 基本信息',
      `- 源文件名：${input.source.name}`,
      `- 源文件路径：${input.source.path}`,
      `- 文件类型：${input.source.kind}`,
      `- 使用模型：${input.modelName}`,
      `- 接口摘要：${input.endpointSummary}`,
      `- 使用模板：${input.promptName ?? '自由提示词'}`,
      `- 处理时间：${input.generatedAt}`,
      `- 是否截断正文：${truncationStatus}${truncationDetail}`,
      ...chunkingLines,
      ...paperDirectionLines,
      ...usageLines,
      '',
      '## 解读内容',
      input.content,
      '',
      ...appendixLines,
    ].join('\n')

    await this.fileGateway.writeTextFile(outputPath, content)

    return { outputPath }
  }
}

function formatChunking(input: MarkdownOutputInput): string[] {
  if (!input.chunking?.enabled) {
    return ['- 长文分块：未启用']
  }

  const lines = [
    '- 长文分块：已启用',
    `  - 分块数量: ${input.chunking.chunkCount ?? '未知'}`,
    `  - 原始正文长度: ${input.chunking.originalLength}`,
    `  - 汇总输入长度: ${input.chunking.finalLength}`,
    `  - 是否降级输出: ${input.chunking.degraded ? '是' : '否'}`,
  ]

  if (input.chunking.degraded && input.chunking.degradeReason) {
    lines.push(`  - 降级原因: ${input.chunking.degradeReason}`)
  }

  return lines
}

function formatUsage(input: MarkdownOutputInput): string[] {
  if (!input.usage) {
    return ['- Token 统计：未提供']
  }

  const promptTokens = input.usage.promptTokens ?? '未知'
  const completionTokens = input.usage.completionTokens ?? '未知'
  const totalTokens = input.usage.totalTokens ?? '未知'

  return [
    '- Token 统计：',
    `  - promptTokens: ${promptTokens}`,
    `  - completionTokens: ${completionTokens}`,
    `  - totalTokens: ${totalTokens}`,
  ]
}

function formatChunkAppendix(input: MarkdownOutputInput): string[] {
  if (!input.chunking?.enabled || !input.chunkSummaries || input.chunkSummaries.length === 0) {
    return []
  }

  return [
    '## 分块阶段性摘要附录',
    '以下内容用于辅助核对长文汇总过程，保留各分块的阶段性解读结果。',
    '',
    ...input.chunkSummaries.flatMap((summary, index) => [
      `### 分块 ${index + 1}`,
      summary,
      '',
    ]),
  ]
}

function formatPaperDirection(input: MarkdownOutputInput): string[] {
  if (!input.paperDirection) {
    return []
  }

  const lines = [
    '- 研究方向分析：',
    `  - 主要方向: ${input.paperDirection.mainDirection}`,
    `  - 子方向: ${input.paperDirection.subDirections?.join(', ') ?? '无'}`,
    `  - 核心关键词: ${input.paperDirection.keywords?.join(', ') ?? '无'}`,
    `  - 置信度: ${input.paperDirection.confidence ?? '未知'}`,
  ]

  return lines
}
