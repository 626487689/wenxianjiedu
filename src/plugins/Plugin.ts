import type { AppConfig } from '../types/config'
import type { SourceFileRef } from '../types/file'
import type { JobState } from '../types/task'

/**
 * 插件元数据
 */
export interface PluginMetadata {
  id: string
  name: string
  version: string
  description: string
  author: string
  homepage?: string
  dependencies?: string[]
  enabled: boolean
  settings?: Record<string, any>
}

/**
 * 插件上下文
 */
export interface PluginContext {
  config: AppConfig
  logger: { 
    info: (message: string, metadata?: Record<string, any>) => void
    warn: (message: string, metadata?: Record<string, any>) => void
    error: (message: string, metadata?: Record<string, any>) => void
  }
  // 可以添加其他上下文信息
}

/**
 * 插件接口
 */
export interface Plugin {
  /**
   * 获取插件元数据
   */
  getMetadata(): PluginMetadata

  /**
   * 初始化插件
   */
  initialize(context: PluginContext): Promise<void>

  /**
   * 销毁插件
   */
  destroy(): Promise<void>

  /**
   * 处理文档解析前的事件
   */
  onDocumentBeforeParse?(file: SourceFileRef): Promise<void>

  /**
   * 处理文档解析后的事件
   */
  onDocumentAfterParse?(file: SourceFileRef, content: string): Promise<string>

  /**
   * 处理模型调用前的事件
   */
  onModelBeforeCall?(prompt: string, modelConfig: any): Promise<string>

  /**
   * 处理模型调用后的事件
   */
  onModelAfterCall?(response: string, modelConfig: any): Promise<string>

  /**
   * 处理批处理开始前的事件
   */
  onBatchBeforeStart?(files: SourceFileRef[]): Promise<void>

  /**
   * 处理批处理完成后的事件
   */
  onBatchAfterComplete?(jobState: JobState): Promise<void>

  /**
   * 处理配置变更事件
   */
  onConfigChange?(oldConfig: AppConfig, newConfig: AppConfig): Promise<void>

  /**
   * 获取插件设置
   */
  getSettings(): Record<string, any>

  /**
   * 更新插件设置
   */
  updateSettings(settings: Record<string, any>): Promise<void>
}
