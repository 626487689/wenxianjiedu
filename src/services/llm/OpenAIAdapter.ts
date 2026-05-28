import type { ModelRequest, ModelResponse } from '../../types/llm'
import type { ModelAdapter, ModelInfo, ModelCapabilities, ModelLimitations, ModelParameters } from './ModelAdapter'
import { normalizeOpenAIEndpoint } from '../../utils/endpoint'
import { logger } from '../logger/LoggerService'

/**
 * OpenAI兼容模型适配器
 */
export class OpenAIAdapter implements ModelAdapter {
  private endpoint: string
  private modelName: string

  constructor(endpoint: string, modelName: string) {
    this.endpoint = normalizeOpenAIEndpoint(endpoint)
    this.modelName = modelName
  }

  /**
   * 生成文本
   */
  async generate(request: ModelRequest): Promise<ModelResponse> {
    // 这里可以使用现有的OpenAICompatibleClient来实现
    // 或者直接实现HTTP请求
    throw new Error('Not implemented')
  }

  /**
   * 获取模型信息
   */
  async getModelInfo(): Promise<ModelInfo> {
    try {
      // 尝试从OpenAI API获取模型信息
      const response = await fetch(`${this.endpoint}/models/${this.modelName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        // 如果API调用失败，返回默认信息
        return this.getDefaultModelInfo()
      }

      const data = await response.json()
      return {
        name: data.id || this.modelName,
        provider: 'openai_compatible',
        version: data.version,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: this.supportsVision(),
          audio: false,
          maxTokens: data.max_tokens || 4096,
          contextWindow: data.context_window || 4096,
        },
        limitations: {
          rateLimit: {
            requestsPerMinute: 60,
            tokensPerMinute: 150000,
          },
          maxOutputTokens: data.max_output_tokens || 2048,
          maxInputTokens: data.max_input_tokens || 4096,
          supportedFormats: ['text', 'json'],
        },
        supportedParameters: ['temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty', 'stop'],
      }
    } catch (error) {
      logger.error('获取模型信息失败', { 
        category: 'model',
        metadata: { error: error, model: this.modelName }
      })
      return this.getDefaultModelInfo()
    }
  }

  /**
   * 检查模型是否可用
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      return response.ok
    } catch (error) {
      logger.error('检查模型可用性失败', { 
        category: 'model',
        metadata: { error: error, model: this.modelName }
      })
      return false
    }
  }

  /**
   * 获取模型支持的参数
   */
  getSupportedParameters(): ModelParameters {
    return {
      temperature: {
        min: 0,
        max: 2,
        default: 0.7,
      },
      maxTokens: {
        min: 1,
        max: 4096,
        default: 1024,
      },
      topP: {
        min: 0,
        max: 1,
        default: 1,
      },
      frequencyPenalty: {
        min: -2,
        max: 2,
        default: 0,
      },
      presencePenalty: {
        min: -2,
        max: 2,
        default: 0,
      },
      stop: {
        max: 4,
        default: [],
      },
    }
  }

  /**
   * 优化模型参数
   */
  optimizeParameters(request: ModelRequest): ModelRequest {
    const params = this.getSupportedParameters()
    
    return {
      ...request,
      temperature: this.clampValue(request.temperature || params.temperature.default, params.temperature.min, params.temperature.max),
      maxTokens: this.clampValue(request.maxTokens || params.maxTokens.default, params.maxTokens.min, params.maxTokens.max),
      // 可以添加更多参数的优化
    }
  }

  /**
   * 获取默认模型信息
   */
  private getDefaultModelInfo(): ModelInfo {
    return {
      name: this.modelName,
      provider: 'openai_compatible',
      capabilities: {
        streaming: true,
        functionCalling: true,
        vision: this.supportsVision(),
        audio: false,
        maxTokens: 4096,
        contextWindow: 4096,
      },
      limitations: {
        rateLimit: {
          requestsPerMinute: 60,
          tokensPerMinute: 150000,
        },
        maxOutputTokens: 2048,
        maxInputTokens: 4096,
        supportedFormats: ['text', 'json'],
      },
      supportedParameters: ['temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty', 'stop'],
    }
  }

  /**
   * 检查模型是否支持视觉
   */
  private supportsVision(): boolean {
    const visionModels = ['gpt-4-vision-preview', 'gpt-4-1106-vision-preview']
    return visionModels.includes(this.modelName.toLowerCase())
  }

  /**
   * 限制值在指定范围内
   */
  private clampValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }
}
