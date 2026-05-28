export class TokenCalculator {
  // 简单的token计算实现，基于字符数和单词数的启发式方法
  // 对于英文，通常1个token约等于4个字符或0.75个单词
  // 对于中文，通常1个token约等于2个字符
  calculateTokens(text: string): number {
    if (!text) return 0

    // 计算字符数
    const charCount = text.length
    
    // 计算单词数（英文）
    const wordCount = text.split(/\s+/).filter(Boolean).length
    
    // 计算中文字符数
    const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    
    // 计算英文和其他字符数
    const nonChineseCharCount = charCount - chineseCharCount
    
    // 中文按2个字符1个token计算
    const chineseTokens = Math.ceil(chineseCharCount / 2)
    
    // 英文按4个字符1个token计算，或者按单词数计算，取较大值
    const englishTokensByChar = Math.ceil(nonChineseCharCount / 4)
    const englishTokensByWord = Math.ceil(wordCount * 0.75)
    const englishTokens = Math.max(englishTokensByChar, englishTokensByWord)
    
    return chineseTokens + englishTokens
  }

  // 根据模型的max_tokens限制，计算文本的最大长度
  calculateMaxTextLength(maxTokens: number, textSample: string): number {
    if (!textSample) return maxTokens * 4 // 默认按英文计算
    
    const sampleTokens = this.calculateTokens(textSample)
    if (sampleTokens === 0) return maxTokens * 4
    
    const charsPerToken = textSample.length / sampleTokens
    return Math.floor(maxTokens * charsPerToken)
  }
}
