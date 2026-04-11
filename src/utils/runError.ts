export type RunErrorCode =
  | 'CANCELLED'
  | 'TIMEOUT'
  | 'AUTH_FAILED'
  | 'ENDPOINT_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INVALID_ENDPOINT'
  | 'INVALID_RESPONSE'
  | 'PARSE_FAILED'
  | 'UNKNOWN'

export interface NormalizedRunError {
  code: RunErrorCode
  message: string
  isCancelled: boolean
}

export function normalizeRunError(error: unknown, fallback = '未知错误'): NormalizedRunError {
  const rawMessage = extractErrorMessage(error, fallback)

  if (isCancelledMessage(rawMessage)) {
    return {
      code: 'CANCELLED',
      message: '任务已取消',
      isCancelled: true,
    }
  }

  if (rawMessage.includes('HTTP_401') || rawMessage.includes('HTTP_403')) {
    return {
      code: 'AUTH_FAILED',
      message: '鉴权失败：API Key 无效、无权限，或当前模型不允许访问。',
      isCancelled: false,
    }
  }

  if (rawMessage.includes('HTTP_404')) {
    return {
      code: 'ENDPOINT_NOT_FOUND',
      message: '接口地址无效：未找到目标接口，请检查 Endpoint 与路径模式配置。',
      isCancelled: false,
    }
  }

  if (rawMessage.includes('HTTP_429')) {
    return {
      code: 'RATE_LIMITED',
      message: '请求被限流：请稍后重试，或降低批处理并发数。',
      isCancelled: false,
    }
  }

  if (rawMessage.includes('请求超时') || rawMessage.includes('HTTP_408') || rawMessage.includes('HTTP_504')) {
    return {
      code: 'TIMEOUT',
      message: rawMessage,
      isCancelled: false,
    }
  }

  if (
    rawMessage.includes('Endpoint 返回的是 HTML 页面') ||
    rawMessage.includes('Endpoint URL 格式无效') ||
    rawMessage.includes('模型 Endpoint 无效')
  ) {
    return {
      code: 'INVALID_ENDPOINT',
      message: rawMessage,
      isCancelled: false,
    }
  }

  if (rawMessage.includes('文档解析失败')) {
    return {
      code: 'PARSE_FAILED',
      message: rawMessage,
      isCancelled: false,
    }
  }

  if (
    rawMessage.includes('Endpoint 返回的不是有效 JSON') ||
    rawMessage.includes('INVALID_RESPONSE') ||
    rawMessage.includes('模型返回格式不兼容')
  ) {
    return {
      code: 'INVALID_RESPONSE',
      message: '模型返回格式不兼容：当前服务不是标准 OpenAI-compatible chat completions 响应。',
      isCancelled: false,
    }
  }

  return {
    code: 'UNKNOWN',
    message: rawMessage,
    isCancelled: false,
  }
}

export function extractErrorMessage(error: unknown, fallback = '未知错误'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (error && typeof error === 'object') {
    try {
      const serialized = JSON.stringify(error)
      if (serialized && serialized !== '{}') {
        return serialized
      }
    } catch {
      return fallback
    }
  }

  return fallback
}

function isCancelledMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('任务已取消') || normalized.includes('user-cancelled') || normalized.includes('cancelled')
}
