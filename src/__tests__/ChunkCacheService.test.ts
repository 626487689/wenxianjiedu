import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChunkCacheService } from '../services/chunking/ChunkCacheService'
import { logger } from '../services/logger/LoggerService'

describe('ChunkCacheService', () => {
  let service: ChunkCacheService
  const originalNow = Date.now
  let mockNow: number

  beforeEach(() => {
    service = new ChunkCacheService()
    mockNow = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => mockNow)
    vi.spyOn(logger, 'info').mockImplementation(() => {})
    vi.spyOn(logger, 'warn').mockImplementation(() => {})
    vi.spyOn(logger, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Date.now = originalNow
  })

  describe('has', () => {
    it('should return false for non-existent cache', () => {
      expect(service.has('test text', 'gpt-4o')).toBe(false)
    })

    it('should return true for existing cache', () => {
      service.set('test text', 'gpt-4o', 'result', 10)
      expect(service.has('test text', 'gpt-4o')).toBe(true)
    })

    it('should return false for expired cache', () => {
      service.set('test text', 'gpt-4o', 'result', 10)
      mockNow += 25 * 60 * 60 * 1000 // 超过24小时TTL
      expect(service.has('test text', 'gpt-4o')).toBe(false)
    })

    it('should differentiate between models', () => {
      service.set('test text', 'gpt-4o', 'result', 10)
      expect(service.has('test text', 'gpt-3.5-turbo')).toBe(false)
    })
  })

  describe('get', () => {
    it('should return null for non-existent cache', () => {
      expect(service.get('test text', 'gpt-4o')).toBe(null)
    })

    it('should return cached result', () => {
      service.set('test text', 'gpt-4o', 'cached result', 10)
      expect(service.get('test text', 'gpt-4o')).toBe('cached result')
    })

    it('should return null for expired cache', () => {
      service.set('test text', 'gpt-4o', 'result', 10)
      mockNow += 25 * 60 * 60 * 1000 // 超过24小时TTL
      expect(service.get('test text', 'gpt-4o')).toBe(null)
    })

    it('should update access count on get', () => {
      service.set('test text', 'gpt-4o', 'result', 10)
      service.get('test text', 'gpt-4o')
      const stats = service.getStats()
      expect(stats.statistics.hits).toBe(1)
    })
  })

  describe('set', () => {
    it('should store cache entry', () => {
      service.set('test text', 'gpt-4o', 'result', 10)
      expect(service.has('test text', 'gpt-4o')).toBe(true)
    })

    it('should evict oldest entries when cache is full', () => {
      // 填充缓存到最大容量
      for (let i = 0; i < 100; i++) {
        mockNow += 1000 // 每次设置增加1秒
        service.set(`text ${i}`, 'gpt-4o', `result ${i}`, 10)
      }
      
      // 添加第101个条目，应该触发淘汰
      mockNow += 1000
      service.set('new text', 'gpt-4o', 'new result', 10)
      
      // 最旧的条目应该被淘汰
      expect(service.has('text 0', 'gpt-4o')).toBe(false)
    })

    it('should handle memory threshold exceeded', () => {
      // 模拟内存超过阈值的情况 - 设置较小的内存阈值
      const originalThreshold = (service as any).memoryThreshold
      ;(service as any).memoryThreshold = 100 // 设置很小的阈值
      
      for (let i = 0; i < 10; i++) {
        const largeText = 'a'.repeat(1000)
        service.set(largeText, 'gpt-4o', 'result', 1000)
      }
      
      const stats = service.getStats()
      expect(stats.statistics.evictions).toBeGreaterThan(0)
      
      // 恢复原始阈值
      ;(service as any).memoryThreshold = originalThreshold
    })
  })

  describe('clear', () => {
    it('should clear all cache entries', () => {
      service.set('text1', 'gpt-4o', 'result1', 10)
      service.set('text2', 'gpt-4o', 'result2', 10)
      service.clear()
      expect(service.getStats().size).toBe(0)
    })

    it('should reset statistics', () => {
      service.set('text1', 'gpt-4o', 'result1', 10)
      service.get('text1', 'gpt-4o')
      service.clear()
      const stats = service.getStats()
      expect(stats.statistics.hits).toBe(0)
      expect(stats.statistics.misses).toBe(0)
    })
  })

  describe('clearByModel', () => {
    it('should clear only specified model entries', () => {
      service.set('text1', 'gpt-4o', 'result1', 10)
      service.set('text2', 'gpt-3.5-turbo', 'result2', 10)
      service.clearByModel('gpt-4o')
      expect(service.has('text1', 'gpt-4o')).toBe(false)
      expect(service.has('text2', 'gpt-3.5-turbo')).toBe(true)
    })
  })

  describe('getStats', () => {
    it('should return correct cache statistics', () => {
      const stats = service.getStats()
      expect(stats.size).toBe(0)
      expect(stats.maxSize).toBe(100)
      expect(stats.ttl).toBe(24 * 60 * 60 * 1000)
    })

    it('should update statistics on cache operations', () => {
      service.set('text1', 'gpt-4o', 'result1', 10)
      service.get('text1', 'gpt-4o') // hit
      service.get('text2', 'gpt-4o') // miss
      
      const stats = service.getStats()
      expect(stats.statistics.hits).toBe(1)
      expect(stats.statistics.misses).toBe(1)
      expect(stats.statistics.hitRate).toBe(0.5)
    })
  })

  describe('warmup', () => {
    it('should populate cache with provided entries', () => {
      service.warmup(
        ['text1', 'text2'],
        'gpt-4o',
        ['result1', 'result2'],
        [10, 20]
      )
      expect(service.has('text1', 'gpt-4o')).toBe(true)
      expect(service.has('text2', 'gpt-4o')).toBe(true)
    })

    it('should handle mismatched array lengths', () => {
      service.warmup(
        ['text1'],
        'gpt-4o',
        ['result1', 'result2'], // 长度不匹配
        [10]
      )
      // 应该记录错误但不崩溃
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('cleanupExpired', () => {
    it('should remove expired entries', () => {
      service.set('text1', 'gpt-4o', 'result1', 10)
      mockNow += 25 * 60 * 60 * 1000 // 超过24小时TTL
      service.cleanupExpired()
      expect(service.has('text1', 'gpt-4o')).toBe(false)
    })

    it('should keep non-expired entries', () => {
      service.set('text1', 'gpt-4o', 'result1', 10)
      mockNow += 12 * 60 * 60 * 1000 // 12小时，未过期
      service.cleanupExpired()
      expect(service.has('text1', 'gpt-4o')).toBe(true)
    })
  })

  describe('setMaxCacheSize', () => {
    it('should update max cache size', () => {
      service.setMaxCacheSize(50)
      const stats = service.getStats()
      expect(stats.maxSize).toBe(50)
    })

    it('should enforce minimum size of 10', () => {
      service.setMaxCacheSize(5)
      const stats = service.getStats()
      expect(stats.maxSize).toBe(10)
    })

    it('should evict entries if size exceeds new max', () => {
      // 填充50个条目
      for (let i = 0; i < 50; i++) {
        mockNow += 1000
        service.set(`text ${i}`, 'gpt-4o', `result ${i}`, 10)
      }
      
      // 设置最大为40，应该淘汰旧条目直到达到新限制
      service.setMaxCacheSize(40)
      const stats = service.getStats()
      expect(stats.size).toBeLessThanOrEqual(40)
      expect(stats.statistics.evictions).toBeGreaterThan(0)
    })
  })

  describe('setCacheTTL', () => {
    it('should update cache TTL', () => {
      service.setCacheTTL(2 * 60 * 60 * 1000) // 2小时
      const stats = service.getStats()
      expect(stats.ttl).toBe(2 * 60 * 60 * 1000)
    })

    it('should enforce minimum TTL of 1 minute', () => {
      service.setCacheTTL(30 * 1000) // 30秒
      const stats = service.getStats()
      expect(stats.ttl).toBe(60 * 1000) // 应该是1分钟
    })
  })
})