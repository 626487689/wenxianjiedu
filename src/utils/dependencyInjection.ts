import { logger } from '../services/logger/LoggerService'

export interface ServiceProvider {
  get<T>(service: string): T
  register<T>(service: string, factory: () => T): void
  registerSingleton<T>(service: string, factory: () => T): void
  registerAsync<T>(service: string, factory: () => Promise<T>): void
  registerSingletonAsync<T>(service: string, factory: () => Promise<T>): void
  has(service: string): boolean
  clear(): void
}

export class DependencyContainer implements ServiceProvider {
  private services: Map<string, { factory: () => any; singleton: boolean; instance: any | null; async: boolean; promise: Promise<any> | null }> = new Map()

  /**
   * 注册一个服务
   */
  register<T>(service: string, factory: () => T): void {
    this.services.set(service, {
      factory,
      singleton: false,
      instance: null,
      async: false,
      promise: null
    })
    logger.info(`Service registered: ${service} (transient)`, { category: 'di' })
  }

  /**
   * 注册一个单例服务
   */
  registerSingleton<T>(service: string, factory: () => T): void {
    this.services.set(service, {
      factory,
      singleton: true,
      instance: null,
      async: false,
      promise: null
    })
    logger.info(`Service registered: ${service} (singleton)`, { category: 'di' })
  }

  /**
   * 注册一个异步服务
   */
  registerAsync<T>(service: string, factory: () => Promise<T>): void {
    this.services.set(service, {
      factory,
      singleton: false,
      instance: null,
      async: true,
      promise: null
    })
    logger.info(`Service registered: ${service} (async transient)`, { category: 'di' })
  }

  /**
   * 注册一个异步单例服务
   */
  registerSingletonAsync<T>(service: string, factory: () => Promise<T>): void {
    this.services.set(service, {
      factory,
      singleton: true,
      instance: null,
      async: true,
      promise: null
    })
    logger.info(`Service registered: ${service} (async singleton)`, { category: 'di' })
  }

  /**
   * 获取一个服务
   */
  get<T>(service: string): T {
    const serviceDef = this.services.get(service)
    if (!serviceDef) {
      throw new Error(`Service not found: ${service}`)
    }

    if (serviceDef.async) {
      throw new Error(`Cannot get async service synchronously: ${service}. Use getAsync() instead.`)
    }

    if (serviceDef.singleton) {
      if (!serviceDef.instance) {
        serviceDef.instance = serviceDef.factory()
        logger.info(`Singleton service instantiated: ${service}`, { category: 'di' })
      }
      return serviceDef.instance as T
    } else {
      const instance = serviceDef.factory()
      logger.info(`Transient service instantiated: ${service}`, { category: 'di' })
      return instance as T
    }
  }

  /**
   * 异步获取一个服务
   */
  async getAsync<T>(service: string): Promise<T> {
    const serviceDef = this.services.get(service)
    if (!serviceDef) {
      throw new Error(`Service not found: ${service}`)
    }

    if (serviceDef.singleton) {
      if (serviceDef.instance) {
        return serviceDef.instance as T
      }
      if (serviceDef.promise) {
        return serviceDef.promise as Promise<T>
      }
      const promise = serviceDef.factory() as Promise<T>
      serviceDef.promise = promise
      try {
        const instance = await promise
        serviceDef.instance = instance
        serviceDef.promise = null
        logger.info(`Async singleton service instantiated: ${service}`, { category: 'di' })
        return instance
      } catch (error) {
        serviceDef.promise = null
        throw error
      }
    } else {
      const instance = await serviceDef.factory() as T
      logger.info(`Async transient service instantiated: ${service}`, { category: 'di' })
      return instance
    }
  }

  /**
   * 检查服务是否存在
   */
  has(service: string): boolean {
    return this.services.has(service)
  }

  /**
   * 清除所有服务
   */
  clear(): void {
    this.services.clear()
    logger.info('All services cleared', { category: 'di' })
  }

  /**
   * 获取所有服务名称
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys())
  }
}

// 创建全局依赖注入容器
export const container = new DependencyContainer()
