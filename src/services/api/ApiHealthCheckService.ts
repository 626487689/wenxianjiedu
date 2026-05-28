import { logger } from '../logger/LoggerService'
import { normalizeOpenAIEndpoint } from '../../utils/endpoint'
import type { EndpointMode } from '../../types/config'

interface HealthCheckResult {
  endpoint: string
  healthy: boolean
  statusCode?: number
  message?: string
  responseTime?: number
}

export class ApiHealthCheckService {
  private cache: Map<string, { result: HealthCheckResult; timestamp: number }> = new Map()
  private cacheTTL = 5 * 60 * 1000

  async checkHealth(endpoint: string, endpointMode?: EndpointMode, apiKey?: string, modelName?: string): Promise<HealthCheckResult> {
    const normalizedEndpoint = normalizeOpenAIEndpoint(endpoint, endpointMode ?? 'auto')
    
    const cacheKey = apiKey ? `${normalizedEndpoint}_${apiKey.length}` : normalizedEndpoint
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      logger.info(`使用缓存的健康检查结果: ${normalizedEndpoint}`)
      return cached.result
    }

    logger.info(`开始健康检查: ${normalizedEndpoint}`)
    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }
      
      const testModelName = modelName || 'gpt-3.5-turbo'
      const response = await fetch(normalizedEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: testModelName,
          messages: [{
            role: 'user',
            content: 'ping',
          }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      const endTime = Date.now()
      const responseTime = endTime - startTime

      const result: HealthCheckResult = {
        endpoint: normalizedEndpoint,
        healthy: response.ok,
        statusCode: response.status,
        responseTime,
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        result.message = text
        logger.warn(`健康检查失败: ${normalizedEndpoint} - ${response.status} ${text}`)
        
        if (response.status === 400 && text.includes('Not supported model')) {
          logger.warn(`模型 ${testModelName} 不被支持，但API端点和认证正常，尝试跳过模型验证`)
          result.healthy = true
          result.message = `模型 ${testModelName} 不被支持，但API端点和认证正常`
        }
      } else {
        logger.info(`健康检查成功: ${normalizedEndpoint} (${responseTime}ms)`)
      }

      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      })

      return result
    } catch (error) {
      const endTime = Date.now()
      const responseTime = endTime - startTime

      const result: HealthCheckResult = {
        endpoint: normalizedEndpoint,
        healthy: false,
        message: error instanceof Error ? error.message : '未知错误',
        responseTime,
      }

      logger.error(`健康检查错误: ${normalizedEndpoint} - ${result.message}`)

      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      })

      return result
    }
  }

  clearCache(): void {
    this.cache.clear()
    logger.info('API健康检查缓存已清除')
  }

  async checkMultipleHealth(endpoints: Array<{ endpoint: string; endpointMode?: EndpointMode }>): Promise<HealthCheckResult[]> {
    const promises = endpoints.map(({ endpoint, endpointMode }) => 
      this.checkHealth(endpoint, endpointMode)
    )
    return Promise.all(promises)
  }
}

export const apiHealthCheckService = new ApiHealthCheckService()
