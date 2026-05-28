import type { LLMClient } from './LLMClient'
import type { ModelRequest, ModelResponse } from '../../types/llm'
import { logger } from '../logger/LoggerService'
import { textChunkingService, type ChunkOptions } from '../chunking/TextChunkingService'

export interface ChunkedRequest extends ModelRequest {
  chunkOptions?: ChunkOptions
  mergeResults?: boolean
  chunkPromptTemplate?: string
}

export class ChunkedLLMClient implements LLMClient {
  private baseClient: LLMClient
  private defaultChunkSize = 6000
  private defaultMaxChunks = 15
  private defaultOverlap = 1

  constructor(baseClient: LLMClient) {
    this.baseClient = baseClient
  }

  async generate(req: ChunkedRequest): Promise<ModelResponse> {
    const text = req.prompt
    const chunkOptions: ChunkOptions = {
      maxChunkSize: req.chunkOptions?.maxChunkSize || this.defaultChunkSize,
      maxChunks: req.chunkOptions?.maxChunks || this.defaultMaxChunks,
      overlapPages: req.chunkOptions?.overlapPages ?? this.defaultOverlap,
    }

    const shouldChunk = textChunkingService.shouldChunk(text, chunkOptions)

    if (!shouldChunk) {
      logger.info('文本长度较短，无需分块处理')
      return this.baseClient.generate({
        ...req,
        prompt: text,
      })
    }

    logger.info(`开始分块处理: 文本长度=${text.length}`)

    const chunkingResult = textChunkingService.chunkText(text, chunkOptions)

    if (chunkingResult.totalChunks === 1) {
      logger.info('分块后只有1个块，直接处理')
      return this.baseClient.generate({
        ...req,
        prompt: text,
      })
    }

    logger.info(`分块完成: 共 ${chunkingResult.totalChunks} 个块`)

    const results: string[] = []

    for (let i = 0; i < chunkingResult.chunks.length; i++) {
      const chunk = chunkingResult.chunks[i]
      logger.info(`处理第 ${i + 1}/${chunkingResult.chunks.length} 个块, 长度=${chunk.content.length}`)

      const chunkPrompt = this.buildChunkPrompt(chunk, i, chunkingResult.totalChunks, req.chunkPromptTemplate)

      try {
        const chunkResponse = await this.baseClient.generate({
          ...req,
          prompt: chunkPrompt,
        })

        results.push(chunkResponse.content)

        logger.info(`第 ${i + 1} 个块处理完成, 响应长度=${chunkResponse.content.length}`)
      } catch (error) {
        logger.error(`第 ${i + 1} 个块处理失败: ${error}`)
        throw error
      }
    }

    let finalContent: string

    if (req.mergeResults !== false) {
      finalContent = textChunkingService.mergeChunkResults(results)
      logger.info(`合并完成: 最终长度=${finalContent.length}`)
    } else {
      finalContent = results.join('\n\n---\n\n')
    }

    return {
      content: finalContent,
    }
  }

  private buildChunkPrompt(
    chunk: { content: string; index: number; total: number },
    currentIndex: number,
    totalChunks: number,
    template?: string
  ): string {
    if (template) {
      return template
        .replace('{chunk}', chunk.content)
        .replace('{chunk_index}', String(currentIndex + 1))
        .replace('{total_chunks}', String(totalChunks))
    }

    if (totalChunks === 1) {
      return chunk.content
    }

    return `【文档第 ${currentIndex + 1}/${totalChunks} 部分】

${chunk.content}

---

请继续解读以上内容。如果这是开头部分，请说明"上文是文档的开头"；如果是中间部分，请说明"上文是文档的中间部分"；如果是结尾部分，请说明"上文是文档的结尾"。`
  }

  async processRequest(req: ModelRequest): Promise<ModelResponse> {
    return this.generate(req as ChunkedRequest)
  }
}
