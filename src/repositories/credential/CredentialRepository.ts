export interface CredentialRepository {
  hasApiKey(): Promise<boolean>
  loadApiKey(): Promise<string | null>
  saveApiKey(apiKey: string): Promise<void>
  clearApiKey(): Promise<void>
}
