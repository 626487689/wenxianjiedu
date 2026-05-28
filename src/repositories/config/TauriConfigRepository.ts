import type { AppConfig } from '../../types/config'
import type { ConfigRepository } from './ConfigRepository'
import { configManagerService } from '../../services/config/ConfigManagerService'

export class TauriConfigRepository implements ConfigRepository {
  async loadAppConfig(): Promise<AppConfig> {
    return configManagerService.getConfig()
  }

  async saveAppConfig(config: AppConfig): Promise<void> {
    await configManagerService.updateConfig(config)
  }

  async resetAppConfig(): Promise<void> {
    await configManagerService.resetConfig()
  }

  async exportConfig(): Promise<string> {
    return configManagerService.exportConfig()
  }

  async importConfig(configJson: string): Promise<void> {
    await configManagerService.importConfig(configJson)
  }

  addConfigChangeListener(listener: (event: any) => void): void {
    configManagerService.addConfigChangeListener(listener)
  }

  removeConfigChangeListener(listener: (event: any) => void): void {
    configManagerService.removeConfigChangeListener(listener)
  }
}

