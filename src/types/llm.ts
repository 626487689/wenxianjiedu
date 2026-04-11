export interface ModelRequest {
  endpoint: string
  endpointMode?: 'auto' | 'manual'
  modelName: string
  apiKey: string
  prompt: string
  timeoutMs: number
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export interface ModelUsage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

export interface ModelResponse {
  content: string
  usage?: ModelUsage
}
