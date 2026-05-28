import { logger } from '../logger/LoggerService'

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  category: string
  metadata?: Record<string, any>
}

interface PerformanceEntry {
  id: string
  name: string
  startTime: number
  endTime?: number
  duration?: number
  category: string
  metadata?: Record<string, any>
}

export class PerformanceMonitorService {
  private metrics: PerformanceMetric[] = []
  private activeEntries: Map<string, PerformanceEntry> = new Map()
  private maxMetrics = 1000
  private samplingInterval: NodeJS.Timeout | null = null
  private samplingEnabled = false

  /**
   * 开始监控一个操作
   */
  start(name: string, category: string = 'general', metadata?: Record<string, any>): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const entry: PerformanceEntry = {
      id,
      name,
      startTime: Date.now(),
      category,
      metadata
    }
    this.activeEntries.set(id, entry)
    return id
  }

  /**
   * 结束监控一个操作
   */
  end(id: string): PerformanceEntry | null {
    const entry = this.activeEntries.get(id)
    if (!entry) {
      logger.warn(`未找到性能监控条目: ${id}`, { category: 'performance' })
      return null
    }

    entry.endTime = Date.now()
    entry.duration = entry.endTime - entry.startTime
    this.activeEntries.delete(id)

    // 记录性能指标
    this.recordMetric({
      name: entry.name,
      value: entry.duration,
      unit: 'ms',
      timestamp: entry.endTime,
      category: entry.category,
      metadata: entry.metadata
    })

    // 记录日志
    logger.info(`${entry.name} 执行时间: ${entry.duration}ms`, {
      category: 'performance',
      metadata: {
        duration: entry.duration,
        name: entry.name,
        category: entry.category,
        ...entry.metadata
      }
    })

    return entry
  }

  /**
   * 记录性能指标
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(category?: string): PerformanceMetric[] {
    if (category) {
      return this.metrics.filter(metric => metric.category === category)
    }
    return [...this.metrics]
  }

  /**
   * 获取特定操作的平均执行时间
   */
  getAverageDuration(name: string): number {
    const metrics = this.metrics.filter(metric => 
      metric.name === name && metric.unit === 'ms'
    )
    if (metrics.length === 0) {
      return 0
    }
    const total = metrics.reduce((sum, metric) => sum + metric.value, 0)
    return total / metrics.length
  }

  /**
   * 清除所有性能指标
   */
  clearMetrics(): void {
    const count = this.metrics.length
    this.metrics = []
    logger.info(`已清除 ${count} 条性能指标`, { category: 'performance' })
  }

  /**
   * 开始采样系统性能
   */
  startSampling(intervalMs: number = 5000): void {
    if (this.samplingEnabled) {
      logger.warn('性能采样已经开始', { category: 'performance' })
      return
    }

    this.samplingEnabled = true
    this.samplingInterval = setInterval(() => {
      this.sampleSystemPerformance()
    }, intervalMs)

    logger.info(`开始性能采样，间隔: ${intervalMs}ms`, { category: 'performance' })
  }

  /**
   * 停止采样系统性能
   */
  stopSampling(): void {
    if (!this.samplingEnabled) {
      logger.warn('性能采样已经停止', { category: 'performance' })
      return
    }

    if (this.samplingInterval) {
      clearInterval(this.samplingInterval)
      this.samplingInterval = null
    }

    this.samplingEnabled = false
    logger.info('停止性能采样', { category: 'performance' })
  }

  /**
   * 采样系统性能
   */
  private sampleSystemPerformance(): void {
    // 采样内存使用情况
    if (typeof performance !== 'undefined') {
      // 检查performance.memory是否可用
      const memory = (performance as any).memory
      if (memory) {
        this.recordMetric({
          name: 'memory_used',
          value: memory.usedJSHeapSize / (1024 * 1024),
          unit: 'MB',
          timestamp: Date.now(),
          category: 'system',
          metadata: {
            total: memory.totalJSHeapSize / (1024 * 1024),
            limit: memory.jsHeapSizeLimit / (1024 * 1024)
          }
        })
      }
    }

    // 采样FPS
    if (typeof performance !== 'undefined' && typeof requestAnimationFrame !== 'undefined') {
      let lastTime = performance.now()
      let frameCount = 0

      const measureFPS = (timestamp: number) => {
        frameCount++
        if (timestamp - lastTime >= 1000) {
          const fps = frameCount
          this.recordMetric({
            name: 'fps',
            value: fps,
            unit: 'fps',
            timestamp: Date.now(),
            category: 'system'
          })
          frameCount = 0
          lastTime = timestamp
        }
      }

      requestAnimationFrame(measureFPS)
    }
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): {
    metrics: PerformanceMetric[]
    activeEntries: PerformanceEntry[]
    summary: {
      totalMetrics: number
      averageDurations: Record<string, number>
      memoryUsage?: {
        used: number
        total: number
        limit: number
      }
    }
  } {
    // 计算每个操作的平均执行时间
    const averageDurations: Record<string, number> = {}
    const operationNames = new Set(this.metrics.map(m => m.name))
    operationNames.forEach(name => {
      averageDurations[name] = this.getAverageDuration(name)
    })

    // 获取最新的内存使用情况
    let memoryUsage
    const memoryMetrics = this.metrics.filter(m => m.name === 'memory_used')
    if (memoryMetrics.length > 0) {
      const latestMemory = memoryMetrics[memoryMetrics.length - 1]
      memoryUsage = {
        used: latestMemory.value,
        total: latestMemory.metadata?.total || 0,
        limit: latestMemory.metadata?.limit || 0
      }
    }

    return {
      metrics: this.getMetrics(),
      activeEntries: Array.from(this.activeEntries.values()),
      summary: {
        totalMetrics: this.metrics.length,
        averageDurations,
        memoryUsage
      }
    }
  }
}

// 创建单例实例
export const performanceMonitor = new PerformanceMonitorService()
