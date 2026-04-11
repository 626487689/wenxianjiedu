import type { AppConfig } from '../../types/config'

export interface ConfigRepository {
  loadAppConfig(): Promise<AppConfig>
  saveAppConfig(config: AppConfig): Promise<void>
  resetAppConfig(): Promise<void>
}
