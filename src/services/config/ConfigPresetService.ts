import type { ModelConfig, ModelProviderType, EndpointMode } from '../../types/config'

export interface ConfigPreset {
  id: string
  name: string
  providerType: ModelProviderType
  endpoint: string
  endpointMode: EndpointMode
  modelName: string
  timeoutMs: number
  temperature: number
  maxTokens: number
}

export class ConfigPresetService {
  private presets: ConfigPreset[] = [
    {
      id: 'openai-gpt-4o',
      name: 'OpenAI GPT-4o',
      providerType: 'openai_compatible',
      endpoint: 'https://api.openai.com/v1',
      endpointMode: 'auto',
      modelName: 'gpt-4o',
      timeoutMs: 300000,
      temperature: 0.3,
      maxTokens: 4096
    },
    {
      id: 'openai-gpt-3.5-turbo',
      name: 'OpenAI GPT-3.5 Turbo',
      providerType: 'openai_compatible',
      endpoint: 'https://api.openai.com/v1',
      endpointMode: 'auto',
      modelName: 'gpt-3.5-turbo',
      timeoutMs: 300000,
      temperature: 0.3,
      maxTokens: 4096
    },
    {
      id: 'anthropic-claude-3-opus',
      name: 'Anthropic Claude 3 Opus',
      providerType: 'anthropic',
      endpoint: 'https://api.anthropic.com/v1',
      endpointMode: 'auto',
      modelName: 'claude-3-opus-20240229',
      timeoutMs: 300000,
      temperature: 0.3,
      maxTokens: 4096
    },
    {
      id: 'anthropic-claude-3-sonnet',
      name: 'Anthropic Claude 3 Sonnet',
      providerType: 'anthropic',
      endpoint: 'https://api.anthropic.com/v1',
      endpointMode: 'auto',
      modelName: 'claude-3-sonnet-20240229',
      timeoutMs: 300000,
      temperature: 0.3,
      maxTokens: 4096
    },
    {
      id: 'google-gemini-pro',
      name: 'Google Gemini Pro',
      providerType: 'google',
      endpoint: 'https://generativelanguage.googleapis.com/v1',
      endpointMode: 'auto',
      modelName: 'gemini-pro',
      timeoutMs: 300000,
      temperature: 0.3,
      maxTokens: 4096
    },
    {
      id: 'kimi-2.5',
      name: 'Kimi 2.5',
      providerType: 'openai_compatible',
      endpoint: 'https://api.moonshot.cn/v1',
      endpointMode: 'auto',
      modelName: 'moonshot-v1-8k',
      timeoutMs: 300000,
      temperature: 0.3,
      maxTokens: 4096
    },
    {
      id: 'deepseek-v3',
      name: 'DeepSeek V3',
      providerType: 'openai_compatible',
      endpoint: 'https://api.deepseek.com/v1',
      endpointMode: 'auto',
      modelName: 'deepseek-chat',
      timeoutMs: 300000,
      temperature: 0.3,
      maxTokens: 4096
    },
    {
      id: 'glm-4',
      name: 'GLM-4',
      providerType: 'openai_compatible',
      endpoint: 'https://open.bigmodel.cn/api/mega',
      endpointMode: 'auto',
      modelName: 'glm-4',
      timeoutMs: 300000,
      temperature: 0.3,
      maxTokens: 4096
    }
  ]

  /**
   * 获取所有配置预设
   */
  getPresets(): ConfigPreset[] {
    return this.presets
  }

  /**
   * 根据ID获取配置预设
   */
  getPresetById(id: string): ConfigPreset | undefined {
    return this.presets.find(preset => preset.id === id)
  }

  /**
   * 根据提供商类型获取配置预设
   */
  getPresetsByProvider(providerType: ModelProviderType): ConfigPreset[] {
    return this.presets.filter(preset => preset.providerType === providerType)
  }

  /**
   * 将预设转换为模型配置
   */
  presetToModelConfig(preset: ConfigPreset): Omit<ModelConfig, 'apiKey' | 'rememberApiKey'> {
    return {
      providerType: preset.providerType,
      endpoint: preset.endpoint,
      endpointMode: preset.endpointMode,
      modelName: preset.modelName,
      timeoutMs: preset.timeoutMs,
      temperature: preset.temperature,
      maxTokens: preset.maxTokens
    }
  }

  /**
   * 添加自定义配置预设
   */
  addPreset(preset: ConfigPreset): void {
    const existingIndex = this.presets.findIndex(p => p.id === preset.id)
    if (existingIndex >= 0) {
      this.presets[existingIndex] = preset
    } else {
      this.presets.push(preset)
    }
  }

  /**
   * 删除配置预设
   */
  removePreset(id: string): void {
    this.presets = this.presets.filter(preset => preset.id !== id)
  }
}

// 创建单例实例
export const configPresetService = new ConfigPresetService()
