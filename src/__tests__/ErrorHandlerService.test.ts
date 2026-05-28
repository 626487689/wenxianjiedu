import { errorHandler } from '../services/error/ErrorHandlerService'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger
vi.mock('../services/logger/LoggerService', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}))

// Mock console methods
console.error = vi.fn()
console.warn = vi.fn()
console.info = vi.fn()

describe('ErrorHandlerService', () => {
  beforeEach(() => {
    errorHandler.clearErrorStatistics()
    errorHandler.clearErrorHistory()
    vi.clearAllMocks()
  })

  describe('handleError', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo).toBeDefined()
      expect(errorInfo.code).toBe('UNKNOWN_ERROR')
      expect(errorInfo.message).toBe('未知错误')
      expect(errorInfo.details).toBe('Test error')
    })

    it('should handle string errors', () => {
      const error = 'Test error string'
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo).toBeDefined()
      expect(errorInfo.code).toBe('UNKNOWN_ERROR')
      expect(errorInfo.message).toBe('未知错误')
      expect(errorInfo.details).toBe('Test error string')
    })

    it('should handle unknown error types', () => {
      const error = { foo: 'bar' }
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo).toBeDefined()
      expect(errorInfo.details).toBe('未知错误')
    })

    it('should handle timeout errors', () => {
      const error = new Error('timeout')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo).toBeDefined()
      expect(errorInfo.code).toBe('TIMEOUT_ERROR')
      expect(errorInfo.message).toBe('请求超时')
    })

    it('should handle network errors', () => {
      const error = new Error('网络连接失败')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo).toBeDefined()
      expect(errorInfo.code).toBe('NETWORK_ERROR')
      expect(errorInfo.message).toBe('网络连接失败')
    })

    it('should handle API key errors (HTTP 401)', () => {
      const error = new Error('HTTP_401 Unauthorized')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo).toBeDefined()
      expect(errorInfo.code).toBe('API_KEY_ERROR')
      expect(errorInfo.message).toBe('API Key 无效')
    })

    it('should handle API rate limit errors (HTTP 429)', () => {
      const error = new Error('HTTP_429 Too Many Requests')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo).toBeDefined()
      expect(errorInfo.code).toBe('API_RATE_LIMIT')
      expect(errorInfo.message).toBe('API 调用频率限制')
    })

    it('should handle API not found errors (HTTP 404)', () => {
      const error = new Error('HTTP_404 Not Found')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('API_NOT_FOUND')
    })

    it('should handle API service unavailable errors (HTTP 503)', () => {
      const error = new Error('HTTP_503 Service Unavailable')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('API_SERVICE_UNAVAILABLE')
    })

    it('should handle document parse errors', () => {
      const error = new Error('文档解析失败')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('DOCUMENT_PARSE_ERROR')
    })

    it('should handle document encoding errors', () => {
      const error = new Error('文档编码错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('DOCUMENT_ENCODING_ERROR')
    })

    it('should handle model errors', () => {
      const error = new Error('模型调用失败')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('MODEL_ERROR')
    })

    it('should handle model not found errors', () => {
      const error = new Error('模型不存在')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('MODEL_NOT_FOUND')
    })

    it('should handle model overloaded errors', () => {
      const error = new Error('模型负载过高')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('MODEL_OVERLOADED')
    })

    it('should handle config errors', () => {
      const error = new Error('配置错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('CONFIG_ERROR')
    })

    it('should handle config missing errors as general config errors', () => {
      const error = new Error('配置缺失')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('CONFIG_ERROR')
    })

    it('should handle file system errors', () => {
      const error = new Error('文件系统错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('FILE_SYSTEM_ERROR')
    })

    it('should handle file not found errors as general file errors', () => {
      const error = new Error('文件未找到')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('FILE_SYSTEM_ERROR')
    })

    it('should handle file permission errors as general file errors', () => {
      const error = new Error('文件权限错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('FILE_SYSTEM_ERROR')
    })

    it('should handle permission errors', () => {
      const error = new Error('权限错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('PERMISSION_ERROR')
    })

    it('should handle concurrency errors', () => {
      const error = new Error('并发错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('CONCURRENCY_ERROR')
    })

    it('should handle memory errors', () => {
      const error = new Error('内存错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('MEMORY_ERROR')
    })

    it('should handle input errors', () => {
      const error = new Error('输入错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('INPUT_ERROR')
    })

    it('should handle input validation errors as general input errors', () => {
      const error = new Error('输入验证错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('INPUT_ERROR')
    })

    it('should handle output errors', () => {
      const error = new Error('输出错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('OUTPUT_ERROR')
    })

    it('should handle output path errors as general output errors', () => {
      const error = new Error('输出路径错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('OUTPUT_ERROR')
    })

    it('should handle plugin errors', () => {
      const error = new Error('插件错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('PLUGIN_ERROR')
    })

    it('should handle plugin not found errors as general plugin errors', () => {
      const error = new Error('插件未找到')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('PLUGIN_ERROR')
    })

    it('should handle business errors', () => {
      const error = new Error('业务逻辑错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('BUSINESS_ERROR')
    })

    it('should handle data errors', () => {
      const error = new Error('数据错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('DATA_ERROR')
    })

    it('should handle cache errors', () => {
      const error = new Error('缓存错误')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('CACHE_ERROR')
    })

    it('should handle performance warnings', () => {
      const error = new Error('性能警告')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('PERFORMANCE_WARNING')
    })

    it('should handle deprecation warnings', () => {
      const error = new Error('弃用警告')
      const errorInfo = errorHandler.handleError(error)
      expect(errorInfo.code).toBe('DEPRECATION_WARNING')
    })

    it('should include context when provided', () => {
      const error = new Error('Test with context')
      const context = { operation: 'test-op', module: 'test-module' }
      errorHandler.handleError(error, context)
    })
  })

  describe('formatError', () => {
    it('should format error info into a user-friendly string', () => {
      const error = new Error('Test error')
      const formattedError = errorHandler.formatError(error)
      expect(typeof formattedError).toBe('string')
      expect(formattedError).toContain('【UNKNOWN_ERROR】')
      expect(formattedError).toContain('未知错误')
      expect(formattedError).toContain('Test error')
    })

    it('should format error with all details', () => {
      const error = new Error('HTTP_401 Unauthorized')
      const formattedError = errorHandler.formatError(error)
      expect(formattedError).toContain('【API_KEY_ERROR】')
      expect(formattedError).toContain('API Key 无效')
      expect(formattedError).toContain('详细信息')
      expect(formattedError).toContain('建议')
      expect(formattedError).toContain('类别')
    })
  })

  describe('addErrorInfo and getErrorInfo', () => {
    it('should add and retrieve a custom error info', () => {
      const customErrorInfo = {
        code: 'CUSTOM_ERROR',
        message: 'Custom Error',
        details: 'This is a custom error',
        suggestion: 'Try again later',
        severity: 'error' as const
      }

      errorHandler.addErrorInfo('CUSTOM_ERROR', customErrorInfo)
      const errorInfo = errorHandler.getErrorInfo('CUSTOM_ERROR')
      expect(errorInfo).toBeDefined()
      expect(errorInfo?.code).toBe('CUSTOM_ERROR')
      expect(errorInfo?.message).toBe('Custom Error')
    })

    it('should return undefined for non-existent error code', () => {
      const errorInfo = errorHandler.getErrorInfo('NON_EXISTENT_ERROR')
      expect(errorInfo).toBeUndefined()
    })
  })

  describe('error statistics', () => {
    it('should track error statistics', () => {
      errorHandler.handleError(new Error('Test error 1'))
      errorHandler.handleError(new Error('Test error 2'))
      const stats = errorHandler.getErrorStatistics()
      expect(Array.isArray(stats)).toBe(true)
      expect(stats.length).toBeGreaterThan(0)
    })

    it('should get error statistics by code', () => {
      errorHandler.handleError(new Error('timeout'))
      const stats = errorHandler.getErrorStatisticsByCode('TIMEOUT_ERROR')
      expect(stats).toBeDefined()
      expect(stats?.code).toBe('TIMEOUT_ERROR')
    })

    it('should return undefined for non-existent code in statistics', () => {
      const stats = errorHandler.getErrorStatisticsByCode('NON_EXISTENT')
      expect(stats).toBeUndefined()
    })

    it('should increment count for same error code', () => {
      errorHandler.handleError(new Error('timeout'))
      errorHandler.handleError(new Error('timeout'))
      const stats = errorHandler.getErrorStatisticsByCode('TIMEOUT_ERROR')
      expect(stats?.count).toBe(2)
    })

    it('should clear error statistics', () => {
      errorHandler.handleError(new Error('Test error'))
      errorHandler.clearErrorStatistics()
      const stats = errorHandler.getErrorStatistics()
      expect(stats.length).toBe(0)
    })

    it('should generate error report', () => {
      errorHandler.handleError(new Error('timeout'))
      errorHandler.handleError(new Error('网络连接失败'))
      const report = errorHandler.getErrorReport()
      expect(report.totalErrors).toBeGreaterThan(0)
      expect(Array.isArray(report.errorStatistics)).toBe(true)
      expect(Array.isArray(report.mostFrequentErrors)).toBe(true)
      expect(Array.isArray(report.recentErrors)).toBe(true)
      expect(typeof report.errorsByCategory).toBe('object')
    })

    it('should get error statistics by category', () => {
      errorHandler.handleError(new Error('timeout'))
      const byCategory = errorHandler.getErrorStatisticsByCategory()
      expect(typeof byCategory).toBe('object')
    })
  })

  describe('error history', () => {
    it('should track error history', () => {
      errorHandler.handleError(new Error('Test error 1'))
      errorHandler.handleError(new Error('Test error 2'))
      const history = errorHandler.getErrorHistory()
      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBe(2)
    })

    it('should limit error history when requested', () => {
      errorHandler.handleError(new Error('Test 1'))
      errorHandler.handleError(new Error('Test 2'))
      errorHandler.handleError(new Error('Test 3'))
      const history = errorHandler.getErrorHistory(2)
      expect(history.length).toBe(2)
    })

    it('should clear error history', () => {
      errorHandler.handleError(new Error('Test error'))
      errorHandler.clearErrorHistory()
      const history = errorHandler.getErrorHistory()
      expect(history.length).toBe(0)
    })
  })

  describe('showError', () => {
    it('should show error with console.error for severity error', () => {
      errorHandler.showError(new Error('Test error'))
      expect(console.error).toHaveBeenCalled()
    })

    it('should show warning with console.warn for severity warning', () => {
      errorHandler.showError(new Error('性能警告'))
      expect(console.warn).toHaveBeenCalled()
    })

    it('should show info with console.info for severity info', () => {
      errorHandler.showError(new Error('弃用警告'))
    })
  })

  describe('attemptRecovery', () => {
    it('should return false when error is not recoverable', () => {
      const result = errorHandler.attemptRecovery(new Error('Test error'))
      expect(result).toBe(false)
    })

    it('should return false when error has no recovery action', () => {
      const customErrorInfo = {
        code: 'RECOVERABLE_ERROR',
        message: 'Recoverable Error',
        severity: 'error' as const,
        recoverable: true
      }
      errorHandler.addErrorInfo('RECOVERABLE_ERROR', customErrorInfo)
      const result = errorHandler.attemptRecovery(new Error('recoverable'))
      expect(result).toBe(false)
    })
  })

  describe('utility methods', () => {
    it('should check if error is retryable', () => {
      const isRetryable = errorHandler.isRetryableError(new Error('timeout'))
      expect(typeof isRetryable).toBe('boolean')
    })

    it('should get retry delay for error', () => {
      const delay = errorHandler.getRetryDelay(new Error('timeout'))
      expect(typeof delay).toBe('number')
      expect(delay).toBeGreaterThan(0)
    })

    it('should check if error is critical', () => {
      const isCritical = errorHandler.isCriticalError(new Error('Test error'))
      expect(typeof isCritical).toBe('boolean')
    })

    it('should check if error is recoverable', () => {
      const isRecoverable = errorHandler.isRecoverableError(new Error('Test error'))
      expect(typeof isRecoverable).toBe('boolean')
    })
  })
})
