import type { ModelRequest, ModelResponse } from '../../types/llm'

/**
 * 模型适配器接口
 */
export interface ModelAdapter {
  /**
   * 生成文本
   */
  generate(request: ModelRequest): Promise<ModelResponse>

  /**
   * 获取模型信息
   */
  getModelInfo(): Promise<ModelInfo>

  /**
   * 检查模型是否可用
   */
  checkAvailability(): Promise<boolean>

  /**
   * 获取模型支持的参数
   */
  getSupportedParameters(): ModelParameters

  /**
   * 优化模型参数
   */
  optimizeParameters(request: ModelRequest): ModelRequest
}

/**
 * 模型信息
 */
export interface ModelInfo {
  name: string
  provider: string
  version?: string
  capabilities: ModelCapabilities
  limitations: ModelLimitations
  supportedParameters: string[]
}

/**
 * 模型能力
 */
export interface ModelCapabilities {
  streaming: boolean
  functionCalling: boolean
  vision: boolean
  audio: boolean
  maxTokens: number
  contextWindow: number
}

/**
 * 模型限制
 */
export interface ModelLimitations {
  rateLimit: {
    requestsPerMinute: number
    tokensPerMinute: number
  }
  maxOutputTokens: number
  maxInputTokens: number
  supportedFormats: string[]
}

/**
 * 模型参数
 */
export interface ModelParameters {
  temperature: {
    min: number
    max: number
    default: number
  }
  maxTokens: {
    min: number
    max: number
    default: number
  }
  topP: {
    min: number
    max: number
    default: number
  }
  frequencyPenalty: {
    min: number
    max: number
    default: number
  }
  presencePenalty: {
    min: number
    max: number
    default: number
  }
  stop: {
    max: number
    default: string[]
  }
}
