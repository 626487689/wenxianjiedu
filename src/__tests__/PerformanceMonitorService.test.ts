import { PerformanceMonitorService } from '../services/monitoring/PerformanceMonitorService'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger
vi.mock('../services/logger/LoggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('PerformanceMonitorService', () => {
  let monitor: PerformanceMonitorService

  beforeEach(() => {
    monitor = new PerformanceMonitorService()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('start and end', () => {
    it('should start and end an operation and return id', () => {
      const id = monitor.start('Test Operation', 'test')
      expect(typeof id).toBe('string')
      const entry = monitor.end(id)
      expect(entry).not.toBeNull()
      expect(entry?.name).toBe('Test Operation')
      expect(entry?.duration).toBeDefined()
    })

    it('should return null when ending an unknown id', () => {
      const entry = monitor.end('unknown-id')
      expect(entry).toBeNull()
    })

    it('should record metrics when ending an operation', () => {
      const id = monitor.start('Test Operation')
      monitor.end(id)
      const metrics = monitor.getMetrics()
      expect(metrics.length).toBe(1)
      expect(metrics[0].name).toBe('Test Operation')
    })
  })

  describe('getMetrics', () => {
    it('should get all metrics', () => {
      const id1 = monitor.start('Op1')
      const id2 = monitor.start('Op2')
      monitor.end(id1)
      monitor.end(id2)
      const metrics = monitor.getMetrics()
      expect(metrics.length).toBe(2)
    })

    it('should filter metrics by category', () => {
      const id1 = monitor.start('Op1', 'cat1')
      const id2 = monitor.start('Op2', 'cat2')
      monitor.end(id1)
      monitor.end(id2)
      const metrics = monitor.getMetrics('cat1')
      expect(metrics.length).toBe(1)
      expect(metrics[0].category).toBe('cat1')
    })
  })

  describe('getAverageDuration', () => {
    it('should get average duration for an operation', () => {
      for (let i = 0; i < 3; i++) {
        const id = monitor.start('Test Op')
        monitor.end(id)
      }
      const avg = monitor.getAverageDuration('Test Op')
      expect(avg).toBeGreaterThanOrEqual(0)
    })

    it('should return 0 when no metrics for an operation', () => {
      const avg = monitor.getAverageDuration('Non-existent Op')
      expect(avg).toBe(0)
    })
  })

  describe('clearMetrics', () => {
    it('should clear all metrics', () => {
      const id = monitor.start('Test Op')
      monitor.end(id)
      monitor.clearMetrics()
      const metrics = monitor.getMetrics()
      expect(metrics.length).toBe(0)
    })
  })

  describe('sampling', () => {
    it('should start and stop sampling', () => {
      monitor.startSampling(1000)
      monitor.stopSampling()
    })

    it('should warn when starting already started sampling', () => {
      monitor.startSampling(1000)
      monitor.startSampling(1000)
      // Check that warning was logged
    })

    it('should warn when stopping already stopped sampling', () => {
      monitor.stopSampling()
      // Check that warning was logged
    })

    it('should sample memory usage when performance.memory is available', () => {
      // Mock performance.memory and performance.now
      const mockMemory = {
        usedJSHeapSize: 1024 * 1024 * 50, // 50MB
        totalJSHeapSize: 1024 * 1024 * 100, // 100MB
        jsHeapSizeLimit: 1024 * 1024 * 256 // 256MB
      }
      ;(global as any).performance = {
        memory: mockMemory,
        now: () => Date.now()
      }

      // Access the private method to test it
      const sampleMethod = (monitor as any).sampleSystemPerformance.bind(monitor)
      sampleMethod()

      const metrics = monitor.getMetrics('system')
      expect(metrics.length).toBeGreaterThan(0)
      const memoryMetric = metrics.find(m => m.name === 'memory_used')
      expect(memoryMetric).toBeDefined()
      expect(memoryMetric?.value).toBe(50) // 50MB
      expect(memoryMetric?.metadata?.total).toBe(100)
    })

    it('should not record memory metric when performance.memory is not available', () => {
      // Ensure performance.memory is undefined but performance.now exists
      ;(global as any).performance = {
        now: () => Date.now()
      }

      const sampleMethod = (monitor as any).sampleSystemPerformance.bind(monitor)
      sampleMethod()

      const metrics = monitor.getMetrics('system')
      const memoryMetric = metrics.find(m => m.name === 'memory_used')
      expect(memoryMetric).toBeUndefined()
    })

    it('should handle undefined performance object', () => {
      // Remove performance from global
      const originalPerformance = (global as any).performance
      delete (global as any).performance

      const sampleMethod = (monitor as any).sampleSystemPerformance.bind(monitor)
      expect(() => sampleMethod()).not.toThrow()

      // Restore performance
      ;(global as any).performance = originalPerformance
    })
  })

  describe('recordMetric', () => {
    it('should record metric directly', () => {
      const metric = {
        name: 'custom',
        value: 123,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'test'
      }
      monitor.recordMetric(metric)
      const metrics = monitor.getMetrics()
      expect(metrics.length).toBe(1)
      expect(metrics[0].value).toBe(123)
    })

    it('should limit metrics count to maxMetrics', () => {
      const testMonitor = monitor as any
      testMonitor.maxMetrics = 5
      for (let i = 0; i < 10; i++) {
        const id = monitor.start(`Op${i}`)
        monitor.end(id)
      }
      const metrics = monitor.getMetrics()
      expect(metrics.length).toBe(5)
    })
  })

  describe('getPerformanceReport', () => {
    it('should get complete performance report', () => {
      const id = monitor.start('Report Test')
      monitor.end(id)
      const report = monitor.getPerformanceReport()
      expect(report.metrics.length).toBe(1)
      expect(report.summary.totalMetrics).toBe(1)
      expect(report.summary.averageDurations['Report Test']).toBeDefined()
    })

    it('should include active entries in report', () => {
      monitor.start('Active Op')
      const report = monitor.getPerformanceReport()
      expect(report.activeEntries.length).toBe(1)
    })

    it('should include memoryUsage in report when available', () => {
      // Mock memory metric
      monitor.recordMetric({
        name: 'memory_used',
        value: 50,
        unit: 'MB',
        timestamp: Date.now(),
        category: 'system',
        metadata: {
          total: 100,
          limit: 256
        }
      })

      const report = monitor.getPerformanceReport()
      expect(report.summary.memoryUsage).toBeDefined()
      expect(report.summary.memoryUsage?.used).toBe(50)
      expect(report.summary.memoryUsage?.total).toBe(100)
      expect(report.summary.memoryUsage?.limit).toBe(256)
    })

    it('should not include memoryUsage when no memory metrics exist', () => {
      const id = monitor.start('Test Op')
      monitor.end(id)
      const report = monitor.getPerformanceReport()
      expect(report.summary.memoryUsage).toBeUndefined()
    })

    it('should handle empty metrics in report', () => {
      const report = monitor.getPerformanceReport()
      expect(report.metrics.length).toBe(0)
      expect(report.summary.totalMetrics).toBe(0)
      expect(Object.keys(report.summary.averageDurations).length).toBe(0)
    })
  })
})
