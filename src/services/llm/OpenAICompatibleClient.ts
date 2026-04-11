import type { LLMClient } from './LLMClient'
import type { ModelRequest, ModelResponse } from '../../types/llm'
import { normalizeOpenAIEndpoint } from '../../utils/endpoint'

export class OpenAICompatibleClient implements LLMClient {
  async generate(req: ModelRequest): Promise<ModelResponse> {
    const controller = new AbortController()
    const abortTimeout = setTimeout(() => controller.abort('timeout'), req.timeoutMs)
    const endpoint = normalizeOpenAIEndpoint(req.endpoint, req.endpointMode ?? 'auto')
    const signal = composeAbortSignal(controller, req.signal)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${req.apiKey}`,
        },
        body: JSON.stringify({
          model: req.modelName,
          messages: [
            {
              role: 'user',
              content: req.prompt,
            },
          ],
          temperature: typeof req.temperature === 'number' ? req.temperature : undefined,
          max_tokens: typeof req.maxTokens === 'number' && req.maxTokens > 0 ? req.maxTokens : undefined,
        }),
        signal,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`HTTP_${response.status}${text ? `: ${text}` : ''}`)
      }

      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
      const rawText = await response.text()

      if (looksLikeHtml(contentType, rawText)) {
        throw new Error('Endpoint 返回的是 HTML 页面，不是 OpenAI 兼容 JSON。请检查是否填写了正确的接口地址，通常应为 /v1/chat/completions。')
      }

      const parsed = parseModelResponse(rawText)
      if (!parsed.content) {
        throw new Error('模型返回格式不兼容：未找到可用文本内容。')
      }

      return parsed
    } catch (error) {
      if (req.signal?.aborted) {
        throw new Error('任务已取消')
      }

      if (isAbortLikeError(error)) {
        throw new Error(`请求超时，已在 ${req.timeoutMs}ms 后取消。请增大 Timeout (ms)，或缩短输入内容。`)
      }
      throw error
    } finally {
      clearTimeout(abortTimeout)
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
  } catch {
    if (!looksLikeSse(rawText)) {
      throw new Error('Endpoint 返回的不是有效 JSON。请检查接口地址是否为 OpenAI 兼容的 chat completions 接口。')
    }

    const chunks = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter((line) => line && line !== '[DONE]')

    const parts: string[] = []
    let usage: ModelResponse['usage']

    for (const chunk of chunks) {
      let data: any
      try {
        data = JSON.parse(chunk)
      } catch {
        continue
      }

      const piece = extractAssistantContent(data)
      if (piece) {
        parts.push(piece)
      }

      if (!usage && data?.usage) {
        usage = data.usage
      }
    }

    return {
      content: parts.join(''),
      usage,
    }
  }

  if (data?.error?.message && typeof data.error.message === 'string') {
    throw new Error(data.error.message)
  }

  return {
    content: extractAssistantContent(data),
    usage: data?.usage,
  }
}

function extractAssistantContent(data: any): string {
  const choice = data?.choices?.[0]
  if (choice) {
    const messageContent = normalizeContent(choice.message?.content)
    if (messageContent) return messageContent

    const deltaContent = normalizeContent(choice.delta?.content)
    if (deltaContent) return deltaContent

    const textContent = normalizeContent(choice.text)
    if (textContent) return textContent
  }

  const outputText = normalizeContent(data?.output_text)
  if (outputText) return outputText

  if (Array.isArray(data?.output)) {
    const output = data.output
      .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : [item]))
      .map((item: any) => normalizeContent(item?.text ?? item?.content ?? item))
      .filter(Boolean)
      .join('')

    if (output) {
      return output
    }
  }

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
