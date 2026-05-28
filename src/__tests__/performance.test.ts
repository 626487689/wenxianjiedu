import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SmartChunkingService } from '../services/chunking/SmartChunkingService'
import { chunkCacheService } from '../services/chunking/ChunkCacheService'
import { performanceMonitor } from '../services/monitoring/PerformanceMonitorService'

// 生成测试文本
function generateTestText(length: number): string {
  let text = ''
  for (let i = 0; i < length; i++) {
    text += '这是一个测试句子，用于测试分块功能。 '
  }
  return text
}

describe('性能测试', () => {
  beforeEach(() => {
    // 清除缓存
    chunkCacheService.clear()
    // 清除性能监控数据
    performanceMonitor.clearMetrics()
  })

  afterEach(() => {
    // 清除所有模拟
    vi.clearAllMocks()
  })

  describe('分块处理性能', () => {
    it('应该快速处理短文本', () => {
      const smartChunkingService = new SmartChunkingService()
      const shortText = '这是一个短文本，用于测试分块性能。'
      
      const startTime = performance.now()
      const chunks = smartChunkingService.chunkByMaxTokens(shortText, 100)
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(chunks.length).toBe(1)
      expect(duration).toBeLessThan(100) // 应该在100ms内完成
    })

    it('应该高效处理长文本', () => {
      const smartChunkingService = new SmartChunkingService()
      const longText = generateTestText(100) // 生成约100个句子的长文本
      
      const startTime = performance.now()
      const chunks = smartChunkingService.chunkByMaxTokens(longText, 100)
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(chunks.length).toBeGreaterThan(1)
      expect(duration).toBeLessThan(500) // 应该在500ms内完成
    })
  })

  describe('缓存性能', () => {
    it('应该快速从缓存中获取结果', () => {
      const testText = '这是一个测试文本，用于测试缓存性能。'
      const modelName = 'gpt-4o'
      const testResult = '这是缓存的结果。'
      
      // 设置缓存
      chunkCacheService.set(testText, modelName, testResult, 10)
      
      const startTime = performance.now()
      const cachedResult = chunkCacheService.get(testText, modelName)
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(cachedResult).toBe(testResult)
      expect(duration).toBeLessThan(10) // 应该在10ms内完成
    })

    it('应该高效存储缓存结果', () => {
      const testText = '这是一个测试文本，用于测试缓存存储性能。'
      const modelName = 'gpt-4o'
      const testResult = '这是缓存的结果。'
      
      const startTime = performance.now()
      chunkCacheService.set(testText, modelName, testResult, 10)
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(chunkCacheService.has(testText, modelName)).toBe(true)
      expect(duration).toBeLessThan(10) // 应该在10ms内完成
    })
  })

  describe('性能监控性能', () => {
    it('应该高效记录性能指标', () => {
      const startTime = performance.now()
      const operationId = performanceMonitor.start('test_operation', 'test_category', { test: 'metadata' })
      performanceMonitor.end(operationId)
      const endTime = performance.now()
      const duration = endTime - startTime
      
      const metrics = performanceMonitor.getMetrics('test_category')
      expect(metrics.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(10) // 应该在10ms内完成
    })

    it('应该高效获取性能报告', () => {
      // 记录一些性能指标
      for (let i = 0; i < 10; i++) {
        const operationId = performanceMonitor.start(`test_operation_${i}`, 'test_category')
        performanceMonitor.end(operationId)
      }
      
      const startTime = performance.now()
      const report = performanceMonitor.getPerformanceReport()
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(report.metrics.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(10) // 应该在10ms内完成
    })
  })

  describe('Token计算性能', () => {
    it('应该快速计算token数', () => {
      const smartChunkingService = new SmartChunkingService()
      const testText = generateTestText(50) // 生成约50个句子的文本
      
      const startTime = performance.now()
      const tokenCount = smartChunkingService.calculateTotalTokens(testText)
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(tokenCount).toBeGreaterThan(0)
      expect(duration).toBeLessThan(10) // 应该在10ms内完成
    })
  })
})
