import type { Plugin, PluginMetadata, PluginContext } from './Plugin'
import type { AppConfig } from '../types/config'
import type { SourceFileRef } from '../types/file'
import type { JobState } from '../types/task'
import { logger } from '../services/logger/LoggerService'
import { configManagerService } from '../services/config/ConfigManagerService'

const PLUGINS_STORAGE_KEY = 'literature_interpreter_plugins'

interface PluginInstance {
  plugin: Plugin
  metadata: PluginMetadata
  initialized: boolean
}

export class PluginManager {
  private plugins: Map<string, PluginInstance> = new Map()
  private context: PluginContext | null = null
  private initialized: boolean = false

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      const config = await configManagerService.getConfig()

      this.context = {
        config,
        logger: {
          info: (message: string, metadata?: Record<string, any>) => {
            logger.info(message, { category: 'plugin', ...metadata })
          },
          warn: (message: string, metadata?: Record<string, any>) => {
            logger.warn(message, { category: 'plugin', ...metadata })
          },
          error: (message: string, metadata?: Record<string, any>) => {
            logger.error(message, { category: 'plugin', ...metadata })
          }
        }
      }

      await this.loadPlugins()
      await this.initializeEnabledPlugins()

      configManagerService.addConfigChangeListener(async (event) => {
        await this.handleConfigChange(event.oldValue, event.newValue)
      })

      this.initialized = true
      logger.info('插件管理器初始化成功', { category: 'plugin' })
    } catch (error) {
      logger.error('插件管理器初始化失败', {
        category: 'plugin',
        metadata: { error: String(error) }
      })
    }
  }

  private async loadPlugins(): Promise<void> {
    try {
      const pluginsJson = localStorage.getItem(PLUGINS_STORAGE_KEY)
      if (!pluginsJson) {
        return
      }

      const pluginsData = JSON.parse(pluginsJson) as PluginMetadata[]
      for (const metadata of pluginsData) {
        try {
          const plugin = this.createMockPlugin(metadata)
          this.plugins.set(metadata.id, {
            plugin,
            metadata,
            initialized: false
          })
          logger.info(`插件已加载: ${metadata.name} (${metadata.id})`, { category: 'plugin' })
        } catch (error) {
          logger.error(`插件加载失败: ${metadata.id}`, {
            category: 'plugin',
            metadata: { error: String(error) }
          })
        }
      }
    } catch (error) {
      logger.error('插件加载失败', {
        category: 'plugin',
        metadata: { error: String(error) }
      })
    }
  }

  private async initializeEnabledPlugins(): Promise<void> {
    for (const [id, instance] of this.plugins.entries()) {
      if (instance.metadata.enabled && !instance.initialized) {
        try {
          if (!this.context) {
            throw new Error('插件上下文未初始化')
          }
          await instance.plugin.initialize(this.context)
          instance.initialized = true
          logger.info(`插件已初始化: ${instance.metadata.name} (${id})`, { category: 'plugin' })
        } catch (error) {
          logger.error(`插件初始化失败: ${instance.metadata.name} (${id})`, {
            category: 'plugin',
            metadata: { error: String(error) }
          })
        }
      }
    }
  }

  async registerPlugin(metadata: PluginMetadata, plugin: Plugin): Promise<void> {
    try {
      if (this.plugins.has(metadata.id)) {
        throw new Error(`插件已存在: ${metadata.id}`)
      }

      this.plugins.set(metadata.id, {
        plugin,
        metadata,
        initialized: false
      })

      await this.savePlugins()

      if (metadata.enabled) {
        if (!this.context) {
          throw new Error('插件上下文未初始化')
        }
        await plugin.initialize(this.context)
        this.plugins.get(metadata.id)!.initialized = true
        logger.info(`插件已注册并初始化: ${metadata.name} (${metadata.id})`, { category: 'plugin' })
      } else {
        logger.info(`插件已注册: ${metadata.name} (${metadata.id})`, { category: 'plugin' })
      }
    } catch (error) {
      logger.error(`插件注册失败: ${metadata.id}`, {
        category: 'plugin',
        metadata: { error: String(error) }
      })
      throw error
    }
  }

  async unregisterPlugin(pluginId: string): Promise<void> {
    try {
      const instance = this.plugins.get(pluginId)
      if (!instance) {
        throw new Error(`插件不存在: ${pluginId}`)
      }

      if (instance.initialized) {
        await instance.plugin.destroy()
      }

      this.plugins.delete(pluginId)
      await this.savePlugins()

      logger.info(`插件已卸载: ${instance.metadata.name} (${pluginId})`, { category: 'plugin' })
    } catch (error) {
      logger.error(`插件卸载失败: ${pluginId}`, {
        category: 'plugin',
        metadata: { error: String(error) }
      })
      throw error
    }
  }

  async enablePlugin(pluginId: string): Promise<void> {
    try {
      const instance = this.plugins.get(pluginId)
      if (!instance) {
        throw new Error(`插件不存在: ${pluginId}`)
      }

      if (instance.metadata.enabled) {
        return
      }

      instance.metadata.enabled = true
      await this.savePlugins()

      if (!instance.initialized) {
        if (!this.context) {
          throw new Error('插件上下文未初始化')
        }
        await instance.plugin.initialize(this.context)
        instance.initialized = true
      }

      logger.info(`插件已启用: ${instance.metadata.name} (${pluginId})`, { category: 'plugin' })
    } catch (error) {
      logger.error(`插件启用失败: ${pluginId}`, {
        category: 'plugin',
        metadata: { error: String(error) }
      })
      throw error
    }
  }

  async disablePlugin(pluginId: string): Promise<void> {
    try {
      const instance = this.plugins.get(pluginId)
      if (!instance) {
        throw new Error(`插件不存在: ${pluginId}`)
      }

      if (!instance.metadata.enabled) {
        return
      }

      instance.metadata.enabled = false
      await this.savePlugins()

      if (instance.initialized) {
        await instance.plugin.destroy()
        instance.initialized = false
      }

      logger.info(`插件已禁用: ${instance.metadata.name} (${pluginId})`, { category: 'plugin' })
    } catch (error) {
      logger.error(`插件禁用失败: ${pluginId}`, {
        category: 'plugin',
        metadata: { error: String(error) }
      })
      throw error
    }
  }

  getPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map(instance => instance.metadata)
  }

  getEnabledPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values())
      .filter(instance => instance.metadata.enabled)
      .map(instance => instance.metadata)
  }

  getPlugin(pluginId: string): Plugin | null {
    const instance = this.plugins.get(pluginId)
    return instance?.plugin || null
  }

  async emitDocumentBeforeParse(file: SourceFileRef): Promise<void> {
    for (const [id, instance] of this.plugins.entries()) {
      if (instance.metadata.enabled && instance.initialized && instance.plugin.onDocumentBeforeParse) {
        try {
          await instance.plugin.onDocumentBeforeParse(file)
        } catch (error) {
          logger.error(`插件事件处理失败: ${instance.metadata.name} (${id}) - onDocumentBeforeParse`, {
            category: 'plugin',
            metadata: { error: String(error) }
          })
        }
      }
    }
  }

  async emitDocumentAfterParse(file: SourceFileRef, content: string): Promise<string> {
    let processedContent = content
    for (const [id, instance] of this.plugins.entries()) {
      if (instance.metadata.enabled && instance.initialized && instance.plugin.onDocumentAfterParse) {
        try {
          processedContent = await instance.plugin.onDocumentAfterParse(file, processedContent)
        } catch (error) {
          logger.error(`插件事件处理失败: ${instance.metadata.name} (${id}) - onDocumentAfterParse`, {
            category: 'plugin',
            metadata: { error: String(error) }
          })
        }
      }
    }
    return processedContent
  }

  async emitModelBeforeCall(prompt: string, modelConfig: any): Promise<string> {
    let processedPrompt = prompt
    for (const [id, instance] of this.plugins.entries()) {
      if (instance.metadata.enabled && instance.initialized && instance.plugin.onModelBeforeCall) {
        try {
          processedPrompt = await instance.plugin.onModelBeforeCall(processedPrompt, modelConfig)
        } catch (error) {
          logger.error(`插件事件处理失败: ${instance.metadata.name} (${id}) - onModelBeforeCall`, {
            category: 'plugin',
            metadata: { error: String(error) }
          })
        }
      }
    }
    return processedPrompt
  }

  async emitModelAfterCall(response: string, modelConfig: any): Promise<string> {
    let processedResponse = response
    for (const [id, instance] of this.plugins.entries()) {
      if (instance.metadata.enabled && instance.initialized && instance.plugin.onModelAfterCall) {
        try {
          processedResponse = await instance.plugin.onModelAfterCall(processedResponse, modelConfig)
        } catch (error) {
          logger.error(`插件事件处理失败: ${instance.metadata.name} (${id}) - onModelAfterCall`, {
            category: 'plugin',
            metadata: { error: String(error) }
          })
        }
      }
    }
    return processedResponse
  }

  async emitBatchBeforeStart(files: SourceFileRef[]): Promise<void> {
    for (const [id, instance] of this.plugins.entries()) {
      if (instance.metadata.enabled && instance.initialized && instance.plugin.onBatchBeforeStart) {
        try {
          await instance.plugin.onBatchBeforeStart(files)
        } catch (error) {
          logger.error(`插件事件处理失败: ${instance.metadata.name} (${id}) - onBatchBeforeStart`, {
            category: 'plugin',
            metadata: { error: String(error) }
          })
        }
      }
    }
  }

  async emitBatchAfterComplete(jobState: JobState): Promise<void> {
    for (const [id, instance] of this.plugins.entries()) {
      if (instance.metadata.enabled && instance.initialized && instance.plugin.onBatchAfterComplete) {
        try {
          await instance.plugin.onBatchAfterComplete(jobState)
        } catch (error) {
          logger.error(`插件事件处理失败: ${instance.metadata.name} (${id}) - onBatchAfterComplete`, {
            category: 'plugin',
            metadata: { error: String(error) }
          })
        }
      }
    }
  }

  private async handleConfigChange(oldConfig: AppConfig, newConfig: AppConfig): Promise<void> {
    for (const [id, instance] of this.plugins.entries()) {
      if (instance.metadata.enabled && instance.initialized && instance.plugin.onConfigChange) {
        try {
          await instance.plugin.onConfigChange(oldConfig, newConfig)
        } catch (error) {
          logger.error(`插件事件处理失败: ${instance.metadata.name} (${id}) - onConfigChange`, {
            category: 'plugin',
            metadata: { error: String(error) }
          })
        }
      }
    }
  }

  private async savePlugins(): Promise<void> {
    try {
      const pluginsData = Array.from(this.plugins.values()).map(instance => instance.metadata)
      localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(pluginsData))
      logger.info('插件信息保存成功', { category: 'plugin' })
    } catch (error) {
      logger.error('插件信息保存失败', {
        category: 'plugin',
        metadata: { error: String(error) }
      })
      throw error
    }
  }

  private createMockPlugin(metadata: PluginMetadata): Plugin {
    return {
      getMetadata: () => metadata,
      initialize: async (context: PluginContext) => {
        context.logger.info(`插件初始化: ${metadata.name}`, { metadata: { pluginId: metadata.id } })
      },
      destroy: async () => {
        logger.info(`插件销毁: ${metadata.name}`, { metadata: { pluginId: metadata.id } })
      },
      getSettings: () => metadata.settings || {},
      updateSettings: async (settings: Record<string, any>) => {
        metadata.settings = settings
        await this.savePlugins()
      }
    }
  }

  async destroy(): Promise<void> {
    try {
      for (const [id, instance] of this.plugins.entries()) {
        if (instance.initialized) {
          try {
            await instance.plugin.destroy()
            logger.info(`插件已销毁: ${instance.metadata.name} (${id})`, { category: 'plugin' })
          } catch (error) {
            logger.error(`插件销毁失败: ${instance.metadata.name} (${id})`, {
              category: 'plugin',
              metadata: { error: String(error) }
            })
          }
        }
      }

      this.plugins.clear()
      this.initialized = false
      logger.info('插件管理器已销毁', { category: 'plugin' })
    } catch (error) {
      logger.error('插件管理器销毁失败', {
        category: 'plugin',
        metadata: { error: String(error) }
      })
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }
}

export const pluginManager = new PluginManager()
