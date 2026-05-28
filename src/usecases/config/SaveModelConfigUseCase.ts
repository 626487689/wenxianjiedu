import type { ConfigRepository } from '../../repositories/config/ConfigRepository'
import type { CredentialRepository } from '../../repositories/credential/CredentialRepository'
import type { AppConfig } from '../../types/config'
import { normalizeOpenAIEndpoint } from '../../utils/endpoint'
import { isNonEmpty, isValidUrl } from '../../utils/validate'

export interface SaveModelConfigInput {
  providerType: 'openai_compatible' | 'anthropic' | 'google' | 'local'
  endpoint: string
  endpointMode: 'auto' | 'manual'
  modelName: string
  apiKey?: string
  rememberApiKey: boolean
  timeoutMs: number
}

export class SaveModelConfigUseCase {
  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly credentialRepository: CredentialRepository,
  ) {}

  async execute(input: SaveModelConfigInput): Promise<void> {
    const endpoint = normalizeOpenAIEndpoint(input.endpoint, input.endpointMode)
    const modelName = input.modelName.trim()
    const apiKey = input.apiKey?.trim() ?? ''

    if (!isNonEmpty(endpoint)) {
      throw new Error('Endpoint URL 不能为空')
    }

    if (!isValidUrl(endpoint)) {
      throw new Error('Endpoint URL 格式无效')
    }

    if (!isNonEmpty(modelName)) {
      throw new Error('Model Name 不能为空')
    }

    if (!Number.isFinite(input.timeoutMs) || input.timeoutMs <= 0) {
      throw new Error('Timeout 必须为正整数')
    }

    if (input.rememberApiKey) {
      if (!isNonEmpty(apiKey)) {
        const hasSavedKey = await this.credentialRepository.hasApiKey()
        if (!hasSavedKey) {
          throw new Error('API Key 不能为空')
        }
      } else {
        await this.credentialRepository.saveApiKey(apiKey)
      }
    }

    const hasApiKey = await this.credentialRepository.hasApiKey()

    const current = await this.configRepository.loadAppConfig()
    const nextConfig: AppConfig = {
      ...current,
      model: {
        providerType: input.providerType,
        endpoint,
        endpointMode: input.endpointMode,
        modelName,
        timeoutMs: input.timeoutMs,
        temperature: current.model.temperature,
        maxTokens: current.model.maxTokens,
      },
      apiKeySaved: hasApiKey,
    }

    await this.configRepository.saveAppConfig(nextConfig)
  }
}
