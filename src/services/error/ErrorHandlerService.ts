import { logger } from '../logger/LoggerService'

export interface ErrorInfo {
  code: string
  message: string
  details?: string
  suggestion?: string
  severity: 'info' | 'warning' | 'error'
  recoverable?: boolean
  recoveryAction?: () => void
  category?: string
  retryable?: boolean
  retryDelay?: number
}

export interface ErrorStatistics {
  code: string
  count: number
  lastOccurred: number
  firstOccurred: number
  category?: string
  lastMessage?: string
}

export interface ErrorContext {
  operation?: string
  module?: string
  userId?: string
  requestId?: string
  metadata?: Record<string, any>
}

export class ErrorHandlerService {
  private errorMap: Map<string, ErrorInfo> = new Map()
  private errorStatistics: Map<string, ErrorStatistics> = new Map()
  private maxErrorStatistics = 1000
  private errorHistory: Array<{ error: ErrorInfo; context?: ErrorContext; timestamp: number }> = []
  private maxErrorHistory = 1000

  constructor() {
    this.initializeErrorMap()
  }

  private initializeErrorMap(): void {
    this.errorMap.set('NETWORK_ERROR', {
      code: 'NETWORK_ERROR',
      message: '网络连接失败',
      details: '无法连接到服务器，请检查您的网络连接后重试。',
      suggestion: '检查网络连接，确保您的设备已连接到互联网。',
      severity: 'error',
      category: 'network',
      retryable: true,
      retryDelay: 2000
    })

    this.errorMap.set('TIMEOUT_ERROR', {
      code: 'TIMEOUT_ERROR',
      message: '请求超时',
      details: '服务器响应时间过长，可能是网络延迟或服务器负载过高。',
      suggestion: '尝试增加超时时间，或检查网络连接。',
      severity: 'error',
      category: 'network',
      retryable: true,
      retryDelay: 3000
    })

    this.errorMap.set('NETWORK_UNSTABLE', {
      code: 'NETWORK_UNSTABLE',
      message: '网络连接不稳定',
      details: '网络连接时断时续，可能导致操作失败。',
      suggestion: '检查网络连接稳定性，或尝试使用有线网络。',
      severity: 'warning',
      category: 'network',
      retryable: true,
      retryDelay: 1000
    })

    this.errorMap.set('API_KEY_ERROR', {
      code: 'API_KEY_ERROR',
      message: 'API Key 无效',
      details: '提供的API Key无效或已过期。',
      suggestion: '请检查并更新您的API Key。',
      severity: 'error',
      category: 'api',
      retryable: false
    })

    this.errorMap.set('API_RATE_LIMIT', {
      code: 'API_RATE_LIMIT',
      message: 'API 调用频率限制',
      details: '您已达到API的调用频率限制，请稍后再试。',
      suggestion: '等待一段时间后重试，或减少请求频率。',
      severity: 'error',
      category: 'api',
      retryable: true,
      retryDelay: 5000
    })

    this.errorMap.set('API_NOT_FOUND', {
      code: 'API_NOT_FOUND',
      message: 'API 端点不存在',
      details: '请求的API端点不存在或已更改。',
      suggestion: '请检查API端点地址是否正确。',
      severity: 'error',
      category: 'api',
      retryable: false
    })

    this.errorMap.set('API_SERVICE_UNAVAILABLE', {
      code: 'API_SERVICE_UNAVAILABLE',
      message: 'API 服务不可用',
      details: 'API服务暂时不可用，可能是服务器维护或故障。',
      suggestion: '稍后重试，或检查API服务状态。',
      severity: 'error',
      category: 'api',
      retryable: true,
      retryDelay: 10000
    })

    this.errorMap.set('DOCUMENT_PARSE_ERROR', {
      code: 'DOCUMENT_PARSE_ERROR',
      message: '文档解析失败',
      details: '无法解析文档，可能是文档格式不支持或文件损坏。',
      suggestion: '尝试使用其他格式的文档，或确保文件未损坏。',
      severity: 'error',
      category: 'document',
      retryable: false
    })

    this.errorMap.set('DOCUMENT_TOO_LARGE', {
      code: 'DOCUMENT_TOO_LARGE',
      message: '文档过大',
      details: '文档大小超过了系统处理限制。',
      suggestion: '尝试分割文档，或使用更小的文档。',
      severity: 'error',
      category: 'document',
      retryable: false
    })

    this.errorMap.set('DOCUMENT_ENCODING_ERROR', {
      code: 'DOCUMENT_ENCODING_ERROR',
      message: '文档编码错误',
      details: '无法正确解析文档编码。',
      suggestion: '尝试使用UTF-8编码的文档。',
      severity: 'error',
      category: 'document',
      retryable: false
    })

    this.errorMap.set('MODEL_ERROR', {
      code: 'MODEL_ERROR',
      message: '模型调用失败',
      details: '模型处理请求时发生错误。',
      suggestion: '检查模型配置，或尝试使用其他模型。',
      severity: 'error',
      category: 'model',
      retryable: true,
      retryDelay: 2000
    })

    this.errorMap.set('MODEL_NOT_FOUND', {
      code: 'MODEL_NOT_FOUND',
      message: '模型不存在',
      details: '请求的模型不存在或不可用。',
      suggestion: '检查模型名称是否正确，或尝试使用其他模型。',
      severity: 'error',
      category: 'model',
      retryable: false
    })

    this.errorMap.set('MODEL_OVERLOADED', {
      code: 'MODEL_OVERLOADED',
      message: '模型负载过高',
      details: '模型服务负载过高，暂时无法处理请求。',
      suggestion: '稍后重试，或尝试使用其他模型。',
      severity: 'error',
      category: 'model',
      retryable: true,
      retryDelay: 5000
    })

    this.errorMap.set('SYSTEM_ERROR', {
      code: 'SYSTEM_ERROR',
      message: '系统错误',
      details: '系统内部发生错误。',
      suggestion: '请稍后重试，或联系系统管理员。',
      severity: 'error',
      category: 'system',
      retryable: true,
      retryDelay: 1000
    })

    this.errorMap.set('SYSTEM_RESOURCE_ERROR', {
      code: 'SYSTEM_RESOURCE_ERROR',
      message: '系统资源错误',
      details: '系统资源不足，无法完成操作。',
      suggestion: '关闭不必要的应用程序，或增加系统资源。',
      severity: 'error',
      category: 'system',
      retryable: false
    })

    this.errorMap.set('CONFIG_ERROR', {
      code: 'CONFIG_ERROR',
      message: '配置错误',
      details: '系统配置无效或不完整。',
      suggestion: '检查并更新系统配置。',
      severity: 'error',
      category: 'config',
      retryable: false
    })

    this.errorMap.set('CONFIG_MISSING', {
      code: 'CONFIG_MISSING',
      message: '配置缺失',
      details: '系统缺少必要的配置项。',
      suggestion: '检查并添加缺失的配置项。',
      severity: 'error',
      category: 'config',
      retryable: false
    })

    this.errorMap.set('FILE_SYSTEM_ERROR', {
      code: 'FILE_SYSTEM_ERROR',
      message: '文件系统错误',
      details: '文件系统操作失败，可能是权限不足或磁盘空间不足。',
      suggestion: '检查文件权限和磁盘空间。',
      severity: 'error',
      category: 'file',
      retryable: false
    })

    this.errorMap.set('FILE_NOT_FOUND', {
      code: 'FILE_NOT_FOUND',
      message: '文件未找到',
      details: '请求的文件不存在。',
      suggestion: '检查文件路径是否正确。',
      severity: 'error',
      category: 'file',
      retryable: false
    })

    this.errorMap.set('FILE_PERMISSION_ERROR', {
      code: 'FILE_PERMISSION_ERROR',
      message: '文件权限错误',
      details: '没有足够的权限访问文件。',
      suggestion: '检查文件权限设置。',
      severity: 'error',
      category: 'file',
      retryable: false
    })

    this.errorMap.set('PERMISSION_ERROR', {
      code: 'PERMISSION_ERROR',
      message: '权限错误',
      details: '没有足够的权限执行操作。',
      suggestion: '检查系统权限设置。',
      severity: 'error',
      category: 'permission',
      retryable: false
    })

    this.errorMap.set('CONCURRENCY_ERROR', {
      code: 'CONCURRENCY_ERROR',
      message: '并发错误',
      details: '并发操作冲突，可能是多个操作同时访问同一资源。',
      suggestion: '稍后重试操作。',
      severity: 'error',
      category: 'concurrency',
      retryable: true,
      retryDelay: 1000
    })

    this.errorMap.set('MEMORY_ERROR', {
      code: 'MEMORY_ERROR',
      message: '内存错误',
      details: '系统内存不足，无法完成操作。',
      suggestion: '关闭不必要的应用程序，或增加系统内存。',
      severity: 'error',
      category: 'system',
      retryable: false
    })

    this.errorMap.set('INPUT_ERROR', {
      code: 'INPUT_ERROR',
      message: '输入错误',
      details: '输入数据无效或不完整。',
      suggestion: '检查输入数据是否正确。',
      severity: 'error',
      category: 'input',
      retryable: false
    })

    this.errorMap.set('INPUT_VALIDATION_ERROR', {
      code: 'INPUT_VALIDATION_ERROR',
      message: '输入验证错误',
      details: '输入数据未通过验证。',
      suggestion: '检查输入数据是否符合要求。',
      severity: 'error',
      category: 'input',
      retryable: false
    })

    this.errorMap.set('OUTPUT_ERROR', {
      code: 'OUTPUT_ERROR',
      message: '输出错误',
      details: '无法写入输出文件。',
      suggestion: '检查输出路径权限和磁盘空间。',
      severity: 'error',
      category: 'output',
      retryable: false
    })

    this.errorMap.set('OUTPUT_PATH_ERROR', {
      code: 'OUTPUT_PATH_ERROR',
      message: '输出路径错误',
      details: '输出路径不存在或无法访问。',
      suggestion: '检查输出路径是否正确。',
      severity: 'error',
      category: 'output',
      retryable: false
    })

    this.errorMap.set('PLUGIN_ERROR', {
      code: 'PLUGIN_ERROR',
      message: '插件错误',
      details: '插件加载或执行失败。',
      suggestion: '检查插件是否兼容，或禁用有问题的插件。',
      severity: 'error',
      category: 'plugin',
      retryable: false
    })

    this.errorMap.set('PLUGIN_NOT_FOUND', {
      code: 'PLUGIN_NOT_FOUND',
      message: '插件未找到',
      details: '请求的插件不存在。',
      suggestion: '检查插件名称是否正确。',
      severity: 'error',
      category: 'plugin',
      retryable: false
    })

    this.errorMap.set('PERFORMANCE_WARNING', {
      code: 'PERFORMANCE_WARNING',
      message: '性能警告',
      details: '操作执行时间过长，可能影响系统性能。',
      suggestion: '考虑优化操作或增加系统资源。',
      severity: 'warning',
      category: 'performance'
    })

    this.errorMap.set('DEPRECATION_WARNING', {
      code: 'DEPRECATION_WARNING',
      message: '弃用警告',
      details: '使用了已弃用的功能，可能在未来版本中被移除。',
      suggestion: '更新代码以使用推荐的替代方案。',
      severity: 'warning',
      category: 'deprecation'
    })

    this.errorMap.set('INFO_MESSAGE', {
      code: 'INFO_MESSAGE',
      message: '信息提示',
      details: '操作执行信息。',
      suggestion: '',
      severity: 'info',
      category: 'info'
    })

    this.errorMap.set('BUSINESS_ERROR', {
      code: 'BUSINESS_ERROR',
      message: '业务逻辑错误',
      details: '业务逻辑执行失败。',
      suggestion: '检查业务参数是否正确。',
      severity: 'error',
      category: 'business',
      retryable: false
    })

    this.errorMap.set('DATA_ERROR', {
      code: 'DATA_ERROR',
      message: '数据错误',
      details: '数据处理失败。',
      suggestion: '检查数据是否正确。',
      severity: 'error',
      category: 'data',
      retryable: false
    })

    this.errorMap.set('CACHE_ERROR', {
      code: 'CACHE_ERROR',
      message: '缓存错误',
      details: '缓存操作失败。',
      suggestion: '检查缓存配置。',
      severity: 'error',
      category: 'cache',
      retryable: true,
      retryDelay: 1000
    })
  }

  handleError(error: unknown, context?: ErrorContext): ErrorInfo {
    let errorMessage = ''
    let errorCode = 'UNKNOWN_ERROR'

    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else {
      errorMessage = '未知错误'
    }

    if (errorMessage.includes('HTTP_401')) {
      errorCode = 'API_KEY_ERROR'
    } else if (errorMessage.includes('HTTP_429')) {
      errorCode = 'API_RATE_LIMIT'
    } else if (errorMessage.includes('HTTP_404')) {
      errorCode = 'API_NOT_FOUND'
    } else if (errorMessage.includes('HTTP_503')) {
      errorCode = 'API_SERVICE_UNAVAILABLE'
    } else if (errorMessage.includes('timeout')) {
      errorCode = 'TIMEOUT_ERROR'
    } else if (errorMessage.includes('网络')) {
      errorCode = 'NETWORK_ERROR'
    } else if (errorMessage.includes('文档解析')) {
      errorCode = 'DOCUMENT_PARSE_ERROR'
    } else if (errorMessage.includes('文档编码')) {
      errorCode = 'DOCUMENT_ENCODING_ERROR'
    } else if (errorMessage.includes('模型调用')) {
      errorCode = 'MODEL_ERROR'
    } else if (errorMessage.includes('模型不存在')) {
      errorCode = 'MODEL_NOT_FOUND'
    } else if (errorMessage.includes('模型负载')) {
      errorCode = 'MODEL_OVERLOADED'
    } else if (errorMessage.includes('配置')) {
      errorCode = 'CONFIG_ERROR'
    } else if (errorMessage.includes('配置缺失')) {
      errorCode = 'CONFIG_MISSING'
    } else if (errorMessage.includes('文件')) {
      errorCode = 'FILE_SYSTEM_ERROR'
    } else if (errorMessage.includes('文件未找到')) {
      errorCode = 'FILE_NOT_FOUND'
    } else if (errorMessage.includes('文件权限')) {
      errorCode = 'FILE_PERMISSION_ERROR'
    } else if (errorMessage.includes('权限')) {
      errorCode = 'PERMISSION_ERROR'
    } else if (errorMessage.includes('并发')) {
      errorCode = 'CONCURRENCY_ERROR'
    } else if (errorMessage.includes('内存')) {
      errorCode = 'MEMORY_ERROR'
    } else if (errorMessage.includes('输入')) {
      errorCode = 'INPUT_ERROR'
    } else if (errorMessage.includes('输入验证')) {
      errorCode = 'INPUT_VALIDATION_ERROR'
    } else if (errorMessage.includes('输出')) {
      errorCode = 'OUTPUT_ERROR'
    } else if (errorMessage.includes('输出路径')) {
      errorCode = 'OUTPUT_PATH_ERROR'
    } else if (errorMessage.includes('插件')) {
      errorCode = 'PLUGIN_ERROR'
    } else if (errorMessage.includes('插件未找到')) {
      errorCode = 'PLUGIN_NOT_FOUND'
    } else if (errorMessage.includes('业务')) {
      errorCode = 'BUSINESS_ERROR'
    } else if (errorMessage.includes('数据')) {
      errorCode = 'DATA_ERROR'
    } else if (errorMessage.includes('缓存')) {
      errorCode = 'CACHE_ERROR'
    } else if (errorMessage.includes('性能')) {
      errorCode = 'PERFORMANCE_WARNING'
    } else if (errorMessage.includes('弃用')) {
      errorCode = 'DEPRECATION_WARNING'
    }

    const errorInfo = this.errorMap.get(errorCode) || {
      code: 'UNKNOWN_ERROR',
      message: '未知错误',
      details: errorMessage,
      suggestion: '请稍后重试，或联系系统管理员。',
      severity: 'error'
    }

    this.updateErrorStatistics(errorCode, errorMessage)
    this.recordErrorHistory(errorInfo, context)

    logger.error(`[${errorInfo.code}] ${errorInfo.message}: ${errorInfo.details}`, {
      category: 'error',
      metadata: {
        originalError: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        category: errorInfo.category,
        context: context
      }
    })

    return errorInfo
  }

  private updateErrorStatistics(errorCode: string, errorMessage: string): void {
    const now = Date.now()
    const existingStats = this.errorStatistics.get(errorCode)
    const errorInfo = this.errorMap.get(errorCode)

    if (existingStats) {
      this.errorStatistics.set(errorCode, {
        ...existingStats,
        count: existingStats.count + 1,
        lastOccurred: now,
        lastMessage: errorMessage
      })
    } else {
      this.errorStatistics.set(errorCode, {
        code: errorCode,
        count: 1,
        lastOccurred: now,
        firstOccurred: now,
        category: errorInfo?.category,
        lastMessage: errorMessage
      })
    }

    if (this.errorStatistics.size > this.maxErrorStatistics) {
      const oldestCode = Array.from(this.errorStatistics.entries())
        .sort((a, b) => a[1].lastOccurred - b[1].lastOccurred)[0][0]
      this.errorStatistics.delete(oldestCode)
    }
  }

  private recordErrorHistory(error: ErrorInfo, context?: ErrorContext): void {
    const now = Date.now()
    this.errorHistory.push({ error, context, timestamp: now })

    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift()
    }
  }

  addErrorInfo(code: string, errorInfo: ErrorInfo): void {
    this.errorMap.set(code, errorInfo)
  }

  getErrorInfo(code: string): ErrorInfo | undefined {
    return this.errorMap.get(code)
  }

  formatError(error: unknown, context?: ErrorContext): string {
    const errorInfo = this.handleError(error, context)
    let formatted = `【${errorInfo.code}】${errorInfo.message}`
    if (errorInfo.details) {
      formatted += `\n详细信息: ${errorInfo.details}`
    }
    if (errorInfo.suggestion) {
      formatted += `\n建议: ${errorInfo.suggestion}`
    }
    if (errorInfo.category) {
      formatted += `\n类别: ${errorInfo.category}`
    }
    return formatted
  }

  showError(error: unknown, context?: ErrorContext): void {
    const errorInfo = this.handleError(error, context)
    const formattedError = this.formatError(error, context)

    switch (errorInfo.severity) {
      case 'error':
        console.error(formattedError)
        break
      case 'warning':
        console.warn(formattedError)
        break
      case 'info':
        console.info(formattedError)
        break
    }
  }

  attemptRecovery(error: unknown, context?: ErrorContext): boolean {
    const errorInfo = this.handleError(error, context)

    if (errorInfo.recoverable && errorInfo.recoveryAction) {
      try {
        errorInfo.recoveryAction()
        logger.info(`错误恢复成功: ${errorInfo.code}`, {
          category: 'error',
          metadata: { context: context }
        })
        return true
      } catch (recoveryError) {
        logger.error(`错误恢复失败: ${errorInfo.code}`, {
          category: 'error',
          metadata: { context: context, recoveryError: String(recoveryError) }
        })
        return false
      }
    }

    return false
  }

  getErrorStatistics(): ErrorStatistics[] {
    return Array.from(this.errorStatistics.values())
  }

  getErrorStatisticsByCode(code: string): ErrorStatistics | undefined {
    return this.errorStatistics.get(code)
  }

  clearErrorStatistics(): void {
    this.errorStatistics.clear()
    logger.info('错误统计已清除', { category: 'error' })
  }

  getErrorReport(): {
    totalErrors: number
    errorStatistics: ErrorStatistics[]
    mostFrequentErrors: ErrorStatistics[]
    recentErrors: ErrorStatistics[]
    errorsByCategory: Record<string, number>
  } {
    const statistics = Array.from(this.errorStatistics.values())
    const totalErrors = statistics.reduce((sum, stat) => sum + stat.count, 0)

    const mostFrequentErrors = [...statistics]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const recentErrors = [...statistics]
      .sort((a, b) => b.lastOccurred - a.lastOccurred)
      .slice(0, 10)

    const errorsByCategory: Record<string, number> = {}
    statistics.forEach(stat => {
      const category = stat.category || 'unknown'
      errorsByCategory[category] = (errorsByCategory[category] || 0) + stat.count
    })

    return {
      totalErrors,
      errorStatistics: statistics,
      mostFrequentErrors,
      recentErrors,
      errorsByCategory
    }
  }

  getErrorHistory(limit?: number): Array<{ error: ErrorInfo; context?: ErrorContext; timestamp: number }> {
    const history = [...this.errorHistory]
      .sort((a, b) => b.timestamp - a.timestamp)
    return limit ? history.slice(0, limit) : history
  }

  getErrorStatisticsByCategory(): Record<string, ErrorStatistics[]> {
    const statistics = Array.from(this.errorStatistics.values())
    const byCategory: Record<string, ErrorStatistics[]> = {}

    statistics.forEach(stat => {
      const category = stat.category || 'unknown'
      if (!byCategory[category]) {
        byCategory[category] = []
      }
      byCategory[category].push(stat)
    })

    Object.keys(byCategory).forEach(category => {
      byCategory[category].sort((a, b) => b.count - a.count)
    })

    return byCategory
  }

  clearErrorHistory(): void {
    this.errorHistory = []
    logger.info('错误历史已清除', { category: 'error' })
  }

  isRetryableError(error: unknown): boolean {
    const errorInfo = this.handleError(error)
    return errorInfo.retryable || false
  }

  getRetryDelay(error: unknown): number {
    const errorInfo = this.handleError(error)
    return errorInfo.retryDelay || 1000
  }

  isCriticalError(error: unknown): boolean {
    const errorInfo = this.handleError(error)
    return errorInfo.severity === 'error'
  }

  isRecoverableError(error: unknown): boolean {
    const errorInfo = this.handleError(error)
    return errorInfo.recoverable || false
  }
}

export const errorHandler = new ErrorHandlerService()
