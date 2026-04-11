import type { AppConfig } from '../../types/config'
import type { ConfigRepository } from './ConfigRepository'

const CONFIG_STORAGE_KEY = 'literature_interpreter_app_config'

const DEFAULT_APP_CONFIG: AppConfig = {
  model: {
    providerType: 'openai_compatible',
    endpoint: '',
    endpointMode: 'auto',
    modelName: '',
    timeoutMs: 60000,
  },
  batch: {
    concurrency: 1,
    retryCount: 0,
    skipExistingOutput: false,
  },
  apiKeySaved: false,
  lastInputPath: '',
  lastOutputPath: '',
  recursiveDefault: false,
}

export class TauriConfigRepository implements ConfigRepository {
  async loadAppConfig(): Promise<AppConfig> {
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
      if (!raw) return DEFAULT_APP_CONFIG
      const parsed = JSON.parse(raw) as Partial<AppConfig>
      return {
        ...DEFAULT_APP_CONFIG,
        ...parsed,
        model: {
          ...DEFAULT_APP_CONFIG.model,
          ...(parsed.model ?? {}),
        },
        batch: {
          ...DEFAULT_APP_CONFIG.batch,
          ...(parsed.batch ?? {}),
        },
      }
    } catch {
      return DEFAULT_APP_CONFIG
    }
  }

  async saveAppConfig(config: AppConfig): Promise<void> {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  }

  async resetAppConfig(): Promise<void> {
    localStorage.removeItem(CONFIG_STORAGE_KEY)
  }
}
