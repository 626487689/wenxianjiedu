import type { LLMClient } from './LLMClient'
import type { ModelRequest, ModelResponse } from '../../types/llm'
import { logger } from '../logger/LoggerService'

export class MockLLMClient implements LLMClient {
  private mockResponses: Record<string, string> = {
    '请只回复“连接成功”': '连接成功',
    'summarize': '这是一篇关于人工智能的学术论文摘要...',
  }

  async generate(req: ModelRequest): Promise<ModelResponse> {
    logger.info(`模拟LLM调用: ${req.modelName}`)
    logger.info(`提示词长度: ${req.prompt.length} 字符`)

    await this.delay(1000 + Math.random() * 2000)

    let responseContent = this.mockResponses[req.prompt.trim()]
    
    if (!responseContent) {
      responseContent = this.generateMockResponse(req.prompt)
    }

    if (req.onProgress) {
      const chunks = responseContent.split('')
      for (let i = 0; i < chunks.length; i += Math.ceil(chunks.length / 10)) {
        await this.delay(100)
        req.onProgress({ text: chunks.slice(i, i + Math.ceil(chunks.length / 10)).join(''), done: false })
      }
      req.onProgress({ text: '', done: true })
    }

    logger.info(`模拟响应生成完成，内容长度: ${responseContent.length}`)

    return {
      content: responseContent,
      usage: {
        promptTokens: Math.ceil(req.prompt.length / 4),
        completionTokens: Math.ceil(responseContent.length / 4),
        totalTokens: Math.ceil((req.prompt.length + responseContent.length) / 4),
      },
    }
  }

  private generateMockResponse(prompt: string): string {
    const responses = [
      `已完成对您的论文分析。根据您提供的内容，这篇论文主要探讨了以下几个方面：\n\n1. 研究背景与动机\n2. 核心方法与创新点\n3. 实验结果与分析\n4. 结论与未来展望\n\n本文提出了一种创新性的方法来解决${this.extractTopic(prompt)}相关问题，实验结果表明该方法在多个基准数据集上取得了优异的性能表现。`,
      
      `根据您的论文内容，我为您生成了详细的解读报告：\n\n## 论文概述\n这是一篇关于${this.extractTopic(prompt)}的学术论文，发表于知名学术期刊。\n\n## 核心贡献\n- 提出了新颖的${this.extractTopic(prompt)}方法\n- 在基准数据集上达到了SOTA性能\n- 提供了开源代码和数据集\n\n## 方法论\n论文采用了${this.getMethodology()}的研究方法，通过严谨的实验验证了所提出方法的有效性。`,
      
      `论文解读结果：\n\n### 研究问题\n本文旨在解决${this.extractTopic(prompt)}领域中的关键挑战。\n\n### 解决方案\n作者提出了一个创新性的框架，主要包括以下几个核心组件：\n1. 数据预处理模块\n2. 特征提取与表示学习\n3. 模型架构设计\n4. 实验验证与分析\n\n### 主要发现\n实验结果表明，该方法在准确性和效率方面都优于现有方法，为后续研究提供了新的思路和方向。`,
    ]

    return responses[Math.floor(Math.random() * responses.length)]
  }

  private extractTopic(prompt: string): string {
    const topics = ['人工智能', '机器学习', '深度学习', '自然语言处理', '计算机视觉', '数据挖掘', '推荐系统', '强化学习']
    return topics[Math.floor(Math.random() * topics.length)]
  }

  private getMethodology(): string {
    const methods = ['监督学习', '无监督学习', '半监督学习', '强化学习', '迁移学习', '元学习', '对比学习', '自监督学习']
    return methods[Math.floor(Math.random() * methods.length)]
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
