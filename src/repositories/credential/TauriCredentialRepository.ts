import type { CredentialRepository } from './CredentialRepository'

/**
 * 开发期最小实现：先用 sessionStorage 支撑 runtimeApiKey 闭环验证。
 * 这不是最终安全方案，后续必须替换为系统安全存储。
 */
const API_KEY_STORAGE_KEY = 'literature_interpreter_dev_api_key'

export class TauriCredentialRepository implements CredentialRepository {
  async hasApiKey(): Promise<boolean> {
    return !!sessionStorage.getItem(API_KEY_STORAGE_KEY)
  }

  async loadApiKey(): Promise<string | null> {
    return sessionStorage.getItem(API_KEY_STORAGE_KEY)
  }

  async saveApiKey(apiKey: string): Promise<void> {
    if (!apiKey.trim()) {
      throw new Error('API key cannot be empty')
    }
    sessionStorage.setItem(API_KEY_STORAGE_KEY, apiKey)
  }

  async clearApiKey(): Promise<void> {
    sessionStorage.removeItem(API_KEY_STORAGE_KEY)
  }
}
