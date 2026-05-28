import { LoggerService, LogLevel } from '../services/logger/LoggerService'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock console methods
console.debug = vi.fn()
console.info = vi.fn()
console.warn = vi.fn()
console.error = vi.fn()

// Helper to get only user-added logs (filter out internal logger messages)
function getFilteredHistory(logger: LoggerService) {
  return logger.getLogHistory().filter(entry => entry.category !== 'logger')
}

describe('LoggerService', () => {
  let logger: LoggerService

  beforeEach(() => {
    // Create a fresh instance for each test instead of using singleton
    logger = new LoggerService()
    // Set log level without logging internal messages (by using private properties)
    const testLogger = logger as any
    testLogger.logLevel = 'info'
    testLogger.logHistory = []
    vi.clearAllMocks()
  })

  describe('basic logging methods', () => {
    it('should log debug messages', () => {
      (logger as any).logLevel = 'debug'
      logger.debug('Debug message')
      const history = getFilteredHistory(logger)
      expect(history.length).toBe(1)
      expect(history[0].message).toBe('Debug message')
      expect(history[0].level).toBe('debug')
    })

    it('should log info messages', () => {
      logger.info('Info message')
      const history = getFilteredHistory(logger)
      expect(history.length).toBe(1)
      expect(history[0].message).toBe('Info message')
      expect(history[0].level).toBe('info')
    })

    it('should log warn messages', () => {
      logger.warn('Warn message')
      const history = getFilteredHistory(logger)
      expect(history.length).toBe(1)
      expect(history[0].message).toBe('Warn message')
      expect(history[0].level).toBe('warn')
    })

    it('should log error messages', () => {
      logger.error('Error message')
      const history = getFilteredHistory(logger)
      expect(history.length).toBe(1)
      expect(history[0].message).toBe('Error message')
      expect(history[0].level).toBe('error')
    })
  })

  describe('log options', () => {
    it('should include category when provided', () => {
      logger.info('Test message', { category: 'test-category' })
      const history = getFilteredHistory(logger)
      expect(history[0].category).toBe('test-category')
    })

    it('should include metadata when provided', () => {
      const testMetadata = { key: 'value', id: 123 }
      logger.info('Test message', { metadata: testMetadata })
      const history = getFilteredHistory(logger)
      expect(history[0].metadata).toEqual(testMetadata)
    })

    it('should include both category and metadata', () => {
      const testMetadata = { key: 'value' }
      logger.info('Test message', { category: 'test', metadata: testMetadata })
      const history = getFilteredHistory(logger)
      expect(history[0].category).toBe('test')
      expect(history[0].metadata).toEqual(testMetadata)
    })
  })

  describe('log levels', () => {
    it('should only log messages at or above current level', () => {
      (logger as any).logLevel = 'warn'
      logger.debug('Debug should not appear')
      logger.info('Info should not appear')
      logger.warn('Warn should appear')
      logger.error('Error should appear')
      const history = getFilteredHistory(logger)
      expect(history.length).toBe(2)
    })

    it('should set and get log level', () => {
      logger.setLogLevel('debug')
      expect(logger.getLogLevel()).toBe('debug')
      logger.setLogLevel('error')
      expect(logger.getLogLevel()).toBe('error')
    })
  })

  describe('log history', () => {
    it('should retrieve log history', () => {
      logger.info('Test message 1')
      logger.info('Test message 2')
      const history = getFilteredHistory(logger)
      expect(history.length).toBe(2)
    })

    it('should clear log history', () => {
      logger.info('Test message')
      logger.clearLogHistory()
      const history = getFilteredHistory(logger)
      expect(history.length).toBe(0)
    })

    it('should get a copy of history (not reference)', () => {
      logger.info('Test message')
      const history1 = logger.getLogHistory()
      // Modify to test (since it's a shallow copy)
      history1[0] = { ...history1[0], message: 'Modified' }
      const history2 = logger.getLogHistory()
      expect(history2[0].message).toBe('Test message')
    })

    it('should respect max history size', () => {
      const testLogger = logger as any
      testLogger.maxHistorySize = 10
      for (let i = 0; i < 15; i++) {
        logger.info(`Test message ${i}`)
      }
      const history = getFilteredHistory(logger)
      expect(history.length).toBe(10)
    })

    it('should limit max history size to minimum 100 when setting too small', () => {
      logger.setMaxHistorySize(50)
      const testLogger = logger as any
      expect(testLogger.maxHistorySize).toBe(100)
    })
  })

  describe('log handlers', () => {
    it('should add and call log handlers', () => {
      const handler = vi.fn()
      logger.addLogHandler(handler)
      logger.info('Test message')
      expect(handler).toHaveBeenCalled()
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should remove log handlers', () => {
      const handler = vi.fn()
      logger.addLogHandler(handler)
      logger.removeLogHandler(handler)
      logger.info('Test message')
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('startTimer', () => {
    it('should create and call timer function', () => {
      const timer = logger.startTimer('Test Operation')
      expect(typeof timer).toBe('function')
      timer()
      const history = getFilteredHistory(logger)
      expect(history.some(entry => entry.message.includes('Test Operation 执行时间:'))).toBe(true)
    })

    it('should use specified category for timer', () => {
      const timer = logger.startTimer('Test Operation', 'custom-category')
      timer()
      const history = getFilteredHistory(logger)
      expect(history.some(entry => entry.category === 'custom-category')).toBe(true)
    })
  })

  describe('logBatch', () => {
    it('should log multiple messages in a batch', () => {
      logger.logBatch([
        { message: 'Batch message 1', level: 'info' },
        { message: 'Batch message 2', level: 'warn' },
        { message: 'Batch message 3', level: 'error' }
      ])
      const history = getFilteredHistory(logger)
      expect(history.length).toBe(3)
    })

    it('should default to info level when level not specified', () => {
      logger.logBatch([
        { message: 'Default level message' }
      ])
      const history = getFilteredHistory(logger)
      expect(history[0].level).toBe('info')
    })

    it('should include category in batch messages', () => {
      logger.logBatch([
        { message: 'Category test', category: 'batch-cat' }
      ])
      const history = getFilteredHistory(logger)
      expect(history[0].category).toBe('batch-cat')
    })
  })

  describe('console output', () => {
    it('should call console.debug for debug logs', () => {
      (logger as any).logLevel = 'debug'
      logger.debug('Debug message')
      expect(console.debug).toHaveBeenCalled()
    })

    it('should call console.info for info logs', () => {
      logger.info('Info message')
      expect(console.info).toHaveBeenCalled()
    })

    it('should call console.warn for warn logs', () => {
      logger.warn('Warn message')
      expect(console.warn).toHaveBeenCalled()
    })

    it('should call console.error for error logs', () => {
      logger.error('Error message')
      expect(console.error).toHaveBeenCalled()
    })
  })
})
