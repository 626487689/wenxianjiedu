import type { LLMClient } from './LLMClient'
import { OpenAICompatibleClient } from './OpenAICompatibleClient'
import { MockLLMClient } from './MockLLMClient'
import { ChunkedLLMClient } from './ChunkedLLMClient'
import type { ModelProviderType, ChunkConfig } from '../../types/config'

export class ModelClientFactory {
  static createClient(providerType: ModelProviderType, chunkConfig?: ChunkConfig): LLMClient {
    let baseClient: LLMClient

    switch (providerType) {
      case 'openai_compatible':
      case 'anthropic':
      case 'google':
        baseClient = new OpenAICompatibleClient()
        break
      case 'local':
        baseClient = new MockLLMClient()
        break
      default:
        throw new Error(`Unsupported model provider: ${providerType}`)
    }

    if (chunkConfig?.enabled && providerType !== 'local') {
      return new ChunkedLLMClient(baseClient)
    }

    return baseClient
  }
}
