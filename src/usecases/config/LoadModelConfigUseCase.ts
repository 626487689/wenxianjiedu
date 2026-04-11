import type { ConfigRepository } from '../../repositories/config/ConfigRepository'

export class LoadModelConfigUseCase {
  constructor(private readonly configRepository: ConfigRepository) {}

  async execute() {
    return this.configRepository.loadAppConfig()
  }
}
