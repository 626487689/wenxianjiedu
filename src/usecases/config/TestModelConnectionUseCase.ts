import type { CredentialRepository } from '../../repositories/credential/CredentialRepository'
import type { ModelConfig } from '../../types/config'
import { ModelClientFactory } from '../../services/llm/ModelClientFactory'
import { normalizeOpenAIEndpoint } from '../../utils/endpoint'
import { isNonEmpty, isValidUrl } from '../../utils/validate'

export interface TestModelConnectionInput {
  modelConfig: ModelConfig
  runtimeApiKey?: string
}

export interface TestModelConnectionResult {
  normalizedEndpoint: string
  preview: string
}

const TEST_PROMPT = '请只回复“连接成功”。'

export class TestModelConnectionUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepository,
    private readonly modelClientFactory: typeof ModelClientFactory,
  ) {}

  async execute(input: TestModelConnectionInput): Promise<TestModelConnectionResult> {
    const normalizedEndpoint = normalizeOpenAIEndpoint(
      input.modelConfig.endpoint,
      input.modelConfig.endpointMode,
    )
    const modelName = input.modelConfig.modelName.trim()

    if (!isNonEmpty(normalizedEndpoint)) {
      throw new Error('Endpoint URL 不能为空')
    }

    if (!isValidUrl(normalizedEndpoint)) {
      throw new Error('Endpoint URL 格式无效')
    }

    if (!isNonEmpty(modelName)) {
      throw new Error('Model Name 不能为空')
    }

    if (!Number.isFinite(input.modelConfig.timeoutMs) || input.modelConfig.timeoutMs <= 0) {
      throw new Error('Timeout 必须为正整数')
    }

    const runtimeApiKey = input.runtimeApiKey?.trim() ?? ''
    const savedApiKey = runtimeApiKey ? '' : (await this.credentialRepository.loadApiKey())?.trim() ?? ''
    const apiKey = runtimeApiKey || savedApiKey

    if (!apiKey) {
      throw new Error('未找到可用的 API Key')
    }

    const llmClient = this.modelClientFactory.createClient(input.modelConfig.providerType)
    const result = await llmClient.generate({
      endpoint: normalizedEndpoint,
      endpointMode: input.modelConfig.endpointMode,
      modelName,
      apiKey,
      prompt: TEST_PROMPT,
      timeoutMs: input.modelConfig.timeoutMs,
      temperature: input.modelConfig.temperature,
      maxTokens: input.modelConfig.maxTokens,
    })

    return {
      normalizedEndpoint,
      preview: summarizePreview(result.content),
    }
  }
}

function summarizePreview(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) {
    return '模型已返回成功响应，但内容为空。'
  }

  return trimmed.length > 120 ? `${trimmed.slice(0, 120)}...` : trimmed
}
