import { normalizeOpenAIEndpoint } from '../utils/endpoint'
import { describe, it, expect } from 'vitest'

describe('endpoint utilities', () => {
  describe('normalizeOpenAIEndpoint', () => {
    it('should return empty string for empty input', () => {
      expect(normalizeOpenAIEndpoint('')).toBe('')
      expect(normalizeOpenAIEndpoint('   ')).toBe('')
    })

    it('should return trimmed input in manual mode', () => {
      expect(normalizeOpenAIEndpoint('  https://api.example.com  ', 'manual')).toBe('https://api.example.com')
      expect(normalizeOpenAIEndpoint('test', 'manual')).toBe('test')
    })

    it('should handle invalid URLs gracefully', () => {
      expect(normalizeOpenAIEndpoint('not-a-url')).toBe('not-a-url')
    })

    it('should normalize root path', () => {
      expect(normalizeOpenAIEndpoint('https://api.openai.com')).toBe('https://api.openai.com/v1/chat/completions')
      expect(normalizeOpenAIEndpoint('https://api.openai.com/')).toBe('https://api.openai.com/v1/chat/completions')
    })

    it('should normalize v1 path', () => {
      expect(normalizeOpenAIEndpoint('https://api.openai.com/v1')).toBe('https://api.openai.com/v1/chat/completions')
      expect(normalizeOpenAIEndpoint('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1/chat/completions')
    })

    it('should keep chat/completions path', () => {
      expect(normalizeOpenAIEndpoint('https://api.openai.com/v1/chat/completions')).toBe('https://api.openai.com/v1/chat/completions')
      expect(normalizeOpenAIEndpoint('https://api.openai.com/v1/CHAT/completions')).toBe('https://api.openai.com/v1/CHAT/completions')
    })

    it('should keep completions path', () => {
      expect(normalizeOpenAIEndpoint('https://api.openai.com/v1/completions')).toBe('https://api.openai.com/v1/completions')
      expect(normalizeOpenAIEndpoint('https://api.openai.com/v1/COMPLETIONS')).toBe('https://api.openai.com/v1/COMPLETIONS')
    })

    it('should append chat/completions to custom paths', () => {
      expect(normalizeOpenAIEndpoint('https://api.example.com/v2')).toBe('https://api.example.com/v2/chat/completions')
      expect(normalizeOpenAIEndpoint('https://api.example.com/custom/path')).toBe('https://api.example.com/custom/path/chat/completions')
    })
  })
})
