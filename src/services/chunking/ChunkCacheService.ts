import { logger } from '../logger/LoggerService'

interface ChunkCacheEntry {
  text: string
  modelName: string
  result: string
  timestamp: number
  lastAccess: number
  tokenCount: number
  accessCount: number
}

interface CacheStatistics {
  hits: number
  misses: number
  hitRate: number
  evictions: number
  totalAccesses: number
  averageAccessTime: number
  memoryUsage: number
}

export class ChunkCacheService {
  private cache: Map<string, ChunkCacheEntry> = new Map()
  private maxCacheSize = 100 // 最大缓存条目数
  private cacheTTL = 24 * 60 * 60 * 1000 // 缓存过期时间（1天）
  private statistics: CacheStatistics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    evictions: 0,
    totalAccesses: 0,
    averageAccessTime: 0,
    memoryUsage: 0
  }
  private lastAccessTime: number = 0
  private memoryThreshold = 10 * 1024 * 1024 // 10MB内存阈值

  /**
   * 生成分块的缓存键
   */
  private generateCacheKey(text: string, modelName: string): string {
    // 使用文本的哈希值和模型名称作为缓存键
    const textHash = this.hashText(text)
    return `${modelName}:${textHash}`
  }

  /**
   * 计算文本的哈希值
   */
  private hashText(text: string): string {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString(36)
  }

  /**
   * 检查分块是否在缓存中
   */
  has(text: string, modelName: string): boolean {
    const startTime = Date.now()
    const key = this.generateCacheKey(text, modelName)
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.updateStatistics(false, startTime)
      return false
    }

    // 检查缓存是否过期
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key)
      this.statistics.evictions++
      this.updateStatistics(false, startTime)
      return false
    }

    // 更新访问时间和访问次数（LRU策略）
    entry.lastAccess = Date.now()
    entry.accessCount++
    this.updateStatistics(true, startTime)
    return true
  }

  /**
   * 从缓存中获取分块的处理结果
   */
  get(text: string, modelName: string): string | null {
    const startTime = Date.now()
    const key = this.generateCacheKey(text, modelName)
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.updateStatistics(false, startTime)
      return null
    }

    // 检查缓存是否过期
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key)
      this.statistics.evictions++
      this.updateStatistics(false, startTime)
      return null
    }

    // 更新访问时间和访问次数（LRU策略）
    entry.lastAccess = Date.now()
    entry.accessCount++
    
    logger.info(`从缓存中获取分块结果，token数: ${entry.tokenCount}, 访问次数: ${entry.accessCount}`)
    this.updateStatistics(true, startTime)
    return entry.result
  }

  /**
   * 将分块的处理结果存入缓存
   */
  set(text: string, modelName: string, result: string, tokenCount: number): void {
    const key = this.generateCacheKey(text, modelName)
    
    // 检查缓存大小，如果超过最大值，删除最旧的条目
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldestEntries()
    }

    // 检查内存使用情况
    this.updateMemoryUsage()
    if (this.statistics.memoryUsage > this.memoryThreshold) {
      logger.warn(`缓存内存使用超过阈值，清理缓存`)
      this.evictOldestEntries(Math.floor(this.cache.size * 0.2)) // 清理20%的缓存
    }

    this.cache.set(key, {
      text,
      modelName,
      result,
      timestamp: Date.now(),
      lastAccess: Date.now(),
      tokenCount,
      accessCount: 1
    })

    // 更新内存使用
    this.updateMemoryUsage()
    logger.info(`分块结果已缓存，token数: ${tokenCount}, 当前缓存大小: ${this.cache.size}, 内存使用: ${(this.statistics.memoryUsage / (1024 * 1024)).toFixed(2)}MB`)
  }

  /**
   * 更新缓存统计信息
   */
  private updateStatistics(hit: boolean, startTime: number): void {
    const accessTime = Date.now() - startTime
    this.statistics.totalAccesses++
    
    if (hit) {
      this.statistics.hits++
    } else {
      this.statistics.misses++
    }
    
    this.statistics.hitRate = this.statistics.totalAccesses > 0 
      ? this.statistics.hits / this.statistics.totalAccesses 
      : 0
    
    // 更新平均访问时间
    this.statistics.averageAccessTime = (
      this.statistics.averageAccessTime * (this.statistics.totalAccesses - 1) + accessTime
    ) / this.statistics.totalAccesses
  }

  /**
   * 更新内存使用情况
   */
  private updateMemoryUsage(): void {
    let memoryUsage = 0
    for (const entry of this.cache.values()) {
      // 估算内存使用：每个字符2字节，加上其他字段的开销
      memoryUsage += entry.text.length * 2
      memoryUsage += entry.result.length * 2
      memoryUsage += entry.modelName.length * 2
      memoryUsage += 8 * 4 // 4个数字字段，每个8字节
    }
    this.statistics.memoryUsage = memoryUsage
  }

  /**
   * 删除最旧的缓存条目
   */
  private evictOldestEntries(count?: number): void {
    // 按最后访问时间排序，删除最久未使用的条目（LRU策略）
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess)
    
    const evictCount = count || Math.max(1, Math.floor(this.cache.size * 0.1))
    for (let i = 0; i < evictCount && i < entries.length; i++) {
      const [key] = entries[i]
      this.cache.delete(key)
      this.statistics.evictions++
    }

    logger.info(`已删除 ${evictCount} 个最旧的缓存条目`)
    this.updateMemoryUsage()
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    // 重置统计信息
    this.statistics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
      totalAccesses: 0,
      averageAccessTime: 0,
      memoryUsage: 0
    }
    logger.info(`已清除所有 ${size} 个缓存条目`)
  }

  /**
   * 清除指定模型的缓存
   */
  clearByModel(modelName: string): void {
    let count = 0
    for (const [key, entry] of this.cache.entries()) {
      if (entry.modelName === modelName) {
        this.cache.delete(key)
        count++
        this.statistics.evictions++
      }
    }
    this.updateMemoryUsage()
    logger.info(`已清除模型 ${modelName} 的 ${count} 个缓存条目`)
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number
    maxSize: number
    ttl: number
    statistics: CacheStatistics
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      ttl: this.cacheTTL,
      statistics: this.statistics
    }
  }

  /**
   * 缓存预热
   */
  warmup(texts: string[], modelName: string, results: string[], tokenCounts: number[]): void {
    if (texts.length !== results.length || texts.length !== tokenCounts.length) {
      logger.error('缓存预热参数长度不匹配')
      return
    }

    for (let i = 0; i < texts.length; i++) {
      this.set(texts[i], modelName, results[i], tokenCounts[i])
    }

    logger.info(`已预热 ${texts.length} 个缓存条目`)
  }

  /**
   * 定期清理过期缓存
   */
  cleanupExpired(): void {
    let count = 0
    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() - entry.timestamp > this.cacheTTL) {
        this.cache.delete(key)
        count++
        this.statistics.evictions++
      }
    }
    if (count > 0) {
      this.updateMemoryUsage()
      logger.info(`已清理 ${count} 个过期缓存条目`)
    }
  }

  /**
   * 设置缓存大小
   */
  setMaxCacheSize(size: number): void {
    this.maxCacheSize = Math.max(10, size)
    // 如果当前缓存大小超过新的最大值，删除最旧的条目
    while (this.cache.size > this.maxCacheSize) {
      this.evictOldestEntries()
    }
    logger.info(`缓存最大大小已设置为 ${this.maxCacheSize}`)
  }

  /**
   * 设置缓存过期时间
   */
  setCacheTTL(ttl: number): void {
    this.cacheTTL = Math.max(60 * 1000, ttl) // 最小1分钟
    logger.info(`缓存过期时间已设置为 ${this.cacheTTL}ms`)
  }
}

export const chunkCacheService = new ChunkCacheService()
