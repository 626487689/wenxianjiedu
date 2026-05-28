import { logger } from '../logger/LoggerService'

export interface ChunkOptions {
  maxChunkSize?: number
  maxChunks?: number
  overlapPages?: number
}

export interface TextChunk {
  id: string
  content: string
  index: number
  total: number
  metadata?: {
    startPage?: number
    endPage?: number
    charCount: number
  }
}

export interface ChunkingResult {
  chunks: TextChunk[]
  totalChars: number
  totalChunks: number
}

export class TextChunkingService {
  private defaultMaxChunkSize = 8000
  private defaultMaxChunks = 20
  private defaultOverlapPages = 1

  chunkText(text: string, options?: ChunkOptions): ChunkingResult {
    const maxChunkSize = options?.maxChunkSize || this.defaultMaxChunkSize
    const maxChunks = options?.maxChunks || this.defaultMaxChunks
    const overlapPages = options?.overlapPages ?? this.defaultOverlapPages

    logger.info(`开始分块处理: 总长度=${text.length}, maxChunkSize=${maxChunkSize}, maxChunks=${maxChunks}`)

    if (!text || text.trim().length === 0) {
      return {
        chunks: [{
          id: this.generateChunkId(),
          content: '',
          index: 0,
          total: 1,
          metadata: { charCount: 0 }
        }],
        totalChars: 0,
        totalChunks: 1
      }
    }

    const chunks: TextChunk[] = []
    let currentIndex = 0
    let chunkIndex = 0

    while (currentIndex < text.length && chunkIndex < maxChunks) {
      let endIndex = Math.min(currentIndex + maxChunkSize, text.length)
      let chunkContent = text.slice(currentIndex, endIndex)

      if (endIndex < text.length && chunkIndex < maxChunks - 1) {
        const paragraphBreak = chunkContent.lastIndexOf('\n\n')
        const sentenceBreak = chunkContent.lastIndexOf('。')
        const pageBreak = chunkContent.lastIndexOf('\f')

        const breakPoints = [
          paragraphBreak,
          sentenceBreak,
          pageBreak,
        ].filter(point => point > chunkContent.length * 0.5)

        if (breakPoints.length > 0) {
          const bestBreak = Math.max(...breakPoints)
          endIndex = currentIndex + bestBreak + 1
          chunkContent = text.slice(currentIndex, endIndex)
        }
      }

      chunks.push({
        id: this.generateChunkId(),
        content: chunkContent.trim(),
        index: chunkIndex,
        total: maxChunks,
        metadata: {
          charCount: chunkContent.length
        }
      })

      currentIndex = endIndex
      chunkIndex++
    }

    logger.info(`分块完成: 共 ${chunks.length} 个块`)

    return {
      chunks,
      totalChars: text.length,
      totalChunks: chunks.length
    }
  }

  chunkByPages(text: string, pageRanges: Array<{start: number, end: number}>, options?: ChunkOptions): ChunkingResult {
    const maxChunkSize = options?.maxChunkSize || this.defaultMaxChunkSize
    const maxChunks = options?.maxChunks || this.defaultMaxChunks
    const overlapPages = options?.overlapPages ?? this.defaultOverlapPages

    logger.info(`按页分块: ${pageRanges.length} 个范围, maxChunkSize=${maxChunkSize}`)

    const chunks: TextChunk[] = []
    let chunkIndex = 0

    for (let i = 0; i < pageRanges.length && chunkIndex < maxChunks; i++) {
      const range = pageRanges[i]
      const pageText = this.extractPagesFromText(text, range.start, range.end)

      if (pageText.trim().length === 0) continue

      let currentPos = 0
      while (currentPos < pageText.length && chunkIndex < maxChunks) {
        let endPos = Math.min(currentPos + maxChunkSize, pageText.length)
        let chunkContent = pageText.slice(currentPos, endPos)

        if (endPos < pageText.length && chunkIndex < maxChunks - 1) {
          const breakPoint = this.findBestBreakPoint(chunkContent)
          if (breakPoint > 0) {
            endPos = currentPos + breakPoint + 1
            chunkContent = pageText.slice(currentPos, endPos)
          }
        }

        chunks.push({
          id: this.generateChunkId(),
          content: chunkContent.trim(),
          index: chunkIndex,
          total: maxChunks,
          metadata: {
            startPage: range.start,
            endPage: range.end,
            charCount: chunkContent.length
          }
        })

        currentPos = endPos
        chunkIndex++
      }
    }

    for (let i = 0; i < chunks.length; i++) {
      chunks[i].total = chunks.length
    }

    logger.info(`按页分块完成: 共 ${chunks.length} 个块`)

    return {
      chunks,
      totalChars: text.length,
      totalChunks: chunks.length
    }
  }

  private extractPagesFromText(text: string, startPage: number, endPage: number): string {
    const pageMarker = '\f'
    const pages = text.split(pageMarker)

    if (pages.length <= 1) {
      return text
    }

    let result = ''
    for (let i = startPage - 1; i < endPage && i < pages.length; i++) {
      result += pages[i] + '\n\n'
    }

    return result.trim()
  }

  private findBestBreakPoint(text: string): number {
    const breakPoints = [
      text.lastIndexOf('\n\n'),
      text.lastIndexOf('。\n'),
      text.lastIndexOf('。'),
      text.lastIndexOf('\n'),
    ]

    for (const bp of breakPoints) {
      if (bp > text.length * 0.5) {
        return bp
      }
    }

    return -1
  }

  mergeChunkResults(results: string[], options?: {separator?: string}): string {
    const separator = options?.separator || '\n\n---\n\n'

    logger.info(`合并 ${results.length} 个块的结果`)

    const merged = results.filter(r => r && r.trim().length > 0).join(separator)

    logger.info(`合并完成: 总长度=${merged.length}`)

    return merged
  }

  generateChunkId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4)
  }

  shouldChunk(text: string, options?: ChunkOptions): boolean {
    const maxChunkSize = options?.maxChunkSize || this.defaultMaxChunkSize
    const estimatedTokens = this.estimateTokenCount(text)
    const maxTokens = maxChunkSize * 0.75

    return estimatedTokens > maxTokens
  }
}

export const textChunkingService = new TextChunkingService()
