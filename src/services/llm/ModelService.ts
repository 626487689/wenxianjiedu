import type { ModelConfig } from '../../types/config'
import type { ModelRequest, ModelResponse } from '../../types/llm'
import type { ModelAdapter, ModelInfo } from './ModelAdapter'
import { OpenAIAdapter } from './OpenAIAdapter'
import { logger } from '../logger/LoggerService'

/**
 * 模型服务
 */
export class ModelService {
  private adapters: Map<string, ModelAdapter> = new Map()
  private modelInfos: Map<string, ModelInfo> = new Map()

  /**
   * 获取模型适配器
   */
  getAdapter(modelConfig: ModelConfig): ModelAdapter {
    const key = this.generateAdapterKey(modelConfig)
    if (!this.adapters.has(key)) {
      const adapter = this.createAdapter(modelConfig)
      this.adapters.set(key, adapter)
    }
    return this.adapters.get(key)!
  }

  /**
   * 创建模型适配器
   */
  private createAdapter(modelConfig: ModelConfig): ModelAdapter {
    switch (modelConfig.providerType) {
      case 'openai_compatible':
      case 'anthropic':
      case 'google':
      case 'local':
        return new OpenAIAdapter(modelConfig.endpoint, modelConfig.modelName)
      default:
        throw new Error(`Unsupported model provider: ${modelConfig.providerType}`)
    }
  }

  /**
   * 生成适配器键
   */
  private generateAdapterKey(modelConfig: ModelConfig): string {
    return `${modelConfig.providerType}:${modelConfig.endpoint}:${modelConfig.modelName}`
  }

  /**
   * 获取模型信息
   */
  async getModelInfo(modelConfig: ModelConfig): Promise<ModelInfo> {
    const key = this.generateAdapterKey(modelConfig)
    if (!this.modelInfos.has(key)) {
      const adapter = this.getAdapter(modelConfig)
      const info = await adapter.getModelInfo()
      this.modelInfos.set(key, info)
    }
    return this.modelInfos.get(key)!
  }

  /**
   * 检查模型是否可用
   */
  async checkModelAvailability(modelConfig: ModelConfig): Promise<boolean> {
    try {
      const adapter = this.getAdapter(modelConfig)
      return await adapter.checkAvailability()
    } catch (error) {
      logger.error('检查模型可用性失败', { 
        category: 'model',
        metadata: { error: error, model: modelConfig.modelName }
      })
      return false
    }
  }

  /**
   * 优化模型参数
   */
  optimizeModelParameters(request: ModelRequest, modelConfig: ModelConfig): ModelRequest {
    const adapter = this.getAdapter(modelConfig)
    return adapter.optimizeParameters(request)
  }

  /**
   * 清理模型适配器
   */
  clearAdapters(): void {
    this.adapters.clear()
    this.modelInfos.clear()
    logger.info('模型适配器已清理', { category: 'model' })
  }

  /**
   * 获取所有模型信息
   */
  getModelInfos(): Map<string, ModelInfo> {
    return this.modelInfos
  }

  /**
   * 预加载模型信息
   */
  async preloadModelInfo(modelConfig: ModelConfig): Promise<void> {
    try {
      await this.getModelInfo(modelConfig)
      logger.info(`模型信息已预加载: ${modelConfig.modelName}`, { category: 'model' })
    } catch (error) {
      logger.error('预加载模型信息失败', { 
        category: 'model',
        metadata: { error: error, model: modelConfig.modelName }
      })
    }
  }
}

// 创建单例实例
export const modelService = new ModelService()
