import type { LLMClient } from './LLMClient'
import type { ModelRequest, ModelResponse } from '../../types/llm'
import { normalizeOpenAIEndpoint } from '../../utils/endpoint'
import { logger } from '../logger/LoggerService'
import { apiHealthCheckService } from '../api/ApiHealthCheckService'
import { modelCacheService } from './ModelCacheService'

interface QueuedRequest {
  id: string
  request: ModelRequest
  resolve: (response: ModelResponse) => void
  reject: (error: Error) => void
  priority: number
  timestamp: number
}

class RequestQueue {
  private queue: QueuedRequest[] = []
  private processing: boolean = false
  private maxConcurrentRequests: number = 2
  private processingCount: number = 0
  private requestProcessor: ((request: ModelRequest) => Promise<ModelResponse>) | null = null

  constructor(maxConcurrentRequests: number = 2) {
    this.maxConcurrentRequests = maxConcurrentRequests
  }

  setRequestProcessor(processor: (request: ModelRequest) => Promise<ModelResponse>): void {
    this.requestProcessor = processor
  }

  add(request: ModelRequest, priority: number = 0): Promise<ModelResponse> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        request,
        resolve,
        reject,
        priority,
        timestamp: Date.now()
      }

      this.queue.push(queuedRequest)
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority
        }
        return a.timestamp - b.timestamp
      })

      logger.info(`请求已加入队列，当前队列长度: ${this.queue.length}`)
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.processingCount >= this.maxConcurrentRequests || this.queue.length === 0 || !this.requestProcessor) {
      return
    }

    this.processing = true

    while (this.processingCount < this.maxConcurrentRequests && this.queue.length > 0) {
      const queuedRequest = this.queue.shift()
      if (!queuedRequest) break

      this.processingCount++
      logger.info(`开始处理请求 ${queuedRequest.id}，当前并发数: ${this.processingCount}`)

      try {
        const response = await this.requestProcessor(queuedRequest.request)
        queuedRequest.resolve(response)
        logger.info(`请求 ${queuedRequest.id} 处理成功`)
      } catch (error) {
        queuedRequest.reject(error as Error)
        logger.error(`请求 ${queuedRequest.id} 处理失败: ${error}`)
      } finally {
        this.processingCount--
        logger.info(`请求 ${queuedRequest.id} 处理完成，当前并发数: ${this.processingCount}`)
      }
    }

    this.processing = false
  }

  remove(requestId: string): void {
    const index = this.queue.findIndex(req => req.id === requestId)
    if (index !== -1) {
      this.queue.splice(index, 1)
      logger.info(`请求 ${requestId} 已从队列中移除，当前队列长度: ${this.queue.length}`)
    }
  }

  clear(): void {
    this.queue = []
    logger.info('请求队列已清空')
  }

  getQueueLength(): number {
    return this.queue.length
  }

  getProcessingCount(): number {
    return this.processingCount
  }

  setMaxConcurrentRequests(max: number): void {
    this.maxConcurrentRequests = max
    logger.info(`最大并发请求数已设置为: ${max}`)
    this.processQueue()
  }
}

class NetworkMonitor {
  private listeners: Set<(online: boolean) => void> = new Set()
  private online: boolean = navigator.onLine

  constructor() {
    this.setupEventListeners()
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.online = true
      this.notifyListeners(true)
    })

    window.addEventListener('offline', () => {
      this.online = false
      this.notifyListeners(false)
    })
  }

  isOnline(): boolean {
    return this.online
  }

  addListener(listener: (online: boolean) => void): void {
    this.listeners.add(listener)
    listener(this.online)
  }

  removeListener(listener: (online: boolean) => void): void {
    this.listeners.delete(listener)
  }

  private notifyListeners(online: boolean): void {
    logger.info(`网络状态变更: ${online ? '在线' : '离线'}`)
    this.listeners.forEach(listener => {
      try {
        listener(online)
      } catch (error) {
        logger.error(`网络状态监听器执行失败: ${error}`)
      }
    })
  }
}

const networkMonitor = new NetworkMonitor()

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[^\x00-\xFF]/g, '')
}

export class OpenAICompatibleClient implements LLMClient {
  private requestQueue: RequestQueue

  constructor() {
    this.requestQueue = new RequestQueue()
    this.requestQueue.setRequestProcessor((request) => this.processRequest(request))
  }

  private async checkNetworkConnection(): Promise<void> {
    if (!networkMonitor.isOnline()) {
      logger.error('网络连接不可用')
      throw new Error('网络连接不可用，请检查您的网络连接后重试。')
    }

    const checkUrls = [
      'https://www.google.com/generate_204',
      'https://www.baidu.com',
      'https://www.microsoft.com',
    ]

    let lastError: Error | null = null
    for (const url of checkUrls) {
      try {
        await fetch(url, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        })
        logger.info(`网络连接检查通过: ${url}`)
        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        logger.warn(`网络连接检查失败 (${url}): ${lastError.message}`)
      }
    }

    logger.warn('所有网络检查点都失败，但可能只是特定站点不可达，继续尝试连接目标API')
  }

  async generate(req: ModelRequest): Promise<ModelResponse> {
    const cachedResponse = modelCacheService.get(req)
    if (cachedResponse) {
      logger.info('从缓存中获取模型结果')
      return cachedResponse
    }

    const response = await this.requestQueue.add(req, 0)

    modelCacheService.set(req, response)
    return response
  }

  async processRequest(req: ModelRequest): Promise<ModelResponse> {
    const maxRetries = 3
    let retryDelayMs = 2000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController()
      const abortTimeout = setTimeout(() => controller.abort('timeout'), req.timeoutMs)
      let endpoint: string
      if (req.providerType === 'anthropic') {
        const base = req.endpoint.replace(/\/+$/, '')
        if (base.endsWith('/v1/messages') || base.endsWith('/messages')) {
          endpoint = base
        } else if (/\/v\d+$/i.test(base)) {
          endpoint = `${base}/messages`
        } else {
          endpoint = `${base}/v1/messages`
        }
      } else {
        endpoint = normalizeOpenAIEndpoint(req.endpoint, req.endpointMode ?? 'auto')
      }
      const signal = composeAbortSignal(controller, req.signal)

      try {
        await this.checkNetworkConnection()

        const healthResult = await apiHealthCheckService.checkHealth(req.endpoint, req.endpointMode, req.apiKey, req.modelName)
        if (!healthResult.healthy) {
          logger.error(`API健康检查失败: ${healthResult.message}`)
          throw new Error(`API端点不可用: ${healthResult.message || '请检查API端点配置'}`)
        }

        logger.info(`开始调用模型 (尝试 ${attempt}/${maxRetries}): ${req.modelName} at ${endpoint}`)
        logger.info(`提示词长度: ${req.prompt.length} 字符`)
        logger.info(`超时设置: ${req.timeoutMs}ms`)

        const startTime = Date.now()
        
        const sanitizedApiKey = sanitizeHeaderValue(req.apiKey)
        
        // Build auth headers based on provider type
        const authHeaders: Record<string, string> = {}
        switch (req.providerType) {
          case 'anthropic':
            authHeaders['x-api-key'] = sanitizedApiKey
            authHeaders['anthropic-version'] = '2023-06-01'
            break
          case 'google':
            authHeaders['x-goog-api-key'] = sanitizedApiKey
            break
          case 'local':
            break
          default:
            authHeaders['Authorization'] = `Bearer ${sanitizedApiKey}`
        }

        const providerType = req.providerType ?? 'openai_compatible'
        let requestBody: Record<string, any>
        if (providerType === 'anthropic') {
          requestBody = {
            model: req.modelName,
            messages: [{ role: 'user', content: req.prompt }],
            max_tokens: this.getOptimizedMaxTokens(req) ?? 1024,
            temperature: this.getOptimizedTemperature(req),
            stream: true,
          }
        } else {
          requestBody = {
            model: req.modelName,
            messages: [{ role: 'user', content: req.prompt }],
            temperature: this.getOptimizedTemperature(req),
            max_tokens: this.getOptimizedMaxTokens(req),
            stream: true,
            ...this.getModelSpecificParams(req.modelName),
          }
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify(requestBody),
          signal,
        })
        const endTime = Date.now()
        logger.info(`模型响应时间: ${endTime - startTime}ms`)
        logger.info(`HTTP 状态码: ${response.status}`)

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          logger.error(`HTTP 错误: ${response.status} - ${text}`)

          if (response.status === 401 || response.status === 403 || response.status === 404) {
            throw new Error(`HTTP_${response.status}${text ? `: ${text}` : ''}`)
          }

          if (attempt < maxRetries) {
            retryDelayMs = Math.min(retryDelayMs * 2, 10000)
            logger.info(`尝试 ${attempt} 失败，${retryDelayMs}ms 后重试...`)
            await this.delay(retryDelayMs)
            continue
          }

          throw new Error(`HTTP_${response.status}${text ? `: ${text}` : ''}`)
        }

        const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''

        if (looksLikeHtml(contentType, '')) {
          logger.error('Endpoint 返回的是 HTML 页面，不是 OpenAI 兼容 JSON')
          throw new Error('Endpoint 返回的是 HTML 页面，不是 OpenAI 兼容 JSON。请检查是否填写了正确的接口地址，通常应为 /v1/chat/completions。')
        }

        if (contentType.includes('text/event-stream') || contentType.includes('stream')) {
          logger.info('开始处理流式响应')
          const parsed = await this.handleStreamingResponse(response, signal, req.onProgress)
          if (!parsed.content) {
            logger.error('模型返回格式不兼容：未找到可用文本内容')
            throw new Error('模型返回格式不兼容：未找到可用文本内容。')
          }
          logger.info(`模型调用成功，返回内容长度: ${parsed.content.length} 字符`)
          return parsed
        } else {
          logger.info('处理非流式响应')
          const rawText = await response.text()
          const parsed = parseModelResponse(rawText)
          if (!parsed.content) {
            logger.error('模型返回格式不兼容：未找到可用文本内容')
            throw new Error('模型返回格式不兼容：未找到可用文本内容。')
          }
          logger.info(`模型调用成功，返回内容长度: ${parsed.content.length} 字符`)
          if (req.onProgress) {
            req.onProgress({ text: parsed.content, done: true })
          }
          return parsed
        }
      } catch (error) {
        if (req.signal?.aborted) {
          logger.info('任务已取消')
          throw new Error('任务已取消')
        }

        if (isAbortLikeError(error)) {
          logger.error(`请求超时，已在 ${req.timeoutMs}ms 后取消`)

          if (attempt < maxRetries) {
            retryDelayMs = Math.min(retryDelayMs * 2, 10000)
            logger.info(`尝试 ${attempt} 超时，${retryDelayMs}ms 后重试...`)
            await this.delay(retryDelayMs)
            continue
          }

          throw new Error(`请求超时，已在 ${req.timeoutMs}ms 后取消。请增大 Timeout (ms)，或缩短输入内容。`)
        }

        if (error instanceof Error && (error.message.includes('NetworkError') || error.message.includes('fetch failed'))) {
          if (attempt < maxRetries) {
            retryDelayMs = Math.min(retryDelayMs * 2, 10000)
            logger.error(`网络错误: ${error.message}`)
            logger.info(`尝试 ${attempt} 失败，${retryDelayMs}ms 后重试...`)
            await this.delay(retryDelayMs)
            continue
          }
        }

        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`模型调用失败: ${errorMessage}`)
        throw error
      } finally {
        clearTimeout(abortTimeout)
      }
    }

    throw new Error('重试次数已耗尽')
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private getOptimizedTemperature(req: ModelRequest): number {
    if (typeof req.temperature === 'number') {
      return req.temperature
    }

    const modelName = req.modelName.toLowerCase()

    if (modelName.includes('gpt-4')) {
      return 0.7
    } else if (modelName.includes('gpt-3.5')) {
      return 0.8
    } else if (modelName.includes('claude')) {
      return 0.6
    } else if (modelName.includes('kimi')) {
      return 0.7
    } else {
      return 0.7
    }
  }

  private getOptimizedMaxTokens(req: ModelRequest): number | undefined {
    if (typeof req.maxTokens === 'number' && req.maxTokens > 0) {
      return req.maxTokens
    }

    const modelName = req.modelName.toLowerCase()

    if (modelName.includes('gpt-4')) {
      return 2048
    } else if (modelName.includes('gpt-3.5')) {
      return 1024
    } else if (modelName.includes('claude')) {
      return 1500
    } else if (modelName.includes('kimi')) {
      return 1500
    } else {
      return 1024
    }
  }

  private getModelSpecificParams(modelName: string): Record<string, any> {
    const params: Record<string, any> = {}
    const lowerModelName = modelName.toLowerCase()

    if (lowerModelName.includes('gpt')) {
      params.top_p = 0.95
    }

    if (lowerModelName.includes('claude')) {
      params.top_p = 0.9
    }

    if (lowerModelName.includes('kimi')) {
      params.top_p = 0.9
    }

    return params
  }

  private async handleStreamingResponse(response: Response, signal: AbortSignal, onProgress?: (progress: { text: string; done: boolean }) => void): Promise<ModelResponse> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    const parts: string[] = []
    let usage: ModelResponse['usage']
    let lastProgressTime = 0
    const progressInterval = 100

    try {
      while (true) {
        if (signal.aborted) {
          throw new Error('任务已取消')
        }

        const { done, value } = await reader.read()
        if (done) {
          break
        }

        if (buffer.length > 100000) {
          logger.warn('流式响应缓冲区过大，可能导致内存问题')
          buffer = buffer.slice(-50000)
        }

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() || ''

        // Parse raw text into lines for SSE processing

        // Detect Anthropic SSE format (uses event: lines)
        const isAnthropicSSE = lines.some((l: string) => l.trim().startsWith('event:'))

        if (isAnthropicSSE) {
          // Anthropic SSE: event type + data lines
          let currentEvent = ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.slice(6).trim()
            } else if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim()
              if (!dataStr || dataStr === '[DONE]') continue
              try {
                const data = JSON.parse(dataStr)
                if (currentEvent === 'content_block_delta' && data.delta?.text) {
                  const piece = data.delta.text
                  parts.push(piece)
                  const now = Date.now()
                  if (onProgress && (now - lastProgressTime > progressInterval)) {
                    onProgress({ text: piece, done: false })
                    lastProgressTime = now
                  }
                } else if (currentEvent === 'message_delta' && data.usage) {
                  usage = data.usage
                } else if (currentEvent === 'message_start' && data.message?.usage) {
                  usage = data.message.usage
                }
              } catch (error) {
                logger.error(`Anthropic SSE chunk解析失败: ${error}`)
              }
            }
          }
        } else {
          // OpenAI SSE format
          for (const line of lines) {
            if (line.trim().startsWith('data:')) {
              const dataStr = line.trim().slice(5).trim()
              if (dataStr === '[DONE]') {
                continue
              }

              try {
                const data = JSON.parse(dataStr)
                const piece = extractAssistantContent(data)
                if (piece) {
                  parts.push(piece)
                  const now = Date.now()
                  if (onProgress && (now - lastProgressTime > progressInterval)) {
                    onProgress({ text: piece, done: false })
                    lastProgressTime = now
                  }
                }

                if (!usage && data?.usage) {
                  usage = data.usage
                }
              } catch (error) {
                logger.error(`SSE chunk解析失败: ${error}`)
                continue
              }
            }
          }
        }
      }

      if (buffer.trim()) {
        const lines = buffer.split(/\r?\n/)
        for (const line of lines) {
          if (line.trim().startsWith('data:')) {
            const dataStr = line.trim().slice(5).trim()
            if (dataStr === '[DONE]') {
              continue
            }

            try {
              const data = JSON.parse(dataStr)
              const piece = extractAssistantContent(data)
              if (piece) {
                parts.push(piece)
                if (onProgress) {
                  onProgress({ text: piece, done: false })
                }
              }

              if (!usage && data?.usage) {
                usage = data.usage
              }
            } catch (error) {
              logger.error(`SSE chunk解析失败: ${error}`)
            }
          }
        }
      }

      const content = parts.join('')
      logger.info(`流式响应处理完成，总内容长度: ${content.length}`)

      if (onProgress) {
        onProgress({ text: '', done: true })
      }

      return {
        content,
        usage,
      }
    } catch (error) {
      logger.error(`流式响应处理失败: ${error}`)
      throw error
    } finally {
      try {
        reader.releaseLock()
      } catch (error) {
        logger.warn(`释放reader锁失败: ${error}`)
      }
    }
  }
}

function composeAbortSignal(controller: AbortController, externalSignal?: AbortSignal): AbortSignal {
  if (!externalSignal) {
    return controller.signal
  }

  if (externalSignal.aborted) {
    controller.abort(externalSignal.reason)
    return controller.signal
  }

  const forwardAbort = () => controller.abort(externalSignal.reason)
  externalSignal.addEventListener('abort', forwardAbort, { once: true })

  controller.signal.addEventListener(
    'abort',
    () => externalSignal.removeEventListener('abort', forwardAbort),
    { once: true },
  )

  return controller.signal
}

function parseModelResponse(rawText: string): ModelResponse {
  let data: any

  try {
    data = JSON.parse(rawText)
    logger.info(`模型返回的JSON数据: ${JSON.stringify(data, null, 2)}`)
  } catch (error) {
    logger.info(`JSON解析失败，尝试处理SSE格式: ${error}`)
    logger.info(`原始响应内容: ${rawText.substring(0, 1000)}...`)
    if (!looksLikeSse(rawText)) {
      throw new Error('Endpoint 返回的不是有效 JSON。请检查接口地址是否为 OpenAI 兼容的 chat completions 接口。')
    }

    const chunks = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter((line) => line && line !== '[DONE]')

    logger.info(`解析到的SSE chunks数量: ${chunks.length}`)

    const parts: string[] = []
    let usage: ModelResponse['usage']

    for (const chunk of chunks) {
      logger.info(`处理SSE chunk: ${chunk.substring(0, 500)}...`)
      let data: any
      try {
        data = JSON.parse(chunk)
        logger.info(`SSE chunk解析成功: ${JSON.stringify(data, null, 2)}`)
      } catch (error) {
        logger.error(`SSE chunk解析失败: ${error}`)
        continue
      }

      const piece = extractAssistantContent(data)
      logger.info(`从SSE chunk提取的内容: ${piece.substring(0, 200)}...`)
      if (piece) {
        parts.push(piece)
      }

      if (!usage && data?.usage) {
        usage = data.usage
        logger.info(`提取到usage信息: ${JSON.stringify(usage)}`)
      }
    }

    logger.info(`SSE处理完成，总内容长度: ${parts.join('').length}`)
    return {
      content: parts.join(''),
      usage,
    }
  }

  if (data?.error?.message && typeof data.error.message === 'string') {
    logger.error(`模型返回错误: ${data.error.message}`)
    throw new Error(data.error.message)
  }

  const content = extractAssistantContent(data)
  logger.info(`从JSON提取的内容: ${content.substring(0, 200)}...`)
  logger.info(`提取到usage信息: ${JSON.stringify(data?.usage)}`)

  return {
    content: content,
    usage: data?.usage,
  }
}

function extractAssistantContent(data: any): string {
  logger.info(`开始提取内容，数据结构: ${JSON.stringify(data, null, 2)}`)

  const choice = data?.choices?.[0]
  logger.info(`提取到choice: ${JSON.stringify(choice)}`)

  if (choice) {
    const messageContent = normalizeContent(choice.message?.content)
    logger.info(`从message.content提取到: ${messageContent.substring(0, 200)}...`)
    if (messageContent) return messageContent

    const reasoningContent = normalizeContent(choice.message?.reasoning)
    logger.info(`从message.reasoning提取到: ${reasoningContent.substring(0, 200)}...`)
    if (reasoningContent) return reasoningContent

    const deltaContent = normalizeContent(choice.delta?.content)
    logger.info(`从delta.content提取到: ${deltaContent.substring(0, 200)}...`)
    if (deltaContent) return deltaContent

    const deltaReasoningContent = normalizeContent(choice.delta?.reasoning_content)
    logger.info(`从delta.reasoning_content提取到: ${deltaReasoningContent.substring(0, 200)}...`)
    if (deltaReasoningContent) return deltaReasoningContent

    const textContent = normalizeContent(choice.text)
    logger.info(`从text提取到: ${textContent.substring(0, 200)}...`)
    if (textContent) return textContent
  }

  const outputText = normalizeContent(data?.output_text)
  logger.info(`从output_text提取到: ${outputText.substring(0, 200)}...`)
  if (outputText) return outputText

  if (Array.isArray(data?.output)) {
    logger.info(`从output数组提取内容`)
    const output = data.output
      .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : [item]))
      .map((item: any) => normalizeContent(item?.text ?? item?.content ?? item))
      .filter(Boolean)
      .join('')

    logger.info(`从output数组提取到: ${output.substring(0, 200)}...`)
    if (output) {
      return output
    }
  }

  const otherFields = [
    'content',
    'result',
    'response',
    'answer',
    'text',
    'message'
  ];

  for (const field of otherFields) {
    const content = normalizeContent(data?.[field]);
    logger.info(`从${field}提取到: ${content.substring(0, 200)}...`);
    if (content) return content;
  }

  logger.info('未找到可用的内容字段')
  return ''
}

function normalizeContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        if (item && typeof item === 'object') {
          const text = (item as { text?: unknown }).text
          if (typeof text === 'string') {
            return text
          }
        }

        return ''
      })
      .join('')
  }

  return ''
}

function looksLikeHtml(contentType: string, text: string): boolean {
  const preview = text.trimStart().slice(0, 200).toLowerCase()
  return contentType.includes('text/html') || preview.startsWith('<!doctype html') || preview.startsWith('<html')
}

function looksLikeSse(text: string): boolean {
  return text.trimStart().startsWith('data:')
}

function isAbortLikeError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError'
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return error.name === 'AbortError' || message.includes('signal is aborted') || message.includes('aborted without reason')
  }

  return false
}
