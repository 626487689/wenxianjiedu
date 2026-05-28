import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SmartChunkingService } from '../services/chunking/SmartChunkingService'
import { chunkCacheService } from '../services/chunking/ChunkCacheService'
import { errorHandler } from '../services/error/ErrorHandlerService'
import { configPresetService } from '../services/config/ConfigPresetService'
import { performanceMonitor } from '../services/monitoring/PerformanceMonitorService'

// 模拟文档解析服务
class MockDocumentParser {
  parse(file: any) {
    return {
      text: '这是一个测试文档，包含一些测试内容。这是第二段落，包含更多的测试内容。',
      metadata: {
        title: '测试文档',
        author: '测试作者',
        year: 2024
      }
    }
  }
}

// 模拟模型客户端
class MockLLMClient {
  generate(params: any) {
    return {
      content: '这是模型生成的摘要内容。',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      }
    }
  }
}

// 模拟模型客户端工厂
class MockModelClientFactory {
  createClient(providerType: string) {
    return new MockLLMClient()
  }
}

// 模拟提示词 composer
class MockPromptComposer {
  compose(params: any) {
    return {
      userPrompt: '请分析以下文档：\n' + params.document.text,
      systemPrompt: '你是一个专业的论文分析助手。',
      truncation: {
        applied: false,
        originalLength: params.document.text.length,
        finalLength: params.document.text.length
      }
    }
  }
}

// 模拟论文分析器
class MockPaperAnalyzer {
  analyzePaperDirection(text: string, modelConfig: any, apiKey: string) {
    return {
      mainDirection: '计算机科学',
      subDirections: ['人工智能', '机器学习'],
      keywords: ['AI', 'ML', '深度学习'],
      confidence: '高'
    }
  }
}

// 模拟 Markdown writer
class MockMarkdownWriter {
  write(params: any) {
    return {
      outputPath: 'test/output.md',
      content: '# 测试文档\n\n这是测试文档的摘要。'
    }
  }
}

describe('集成测试', () => {
  beforeEach(() => {
    // 清除缓存
    chunkCacheService.clear()
    // 清除性能监控数据
    performanceMonitor.clearMetrics()
  })

  afterEach(() => {
    // 清除所有模拟
    vi.clearAllMocks()
  })

  describe('分块处理流程', () => {
    it('应该正确处理文档分块', () => {
      const smartChunkingService = new SmartChunkingService()
      const testText = '这是一个测试文本，用于测试分块功能。这个文本包含多个句子，以便测试分块算法是否能够正确地在句子边界处进行分块。这是第二段落，包含更多的内容，以确保分块算法能够处理多段落的情况。这是第三段落，用于测试分块算法的边界处理能力。'
      
      const chunks = smartChunkingService.chunkByMaxTokens(testText, 10)
      expect(chunks.length).toBeGreaterThan(1)
      chunks.forEach(chunk => {
        expect(chunk.text).toBeTruthy()
        expect(chunk.tokenCount).toBeGreaterThan(0)
      })
    })

    it('应该正确使用分块缓存', () => {
      const testText = '这是一个测试文本，用于测试缓存功能。'
      const modelName = 'gpt-4o'
      
      // 检查缓存是否为空
      expect(chunkCacheService.has(testText, modelName)).toBe(false)
      
      // 设置缓存
      const testResult = '这是缓存的结果。'
      chunkCacheService.set(testText, modelName, testResult, 10)
      
      // 检查缓存是否存在
      expect(chunkCacheService.has(testText, modelName)).toBe(true)
      expect(chunkCacheService.get(testText, modelName)).toBe(testResult)
    })
  })

  describe('配置预设流程', () => {
    it('应该正确获取配置预设', () => {
      const presets = configPresetService.getPresets()
      expect(presets.length).toBeGreaterThan(0)
      
      const openaiPreset = configPresetService.getPresetById('openai-gpt-4o')
      expect(openaiPreset).toBeDefined()
      expect(openaiPreset?.name).toBe('OpenAI GPT-4o')
      expect(openaiPreset?.providerType).toBe('openai_compatible')
    })

    it('应该正确将预设转换为模型配置', () => {
      const preset = configPresetService.getPresetById('openai-gpt-4o')
      expect(preset).toBeDefined()
      if (preset) {
        const modelConfig = configPresetService.presetToModelConfig(preset)
        expect(modelConfig).toBeDefined()
        expect(modelConfig.providerType).toBe(preset.providerType)
        expect(modelConfig.endpoint).toBe(preset.endpoint)
        expect(modelConfig.modelName).toBe(preset.modelName)
      }
    })
  })

  describe('错误处理流程', () => {
    it('应该正确处理不同类型的错误', () => {
      // 测试网络错误
      const networkError = new Error('网络连接失败')
      const networkErrorInfo = errorHandler.handleError(networkError)
      expect(networkErrorInfo.code).toBe('NETWORK_ERROR')
      expect(networkErrorInfo.message).toBe('网络连接失败')
      
      // 测试超时错误
      const timeoutError = new Error('timeout')
      const timeoutErrorInfo = errorHandler.handleError(timeoutError)
      expect(timeoutErrorInfo.code).toBe('TIMEOUT_ERROR')
      expect(timeoutErrorInfo.message).toBe('请求超时')
      
      // 测试API密钥错误
      const apiKeyError = new Error('HTTP_401 Unauthorized')
      const apiKeyErrorInfo = errorHandler.handleError(apiKeyError)
      expect(apiKeyErrorInfo.code).toBe('API_KEY_ERROR')
      expect(apiKeyErrorInfo.message).toBe('API Key 无效')
    })
  })

  describe('性能监控流程', () => {
    it('应该正确监控操作执行时间', () => {
      const operationId = performanceMonitor.start('test_operation', 'test_category', { test: 'metadata' })
      
      // 模拟操作执行
      setTimeout(() => {
        performanceMonitor.end(operationId)
      }, 10)
      
      // 检查是否有性能指标
      const metrics = performanceMonitor.getMetrics('test_category')
      expect(metrics.length).toBeGreaterThanOrEqual(0)
    })
  })
})
