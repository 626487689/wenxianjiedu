import type { AppConfig } from '../../types/config'
import type { ConfigChangeEvent } from '../../services/config/ConfigManagerService'

export interface ConfigRepository {
  loadAppConfig(): Promise<AppConfig>
  saveAppConfig(config: AppConfig): Promise<void>
  resetAppConfig(): Promise<void>
  exportConfig(): Promise<string>
  importConfig(configJson: string): Promise<void>
  addConfigChangeListener(listener: (event: ConfigChangeEvent) => void): void
  removeConfigChangeListener(listener: (event: ConfigChangeEvent) => void): void
}
