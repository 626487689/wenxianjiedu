import type { AppConfig } from '../../types/config'
import { logger } from '../logger/LoggerService'

const CONFIG_STORAGE_KEY = 'literature_interpreter_app_config'
const CONFIG_VERSION_KEY = 'literature_interpreter_config_version'
const CURRENT_CONFIG_VERSION = '1.0.0'

export const DEFAULT_APP_CONFIG: AppConfig = {
  model: {
    providerType: 'openai_compatible',
    endpoint: '',
    endpointMode: 'auto',
    modelName: '',
    timeoutMs: 60000,
  },
  batch: {
    concurrency: 1,
    retryCount: 0,
    skipExistingOutput: false,
  },
  chunk: {
    enabled: true,
    maxChunkSize: 6000,
    maxChunks: 15,
    overlapPages: 1,
  },
  outputFormat: 'default',
  apiKeySaved: false,
  lastInputPath: '',
  lastOutputPath: '',
  recursiveDefault: false,
}

export interface ConfigChangeEvent {
  key: keyof AppConfig | 'model' | 'batch' | 'chunk'
  oldValue: any
  newValue: any
  timestamp: number
}

export class ConfigManagerService {
  private config: AppConfig = DEFAULT_APP_CONFIG
  private listeners: Set<(event: ConfigChangeEvent) => void> = new Set()
  private initialized: boolean = false

  /**
   * 初始化配置
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // 加载配置
      await this.loadConfig()
      
      // 验证配置
      this.validateConfig()
      
      // 检查配置版本
      await this.checkConfigVersion()
      
      this.initialized = true
      logger.info('配置管理器初始化成功', { category: 'config' })
    } catch (error) {
      logger.error('配置管理器初始化失败', { 
        category: 'config',
        metadata: { error: error }
      })
      // 使用默认配置
      this.config = DEFAULT_APP_CONFIG
      await this.saveConfig()
    }
  }

  /**
   * 加载配置
   */
  private async loadConfig(): Promise<void> {
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
      if (!raw) {
        this.config = DEFAULT_APP_CONFIG
        return
      }

      const parsed = JSON.parse(raw) as Partial<AppConfig>
      this.config = {
        ...DEFAULT_APP_CONFIG,
        ...parsed,
        model: {
          ...DEFAULT_APP_CONFIG.model,
          ...(parsed.model ?? {}),
        },
        batch: {
          ...DEFAULT_APP_CONFIG.batch,
          ...(parsed.batch ?? {}),
        },
        chunk: {
          ...DEFAULT_APP_CONFIG.chunk,
          ...(parsed.chunk ?? {}),
        },
      }
      logger.info('配置加载成功', { category: 'config' })
    } catch (error) {
      logger.error('配置加载失败，使用默认配置', { 
        category: 'config',
        metadata: { error: error }
      })
      this.config = DEFAULT_APP_CONFIG
    }
  }

  /**
   * 保存配置
   */
  private async saveConfig(): Promise<void> {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config))
      localStorage.setItem(CONFIG_VERSION_KEY, CURRENT_CONFIG_VERSION)
      logger.info('配置保存成功', { category: 'config' })
    } catch (error) {
      logger.error('配置保存失败', { 
        category: 'config',
        metadata: { error: error }
      })
      throw error
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    // 验证模型配置
    if (!this.config.model) {
      this.config.model = DEFAULT_APP_CONFIG.model
    }

    if (!this.config.model.providerType) {
      this.config.model.providerType = DEFAULT_APP_CONFIG.model.providerType
    }

    if (!this.config.model.endpointMode) {
      this.config.model.endpointMode = DEFAULT_APP_CONFIG.model.endpointMode
    }

    if (!this.config.model.timeoutMs || this.config.model.timeoutMs <= 0) {
      this.config.model.timeoutMs = DEFAULT_APP_CONFIG.model.timeoutMs
    }

    // 验证批处理配置
    if (!this.config.batch) {
      this.config.batch = DEFAULT_APP_CONFIG.batch
    }

    if (!this.config.batch.concurrency || this.config.batch.concurrency <= 0) {
      this.config.batch.concurrency = DEFAULT_APP_CONFIG.batch.concurrency
    }

    if (!this.config.batch.retryCount || this.config.batch.retryCount < 0) {
      this.config.batch.retryCount = DEFAULT_APP_CONFIG.batch.retryCount
    }

    // 验证输出格式
    if (!this.config.outputFormat) {
      this.config.outputFormat = DEFAULT_APP_CONFIG.outputFormat
    }

    // 验证分块配置
    if (!this.config.chunk) {
      this.config.chunk = DEFAULT_APP_CONFIG.chunk
    }

    if (typeof this.config.chunk.enabled !== 'boolean') {
      this.config.chunk.enabled = DEFAULT_APP_CONFIG.chunk.enabled
    }

    if (!this.config.chunk.maxChunkSize || this.config.chunk.maxChunkSize <= 0) {
      this.config.chunk.maxChunkSize = DEFAULT_APP_CONFIG.chunk.maxChunkSize
    }

    if (!this.config.chunk.maxChunks || this.config.chunk.maxChunks <= 0) {
      this.config.chunk.maxChunks = DEFAULT_APP_CONFIG.chunk.maxChunks
    }

    if (this.config.chunk.overlapPages === undefined || this.config.chunk.overlapPages < 0) {
      this.config.chunk.overlapPages = DEFAULT_APP_CONFIG.chunk.overlapPages
    }

    logger.info('配置验证成功', { category: 'config' })
  }

  /**
   * 检查配置版本
   */
  private async checkConfigVersion(): Promise<void> {
    try {
      const storedVersion = localStorage.getItem(CONFIG_VERSION_KEY)
      if (storedVersion !== CURRENT_CONFIG_VERSION) {
        logger.info(`配置版本升级: ${storedVersion} -> ${CURRENT_CONFIG_VERSION}`, { category: 'config' })
        // 这里可以添加版本迁移逻辑
        await this.saveConfig()
      }
    } catch (error) {
      logger.error('配置版本检查失败', { 
        category: 'config',
        metadata: { error: error }
      })
    }
  }

  /**
   * 获取配置
   */
  async getConfig(): Promise<AppConfig> {
    if (!this.initialized) {
      await this.initialize()
    }
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    const oldConfig = { ...this.config }

    // 更新配置
    this.config = {
      ...this.config,
      ...updates,
      model: {
        ...this.config.model,
        ...(updates.model ?? {}),
      },
      batch: {
        ...this.config.batch,
        ...(updates.batch ?? {}),
      },
      chunk: {
        ...this.config.chunk,
        ...(updates.chunk ?? {}),
      },
    }

    // 验证配置
    this.validateConfig()

    // 保存配置
    await this.saveConfig()

    // 触发配置变更事件
    this.emitConfigChangeEvents(oldConfig, this.config)
  }

  /**
   * 重置配置
   */
  async resetConfig(): Promise<void> {
    const oldConfig = { ...this.config }
    this.config = DEFAULT_APP_CONFIG
    await this.saveConfig()
    this.emitConfigChangeEvents(oldConfig, this.config)
    logger.info('配置已重置为默认值', { category: 'config' })
  }

  /**
   * 导出配置
   */
  async exportConfig(): Promise<string> {
    if (!this.initialized) {
      await this.initialize()
    }
    const exportData = {
      version: CURRENT_CONFIG_VERSION,
      config: this.config,
      exportedAt: new Date().toISOString(),
    }
    return JSON.stringify(exportData, null, 2)
  }

  /**
   * 导入配置
   */
  async importConfig(configJson: string): Promise<void> {
    try {
      const importData = JSON.parse(configJson)
      if (!importData.config) {
        throw new Error('无效的配置数据')
      }

      const oldConfig = { ...this.config }
      this.config = {
        ...DEFAULT_APP_CONFIG,
        ...importData.config,
        model: {
          ...DEFAULT_APP_CONFIG.model,
          ...(importData.config.model ?? {}),
        },
        batch: {
          ...DEFAULT_APP_CONFIG.batch,
          ...(importData.config.batch ?? {}),
        },
        chunk: {
          ...DEFAULT_APP_CONFIG.chunk,
          ...(importData.config.chunk ?? {}),
        },
      }

      // 验证配置
      this.validateConfig()

      // 保存配置
      await this.saveConfig()

      // 触发配置变更事件
      this.emitConfigChangeEvents(oldConfig, this.config)
      logger.info('配置导入成功', { category: 'config' })
    } catch (error) {
      logger.error('配置导入失败', { 
        category: 'config',
        metadata: { error: error }
      })
      throw error
    }
  }

  /**
   * 添加配置变更监听器
   */
  addConfigChangeListener(listener: (event: ConfigChangeEvent) => void): void {
    this.listeners.add(listener)
    logger.info('配置变更监听器已添加', { category: 'config' })
  }

  /**
   * 移除配置变更监听器
   */
  removeConfigChangeListener(listener: (event: ConfigChangeEvent) => void): void {
    this.listeners.delete(listener)
    logger.info('配置变更监听器已移除', { category: 'config' })
  }

  /**
   * 触发配置变更事件
   */
  private emitConfigChangeEvents(oldConfig: AppConfig, newConfig: AppConfig): void {
    const timestamp = Date.now()

    // 检查顶层配置变更
    Object.keys(newConfig).forEach((key) => {
      const typedKey = key as keyof AppConfig
      if (typedKey === 'model' || typedKey === 'batch' || typedKey === 'chunk') {
        // 检查嵌套配置变更
        Object.keys(newConfig[typedKey]!).forEach((nestedKey) => {
          const typedNestedKey = nestedKey as keyof typeof newConfig[keyof AppConfig]
          if (JSON.stringify(oldConfig[typedKey]![typedNestedKey]) !== JSON.stringify(newConfig[typedKey]![typedNestedKey])) {
            const event: ConfigChangeEvent = {
              key: typedKey,
              oldValue: oldConfig[typedKey]![typedNestedKey],
              newValue: newConfig[typedKey]![typedNestedKey],
              timestamp,
            }
            this.listeners.forEach(listener => {
              try {
                listener(event)
              } catch (error) {
                logger.error('配置变更监听器执行失败', { 
                  category: 'config',
                  metadata: { error: error }
                })
              }
            })
          }
        })
      } else if (JSON.stringify(oldConfig[typedKey]) !== JSON.stringify(newConfig[typedKey])) {
        const event: ConfigChangeEvent = {
          key: typedKey,
          oldValue: oldConfig[typedKey],
          newValue: newConfig[typedKey],
          timestamp,
        }
        this.listeners.forEach(listener => {
          try {
            listener(event)
          } catch (error) {
            logger.error('配置变更监听器执行失败', { 
              category: 'config',
              metadata: { error: error }
            })
          }
        })
      }
    })
  }

  /**
   * 获取配置版本
   */
  getConfigVersion(): string {
    return CURRENT_CONFIG_VERSION
  }

  /**
   * 检查配置是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized
  }
}

// 创建单例实例
export const configManagerService = new ConfigManagerService()
