import type { MultiModelEntry } from '../../types/config'
import type { ModelRequest, ModelResponse } from '../../types/llm'
import type { LLMClient } from './LLMClient'
import { ModelClientFactory } from './ModelClientFactory'
import { logger } from '../logger/LoggerService'

export interface FallbackEvent {
  timestamp: number
  fromModel: string
  toModel: string
  reason: string
  success: boolean
}

export interface FallbackNotification {
  id: string
  message: string
  type: 'warning' | 'info' | 'error' | 'success'
  timestamp: number
}

type FallbackListener = (notification: FallbackNotification) => void

class FallbackStrategyService {
  private listeners: Set<FallbackListener> = new Set()
  private events: FallbackEvent[] = []
  private notifications: FallbackNotification[] = []
  private maxNotifications = 20

  /**
   * Execute a request with automatic fallback across enabled models.
   * Models are tried in priority order. If the primary model fails,
   * the next enabled model is tried automatically.
   */
  async executeWithFallback(
    models: MultiModelEntry[],
    request: Omit<ModelRequest, 'endpoint' | 'modelName' | 'apiKey' | 'endpointMode' | 'timeoutMs'>,
    chunkConfig?: { enabled: boolean; maxChunkSize?: number; maxChunks?: number; overlapPages?: number }
  ): Promise<{ response: ModelResponse; usedModel: MultiModelEntry }> {
    const enabledModels = models
      .filter(m => m.enabled)
      .sort((a, b) => a.priority - b.priority)

    if (enabledModels.length === 0) {
      throw new Error('没有可用的模型配置。请先在模型管理中添加并启用至少一个模型。')
    }

    let lastError: Error | null = null

    for (let i = 0; i < enabledModels.length; i++) {
      const model = enabledModels[i]
      const isFirstAttempt = i === 0

      logger.info(`尝试模型 [${model.name}] (${model.config.modelName}) - ${isFirstAttempt ? '主模型' : `降级候选 #${i}`}`)

      try {
        const client: LLMClient = ModelClientFactory.createClient(
          model.config.providerType,
          chunkConfig?.enabled ? { enabled: true, maxChunkSize: chunkConfig.maxChunkSize ?? 8000, maxChunks: chunkConfig.maxChunks ?? 20, overlapPages: chunkConfig.overlapPages ?? 1 } : undefined
        )

        const fullRequest: ModelRequest = {
          ...request,
          endpoint: model.config.endpoint,
          endpointMode: model.config.endpointMode,
          modelName: model.config.modelName,
          apiKey: model.config.apiKey ?? '',
          timeoutMs: model.config.timeoutMs,
          providerType: model.config.providerType,
        }

        const response = await client.generate(fullRequest)

        if (!isFirstAttempt) {
          const event: FallbackEvent = {
            timestamp: Date.now(),
            fromModel: enabledModels[0].name,
            toModel: model.name,
            reason: lastError?.message ?? '未知原因',
            success: true,
          }
          this.events.push(event)
          this.addNotification({
            message: `降级成功: 从 "${enabledModels[0].name}" 降级到 "${model.name}"`,
            type: 'warning',
          })
        }

        return { response, usedModel: model }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        logger.error(`模型 [${model.name}] 调用失败: ${lastError.message}`)

        if (i < enabledModels.length - 1) {
          const event: FallbackEvent = {
            timestamp: Date.now(),
            fromModel: model.name,
            toModel: enabledModels[i + 1].name,
            reason: lastError.message,
            success: false,
          }
          this.events.push(event)
          logger.info(`准备降级到下一个模型: ${enabledModels[i + 1].name}`)
        }
      }
    }

    this.addNotification({
      message: `所有模型均调用失败: ${lastError?.message ?? '未知错误'}`,
      type: 'error',
    })

    throw lastError ?? new Error('所有模型均调用失败')
  }

  getEvents(): FallbackEvent[] {
    return [...this.events]
  }

  getNotifications(): FallbackNotification[] {
    return [...this.notifications]
  }

  clearNotifications(): void {
    this.notifications = []
  }

  dismissNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id)
  }

  addListener(listener: FallbackListener): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private addNotification(pick: { message: string; type: FallbackNotification['type'] }): void {
    const notification: FallbackNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      message: pick.message,
      type: pick.type,
      timestamp: Date.now(),
    }
    this.notifications.unshift(notification)
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications)
    }
    logger.info(`[降级通知] ${notification.message}`)
    this.listeners.forEach(listener => {
      try { listener(notification) } catch { /* ignore */ }
    })
  }
}

export const fallbackStrategyService = new FallbackStrategyService()
