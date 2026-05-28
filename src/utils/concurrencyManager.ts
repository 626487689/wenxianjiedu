import { logger } from '../services/logger/LoggerService'

export interface Task<T> {
  id: string
  priority: number
  execute: () => Promise<T>
  onStart?: () => void
  onComplete?: (result: T) => void
  onError?: (error: Error) => void
}

export class ConcurrencyManager<T> {
  private maxConcurrency: number
  private running: number = 0
  private queue: Task<T>[] = []
  private processing: boolean = false
  private cancelled: boolean = false

  constructor(maxConcurrency: number = 2) {
    this.maxConcurrency = Math.max(1, maxConcurrency)
  }

  /**
   * 添加任务到队列
   */
  addTask(task: Task<T>): void {
    if (this.cancelled) {
      logger.warn('并发管理器已取消，无法添加新任务')
      return
    }

    this.queue.push(task)
    // 按优先级排序，优先级高的先执行
    this.queue.sort((a, b) => b.priority - a.priority)
    logger.info(`任务已添加到队列，当前队列长度: ${this.queue.length}, 优先级: ${task.priority}`)
    this.processQueue()
  }

  /**
   * 处理队列中的任务
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.running >= this.maxConcurrency || this.queue.length === 0 || this.cancelled) {
      return
    }

    this.processing = true

    while (this.running < this.maxConcurrency && this.queue.length > 0 && !this.cancelled) {
      const task = this.queue.shift()
      if (!task) break

      this.running++
      logger.info(`开始执行任务 ${task.id}，当前并发数: ${this.running}`)

      try {
        task.onStart?.()
        const result = await task.execute()
        task.onComplete?.(result)
        logger.info(`任务 ${task.id} 执行成功`)
      } catch (error) {
        logger.error(`任务 ${task.id} 执行失败: ${error}`)
        task.onError?.(error as Error)
      } finally {
        this.running--
        logger.info(`任务 ${task.id} 执行完成，当前并发数: ${this.running}`)
      }
    }

    this.processing = false

    // 如果队列中还有任务，继续处理
    if (this.queue.length > 0 && !this.cancelled) {
      this.processQueue()
    }
  }

  /**
   * 取消所有任务
   */
  cancel(): void {
    this.cancelled = true
    this.queue = []
    logger.info('并发管理器已取消，所有待处理任务已清除')
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    running: number
    queueLength: number
    maxConcurrency: number
    cancelled: boolean
  } {
    return {
      running: this.running,
      queueLength: this.queue.length,
      maxConcurrency: this.maxConcurrency,
      cancelled: this.cancelled
    }
  }

  /**
   * 设置最大并发数
   */
  setMaxConcurrency(maxConcurrency: number): void {
    this.maxConcurrency = Math.max(1, maxConcurrency)
    logger.info(`最大并发数已设置为 ${this.maxConcurrency}`)
    this.processQueue()
  }
}
