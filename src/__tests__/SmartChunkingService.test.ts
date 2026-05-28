import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SmartChunkingService } from '../services/chunking/SmartChunkingService'

describe('SmartChunkingService', () => {
  let service: SmartChunkingService

  beforeEach(() => {
    service = new SmartChunkingService()
  })

  describe('chunkByMaxTokens', () => {
    it('should return empty chunk for empty text', () => {
      const result = service.chunkByMaxTokens('', 1000)
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('')
      expect(result[0].isFirst).toBe(true)
      expect(result[0].isLast).toBe(true)
    })

    it('should return single chunk for short text', () => {
      const text = 'This is a short text.'
      const result = service.chunkByMaxTokens(text, 1000)
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe(text.trim())
      expect(result[0].isFirst).toBe(true)
      expect(result[0].isLast).toBe(true)
    })

    it('should split long text into multiple chunks', () => {
      const longText = 'This is a '.repeat(1000)
      const result = service.chunkByMaxTokens(longText, 100)
      expect(result.length).toBeGreaterThan(1)
    })

    it('should mark first and last chunks correctly', () => {
      const longText = 'This is a '.repeat(500)
      const result = service.chunkByMaxTokens(longText, 100)
      expect(result[0].isFirst).toBe(true)
      expect(result[result.length - 1].isLast).toBe(true)
      expect(result[1]?.isFirst).toBeUndefined()
      expect(result[1]?.isLast).toBeUndefined()
    })

    it('should handle markdown section boundaries', () => {
      const text = `# Chapter 1\n\nThis is chapter 1 content.\n\n## Section 1.1\n\nThis is section content.\n\n## Section 1.2\n\nMore content.`
      const result = service.chunkByMaxTokens(text, 50)
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle sentence boundaries', () => {
      const text = 'Hello world! How are you today? I hope you are doing well.'
      const result = service.chunkByMaxTokens(text, 10)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle model-specific token limits', () => {
      const text = 'This is a test text.'
      const result = service.chunkByMaxTokens(text, 1000, 'gpt-4o')
      expect(result).toHaveLength(1)
    })
  })

  describe('calculateTotalTokens', () => {
    it('should calculate tokens for simple text', () => {
      const text = 'Hello world'
      const tokens = service.calculateTotalTokens(text)
      expect(tokens).toBeGreaterThan(0)
    })

    it('should return 0 for empty text', () => {
      const tokens = service.calculateTotalTokens('')
      expect(tokens).toBe(0)
    })
  })

  describe('getDefaultMaxTokens', () => {
    it('should return correct tokens for gpt-4o', () => {
      expect(service.getDefaultMaxTokens('gpt-4o')).toBe(128000)
    })

    it('should return correct tokens for gpt-3.5-turbo', () => {
      expect(service.getDefaultMaxTokens('gpt-3.5-turbo')).toBe(16384)
    })

    it('should return correct tokens for claude-3-opus', () => {
      expect(service.getDefaultMaxTokens('claude-3-opus-20240229')).toBe(200000)
    })

    it('should return default for unknown model', () => {
      expect(service.getDefaultMaxTokens('unknown-model')).toBe(8192)
    })

    it('should be case-insensitive', () => {
      expect(service.getDefaultMaxTokens('GPT-4O')).toBe(128000)
    })
  })

  describe('getModelAdjustedMaxTokens', () => {
    it('should use provided maxTokens if positive', () => {
      expect(service.getModelAdjustedMaxTokens('gpt-4o', 2000)).toBe(2000)
    })

    it('should return default for undefined model', () => {
      expect(service.getModelAdjustedMaxTokens(undefined, undefined)).toBe(8192)
    })

    it('should return larger chunks for large models', () => {
      expect(service.getModelAdjustedMaxTokens('gpt-4o')).toBe(4096)
      expect(service.getModelAdjustedMaxTokens('gemini-1.5-pro')).toBe(4096)
      expect(service.getModelAdjustedMaxTokens('claude-3-sonnet-20240229')).toBe(4096)
    })

    it('should return medium chunks for medium models', () => {
      expect(service.getModelAdjustedMaxTokens('gpt-4')).toBe(2048)
      expect(service.getModelAdjustedMaxTokens('kimi-2.5')).toBe(2048)
    })

    it('should return small chunks for small models', () => {
      expect(service.getModelAdjustedMaxTokens('gpt-3.5-turbo')).toBe(1024)
    })

    it('should handle unknown models', () => {
      expect(service.getModelAdjustedMaxTokens('unknown-model')).toBe(1024)
    })
  })

  describe('calculateChunkCount', () => {
    it('should return 1 for short text', () => {
      const text = 'Short text'
      expect(service.calculateChunkCount(text, 1000)).toBe(1)
    })

    it('should return multiple chunks for long text', () => {
      const text = 'This is a '.repeat(1000)
      expect(service.calculateChunkCount(text, 100)).toBeGreaterThan(1)
    })

    it('should respect model-specific adjustments', () => {
      // 传入0作为maxTokens，让函数根据模型类型自动调整
      const text = 'This is a '.repeat(5000)
      const count1 = service.calculateChunkCount(text, 0, 'gpt-4o')
      const count2 = service.calculateChunkCount(text, 0, 'gpt-3.5-turbo')
      expect(count1).toBeLessThan(count2)
    })
  })
})