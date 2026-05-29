export type ModelProviderType = 'openai_compatible' | 'anthropic' | 'google' | 'local'

export type EndpointMode = 'auto' | 'manual'

export interface ModelConfig {
  providerType: ModelProviderType
  endpoint: string
  endpointMode: EndpointMode
  modelName: string
  timeoutMs: number
  temperature?: number
  maxTokens?: number
  apiKey?: string
}

export interface BatchConfig {
  concurrency: number
  retryCount: number
  skipExistingOutput: boolean
}

export interface ChunkConfig {
  enabled: boolean
  maxChunkSize: number
  maxChunks: number
  overlapPages: number
}

export type OutputFormat = 'default' | 'obsidian'

export interface AppConfig {
  model: ModelConfig
  batch: BatchConfig
  chunk: ChunkConfig
  outputFormat: OutputFormat
  apiKeySaved: boolean
  lastInputPath?: string
  lastOutputPath?: string
  recursiveDefault: boolean
}

// Multi-model support
export interface MultiModelEntry {
  id: string
  name: string
  config: ModelConfig
  enabled: boolean
  priority: number // lower = higher priority
}

export interface MultiModelConfig {
  models: MultiModelEntry[]
  activeModelId: string | null
}
