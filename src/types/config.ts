export type ModelProviderType = 'openai_compatible'

export type EndpointMode = 'auto' | 'manual'

export interface ModelConfig {
  providerType: ModelProviderType
  endpoint: string
  endpointMode: EndpointMode
  modelName: string
  timeoutMs: number
  temperature?: number
  maxTokens?: number
}

export interface BatchConfig {
  concurrency: number
  retryCount: number
  skipExistingOutput: boolean
}

export interface AppConfig {
  model: ModelConfig
  batch: BatchConfig
  apiKeySaved: boolean
  lastInputPath?: string
  lastOutputPath?: string
  recursiveDefault: boolean
}
