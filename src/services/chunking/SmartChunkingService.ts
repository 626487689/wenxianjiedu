import { TokenCalculator } from './TokenCalculator'

interface Chunk {
  text: string
  startIndex: number
  endIndex: number
  tokenCount: number
  isFirst?: boolean
  isLast?: boolean
}

export class SmartChunkingService {
  private tokenCalculator: TokenCalculator

  constructor() {
    this.tokenCalculator = new TokenCalculator()
  }

  // 根据最大token数进行智能分段
  chunkByMaxTokens(text: string, maxTokens: number, modelName?: string): Chunk[] {
    if (!text) {
      // 返回一个包含空字符串的数组
      return [{ text: '', startIndex: 0, endIndex: 0, tokenCount: 0, isFirst: true, isLast: true }]
    }
    
    // 计算整个文本的token数
    const totalTokens = this.calculateTotalTokens(text)
    
    // 如果文本的token数小于等于maxTokens，直接返回一个分块
    const modelAdjustedMaxTokens = this.getModelAdjustedMaxTokens(modelName, maxTokens)
    const maxChunkTokens = Math.min(modelAdjustedMaxTokens, 1500)
    
    if (totalTokens <= maxChunkTokens) {
      return [{ 
        text: text.trim(), 
        startIndex: 0, 
        endIndex: text.length, 
        tokenCount: totalTokens, 
        isFirst: true, 
        isLast: true 
      }]
    }
    
    const chunks: Chunk[] = []
    let currentIndex = 0
    const textLength = text.length
    
    // 分块重叠大小（token数）
    const overlapTokens = Math.min(100, Math.floor(maxChunkTokens * 0.1))

    while (currentIndex < textLength) {
      // 估算当前位置开始的文本，计算需要的长度
      const remainingText = text.substring(currentIndex)
      const estimatedMaxLength = this.tokenCalculator.calculateMaxTextLength(maxChunkTokens, remainingText)
      
      // 截取估算长度的文本
      let chunkText = remainingText.substring(0, estimatedMaxLength)
      let chunkTokenCount = this.tokenCalculator.calculateTokens(chunkText)
      
      // 调整分段长度，确保不超过maxChunkTokens
      while (chunkTokenCount > maxChunkTokens && chunkText.length > 0) {
        chunkText = chunkText.substring(0, Math.floor(chunkText.length * 0.9))
        chunkTokenCount = this.tokenCalculator.calculateTokens(chunkText)
      }
      
      // 尝试找到最佳边界，保持内容完整性
      chunkText = this.findOptimalBoundary(chunkText)
      
      // 确保chunk不为空
      if (chunkText.trim()) {
        const chunk = {
          text: chunkText.trim(),
          startIndex: currentIndex,
          endIndex: currentIndex + chunkText.length,
          tokenCount: this.tokenCalculator.calculateTokens(chunkText)
        }
        chunks.push(chunk)
        
        // 计算下一个分块的起始位置，考虑重叠
        const overlapLength = this.tokenCalculator.calculateMaxTextLength(overlapTokens, chunkText)
        currentIndex += Math.max(1, chunkText.length - overlapLength)
      } else {
        // 如果chunk为空，向前移动一个字符
        currentIndex++
      }
    }

    // 标记第一个和最后一个分块
    if (chunks.length > 0) {
      chunks[0].isFirst = true
      chunks[chunks.length - 1].isLast = true
    }

    return chunks
  }

  // 计算整个文本的token数
  calculateTotalTokens(text: string): number {
    return this.tokenCalculator.calculateTokens(text)
  }

  // 根据模型名称获取默认的maxTokens值
  getDefaultMaxTokens(modelName: string): number {
    // 常见模型的默认maxTokens值
    const modelMaxTokens: Record<string, number> = {
      'gpt-4o': 128000,
      'gpt-4o-mini': 128000,
      'gpt-4-turbo': 128000,
      'gpt-4': 8192,
      'gpt-3.5-turbo': 16384,
      'claude-3-opus-20240229': 200000,
      'claude-3-sonnet-20240229': 200000,
      'claude-3-haiku-20240307': 200000,
      'gemini-1.5-pro': 1048576,
      'gemini-1.5-flash': 1048576,
      'kimi-2.5': 100000,
      'kimi-2': 100000
    }

    return modelMaxTokens[modelName.toLowerCase()] || 8192
  }

  // 根据模型特性调整分块大小
  getModelAdjustedMaxTokens(modelName?: string, maxTokens?: number): number {
    if (maxTokens && maxTokens > 0) {
      return maxTokens
    }

    if (!modelName) {
      return 8192
    }

    // 根据模型类型调整分块大小
    const lowerModelName = modelName.toLowerCase()
    
    // 大型模型可以处理更大的分块
    if (lowerModelName.includes('gpt-4o') || 
        lowerModelName.includes('gemini-1.5') || 
        lowerModelName.includes('claude-3')) {
      return 4096
    }
    
    // 中型模型
    if (lowerModelName.includes('gpt-4') || 
        lowerModelName.includes('kimi-2.5')) {
      return 2048
    }
    
    // 小型模型
    return 1024
  }

  // 找到最佳边界，保持内容完整性
  private findOptimalBoundary(text: string): string {
    // 尝试找到章节边界
    const sectionBoundaryPatterns = [
      /\n#\s/g, // Markdown一级标题
      /\n##\s/g, // Markdown二级标题
      /\n###\s/g, // Markdown三级标题
      /\n\d+\.\s/g, // 数字编号章节
      /\n[A-Z][a-z]+\s*:/g, // 章节标题
    ]

    for (const pattern of sectionBoundaryPatterns) {
      const matches = Array.from(text.matchAll(pattern))
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1]
        if (lastMatch.index && lastMatch.index > text.length * 0.7) {
          return text.substring(0, lastMatch.index)
        }
      }
    }

    // 尝试找到段落边界
    const lastNewLineIndex = text.lastIndexOf('\n\n')
    if (lastNewLineIndex > 0) {
      return text.substring(0, lastNewLineIndex)
    }

    // 尝试找到句子边界
    const sentenceEndings = ['. ', '! ', '? ', '.\n', '!\n', '?\n']
    let lastSentenceIndex = -1

    for (const ending of sentenceEndings) {
      const index = text.lastIndexOf(ending)
      if (index > lastSentenceIndex && index > text.length * 0.5) {
        lastSentenceIndex = index + ending.length - 1
      }
    }

    if (lastSentenceIndex > 0) {
      return text.substring(0, lastSentenceIndex + 1)
    }

    // 尝试找到单词边界
    const lastSpaceIndex = text.lastIndexOf(' ')
    if (lastSpaceIndex > 0) {
      return text.substring(0, lastSpaceIndex)
    }

    // 如果都找不到，返回原文本
    return text
  }

  // 计算分块数量
  calculateChunkCount(text: string, maxTokens: number, modelName?: string): number {
    const totalTokens = this.calculateTotalTokens(text)
    const modelAdjustedMaxTokens = this.getModelAdjustedMaxTokens(modelName, maxTokens)
    const maxChunkTokens = Math.min(modelAdjustedMaxTokens, 1500)
    return Math.ceil(totalTokens / maxChunkTokens)
  }
}
