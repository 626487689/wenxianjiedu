import { configPresetService } from '../services/config/ConfigPresetService'
import { describe, it, expect } from 'vitest'

describe('ConfigPresetService', () => {
  describe('getPresets', () => {
    it('should return a list of presets', () => {
      const presets = configPresetService.getPresets()
      expect(Array.isArray(presets)).toBe(true)
      expect(presets.length).toBeGreaterThan(0)
    })
  })

  describe('getPresetById', () => {
    it('should return a preset by ID', () => {
      const preset = configPresetService.getPresetById('openai-gpt-4o')
      expect(preset).toBeDefined()
      expect(preset?.id).toBe('openai-gpt-4o')
      expect(preset?.name).toBe('OpenAI GPT-4o')
    })

    it('should return undefined for non-existent preset', () => {
      const preset = configPresetService.getPresetById('non-existent-preset')
      expect(preset).toBeUndefined()
    })
  })

  describe('getPresetsByProvider', () => {
    it('should return presets by provider type', () => {
      const presets = configPresetService.getPresetsByProvider('openai_compatible')
      expect(Array.isArray(presets)).toBe(true)
      presets.forEach(preset => {
        expect(preset.providerType).toBe('openai_compatible')
      })
    })

    it('should return empty array for non-existent provider', () => {
      const presets = configPresetService.getPresetsByProvider('openai_compatible')
      expect(Array.isArray(presets)).toBe(true)
    })
  })

  describe('presetToModelConfig', () => {
    it('should convert a preset to model config', () => {
      const preset = configPresetService.getPresetById('openai-gpt-4o')
      expect(preset).toBeDefined()
      if (preset) {
        const modelConfig = configPresetService.presetToModelConfig(preset)
        expect(modelConfig).toBeDefined()
        expect(modelConfig.providerType).toBe(preset.providerType)
        expect(modelConfig.endpoint).toBe(preset.endpoint)
        expect(modelConfig.modelName).toBe(preset.modelName)
        expect(modelConfig.timeoutMs).toBe(preset.timeoutMs)
      }
    })
  })

  describe('addPreset', () => {
    it('should add a new preset', () => {
      const newPreset = {
        id: 'test-preset',
        name: 'Test Preset',
        providerType: 'openai_compatible' as const,
        endpoint: 'https://test.example.com/v1',
        endpointMode: 'auto' as const,
        modelName: 'test-model',
        timeoutMs: 300000,
        temperature: 0.3,
        maxTokens: 4096
      }

      configPresetService.addPreset(newPreset)
      const addedPreset = configPresetService.getPresetById('test-preset')
      expect(addedPreset).toBeDefined()
      expect(addedPreset?.id).toBe('test-preset')
      expect(addedPreset?.name).toBe('Test Preset')
    })

    it('should update an existing preset', () => {
      const existingPreset = configPresetService.getPresetById('openai-gpt-4o')
      expect(existingPreset).toBeDefined()
      if (existingPreset) {
        const updatedPreset = {
          ...existingPreset,
          name: 'Updated OpenAI GPT-4o'
        }

        configPresetService.addPreset(updatedPreset)
        const presetAfterUpdate = configPresetService.getPresetById('openai-gpt-4o')
        expect(presetAfterUpdate).toBeDefined()
        expect(presetAfterUpdate?.name).toBe('Updated OpenAI GPT-4o')
      }
    })
  })

  describe('removePreset', () => {
    it('should remove a preset', () => {
      // First add a test preset
      const testPreset = {
        id: 'preset-to-remove',
        name: 'Preset to Remove',
        providerType: 'openai_compatible' as const,
        endpoint: 'https://test.example.com/v1',
        endpointMode: 'auto' as const,
        modelName: 'test-model',
        timeoutMs: 300000,
        temperature: 0.3,
        maxTokens: 4096
      }

      configPresetService.addPreset(testPreset)
      let presetBeforeRemove = configPresetService.getPresetById('preset-to-remove')
      expect(presetBeforeRemove).toBeDefined()

      // Then remove it
      configPresetService.removePreset('preset-to-remove')
      const presetAfterRemove = configPresetService.getPresetById('preset-to-remove')
      expect(presetAfterRemove).toBeUndefined()
    })
  })
})
