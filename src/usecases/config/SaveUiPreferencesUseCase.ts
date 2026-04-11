import type { ConfigRepository } from '../../repositories/config/ConfigRepository'
import type { AppConfig } from '../../types/config'

export interface SaveUiPreferencesInput {
  lastInputPath?: string
  lastOutputPath?: string
  recursiveDefault?: boolean
  concurrency?: number
  retryCount?: number
  skipExistingOutput?: boolean
}

export class SaveUiPreferencesUseCase {
  constructor(private readonly configRepository: ConfigRepository) {}

  async execute(input: SaveUiPreferencesInput): Promise<AppConfig> {
    const current = await this.configRepository.loadAppConfig()
    const nextConfig: AppConfig = {
      ...current,
      lastInputPath: input.lastInputPath ?? current.lastInputPath ?? '',
      lastOutputPath: input.lastOutputPath ?? current.lastOutputPath ?? '',
      recursiveDefault: input.recursiveDefault ?? current.recursiveDefault,
      batch: {
        ...current.batch,
        concurrency: input.concurrency ?? current.batch.concurrency,
        retryCount: input.retryCount ?? current.batch.retryCount,
        skipExistingOutput: input.skipExistingOutput ?? current.batch.skipExistingOutput,
      },
    }

    await this.configRepository.saveAppConfig(nextConfig)
    return nextConfig
  }
}
