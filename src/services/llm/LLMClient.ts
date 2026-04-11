import type { ModelRequest, ModelResponse } from '../../types/llm'

export interface LLMClient {
  generate(req: ModelRequest): Promise<ModelResponse>
}
