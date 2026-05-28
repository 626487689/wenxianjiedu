import type { LLMClient } from '../llm/LLMClient'
import { ModelClientFactory } from '../llm/ModelClientFactory'
import type { ModelConfig } from '../../types/config'
import { normalizeOpenAIEndpoint } from '../../utils/endpoint'
import { globalThrottler } from '../../utils/requestThrottler'

interface PaperDirection {
  mainDirection: string
  subDirections: string[]
  keywords: string[]
  confidence: number
}

export class PaperAnalyzer {
  private modelClientFactory: typeof ModelClientFactory

  constructor() {
    this.modelClientFactory = ModelClientFactory
  }

  async analyzePaperDirection(
    paperText: string,
    modelConfig: ModelConfig,
    apiKey: string
  ): Promise<PaperDirection> {
    // 提取论文的摘要、引言部分
    const extractedParts = this.extractKeyParts(paperText)
    
    // 构建分析提示词
    const prompt = this.buildAnalysisPrompt(extractedParts)
    
    // 创建LLM客户端
    const llmClient = this.modelClientFactory.createClient(modelConfig.providerType)
    
    // 使用节流器限制API调用频率
    await globalThrottler.throttle()
    
    // 调用LLM进行分析
    const response = await llmClient.generate({
      endpoint: normalizeOpenAIEndpoint(modelConfig.endpoint, modelConfig.endpointMode),
      endpointMode: modelConfig.endpointMode,
      modelName: modelConfig.modelName,
      apiKey: apiKey,
      prompt: prompt,
      timeoutMs: modelConfig.timeoutMs,
      temperature: 0.3, // 较低的温度，确保结果更确定
      maxTokens: 1000,
    })
    
    // 解析LLM返回的结果
    return this.parseAnalysisResult(response.content)
  }

  private extractKeyParts(text: string): {
    abstract?: string
    introduction?: string
    keywords?: string
  } {
    const result: {
      abstract?: string
      introduction?: string
      keywords?: string
    } = {}

    // 提取摘要
    const abstractMatch = text.match(/abstract[\s\n:]+([\s\S]*?)(?=\n\s*\n|\n\s*introduction|\n\s*背景|\n\s*引言|$)/i)
    if (abstractMatch) {
      result.abstract = abstractMatch[1].trim()
    }

    // 提取引言
    const introMatch = text.match(/(introduction|背景|引言)[\s\n:]+([\s\S]*?)(?=\n\s*\n|\n\s*methods|\n\s*方法|\n\s*实验|$)/i)
    if (introMatch) {
      result.introduction = introMatch[2].trim()
    }

    // 提取关键词
    const keywordsMatch = text.match(/(keywords|关键词)[\s\n:]+([\s\S]*?)(?=\n\s*\n|\n\s*abstract|$)/i)
    if (keywordsMatch) {
      result.keywords = keywordsMatch[2].trim()
    }

    return result
  }

  private buildAnalysisPrompt(parts: {
    abstract?: string
    introduction?: string
    keywords?: string
  }): string {
    return [
      '请分析以下论文的研究方向，并返回结构化的分析结果：',
      '',
      '### 摘要',
      parts.abstract || '未提供摘要',
      '',
      '### 引言',
      parts.introduction || '未提供引言',
      '',
      '### 关键词',
      parts.keywords || '未提供关键词',
      '',
      '请按照以下格式返回分析结果：',
      '',
      '主要研究方向：[主要方向]',
      '子方向：[子方向1], [子方向2], [子方向3]',
      '核心关键词：[关键词1], [关键词2], [关键词3], [关键词4], [关键词5]',
      '置信度：[0-1之间的数值]',
      '',
      '要求：',
      '1. 主要研究方向要简洁明了，不超过10个字',
      '2. 子方向最多3个，每个不超过8个字',
      '3. 核心关键词最多5个，每个不超过5个字',
      '4. 置信度是你对分析结果的自信程度，范围0-1',
      '5. 只返回结构化结果，不要添加其他说明文字',
    ].join('\n')
  }

  private parseAnalysisResult(content: string): PaperDirection {
    const lines = content.split('\n').map(line => line.trim())
    
    let mainDirection = '未知'
    const subDirections: string[] = []
    const keywords: string[] = []
    let confidence = 0.7

    for (const line of lines) {
      if (line.startsWith('主要研究方向：')) {
        mainDirection = line.replace('主要研究方向：', '').trim()
      } else if (line.startsWith('子方向：')) {
        const subs = line.replace('子方向：', '').split(',').map(s => s.trim())
        subDirections.push(...subs)
      } else if (line.startsWith('核心关键词：')) {
        const keys = line.replace('核心关键词：', '').split(',').map(k => k.trim())
        keywords.push(...keys)
      } else if (line.startsWith('置信度：')) {
        const conf = parseFloat(line.replace('置信度：', '').trim())
        if (!isNaN(conf)) {
          confidence = conf
        }
      }
    }

    return {
      mainDirection,
      subDirections: subDirections.slice(0, 3), // 最多3个
      keywords: keywords.slice(0, 5), // 最多5个
      confidence,
    }
  }

  // 获取常见的研究方向分类
  getCommonResearchDirections(): string[] {
    return [
      '机器学习',
      '自然语言处理',
      '计算机视觉',
      '人工智能',
      '数据挖掘',
      '信息检索',
      '推荐系统',
      '网络安全',
      '云计算',
      '物联网',
      '区块链',
      '大数据',
      '边缘计算',
      '量子计算',
      '人机交互',
    ]
  }
}
