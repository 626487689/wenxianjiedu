import { logger } from '../services/logger/LoggerService';

export class RequestThrottler {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private requestTimestamps: number[] = [];

  constructor(maxRequests: number = 5, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async throttle(): Promise<void> {
    // 清理过期的请求时间戳
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );

    logger.info(`当前请求数: ${this.requestTimestamps.length}, 限制: ${this.maxRequests}`);

    // 检查是否超过限制
    if (this.requestTimestamps.length >= this.maxRequests) {
      // 计算需要等待的时间
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = this.windowMs - (now - oldestTimestamp) + 100; // 加100ms缓冲
      
      logger.info(`请求数超过限制，需要等待 ${waitTime}ms`);
      
      // 等待直到可以发送下一个请求
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // 记录新的请求时间戳
    this.requestTimestamps.push(Date.now());
    logger.info(`添加新请求时间戳，当前请求数: ${this.requestTimestamps.length}`);
  }
}

// 创建全局节流器实例
export const globalThrottler = new RequestThrottler(5, 60000);