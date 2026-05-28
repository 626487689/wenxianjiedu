import { logger } from '../logger/LoggerService'
import { normalizeOpenAIEndpoint } from '../../utils/endpoint'
import type { EndpointMode } from '../../types/config'

export interface AttachmentSupportResult {
  supportsAttachments: boolean
  attachmentType?: 'multipart' | 'base64' | 'url' | 'none'
  message?: string
  responseTime?: number
}

export class AttachmentSupportService {
  async checkAttachmentSupport(
    endpoint: string,
    endpointMode: EndpointMode = 'auto',
    apiKey?: string,
    modelName?: string
  ): Promise<AttachmentSupportResult> {
    const normalizedEndpoint = normalizeOpenAIEndpoint(endpoint, endpointMode)
    
    logger.info(`开始测试 API 附件支持: ${normalizedEndpoint}`)
    const startTime = Date.now()

    try {
      const testContent = 'Hello, this is a test message.'
      const testFileName = 'test.txt'
      const testFileContent = 'This is a test file content for attachment testing.'

      const result = await this.testMultipartAttachment(
        normalizedEndpoint,
        apiKey,
        modelName || 'gpt-4o',
        testContent,
        testFileName,
        testFileContent
      )

      if (result.success) {
        logger.info(`API 支持 multipart/form-data 附件: ${result.message}`)
        return {
          supportsAttachments: true,
          attachmentType: 'multipart',
          message: result.message,
          responseTime: Date.now() - startTime,
        }
      }

      if (result.needsBase64) {
        logger.info(`API 需要 base64 编码附件`)
        const base64Result = await this.testBase64Attachment(
          normalizedEndpoint,
          apiKey,
          modelName || 'gpt-4o',
          testContent,
          testFileName,
          testFileContent
        )

        if (base64Result.success) {
          logger.info(`API 支持 base64 编码附件`)
          return {
            supportsAttachments: true,
            attachmentType: 'base64',
            message: base64Result.message,
            responseTime: Date.now() - startTime,
          }
        }
      }

      logger.warn(`API 不支持附件: ${result.message}`)
      return {
        supportsAttachments: false,
        attachmentType: 'none',
        message: result.message,
        responseTime: Date.now() - startTime,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`附件支持测试失败: ${errorMessage}`)
      return {
        supportsAttachments: false,
        attachmentType: 'none',
        message: errorMessage,
        responseTime: Date.now() - startTime,
      }
    }
  }

  private async testMultipartAttachment(
    endpoint: string,
    apiKey?: string,
    modelName?: string,
    content?: string,
    fileName?: string,
    fileContent?: string
  ): Promise<{ success: boolean; message: string; needsBase64?: boolean }> {
    const boundary = `----WebKitFormBoundary${Date.now()}`
    const body = this.buildMultipartBody(boundary, content, fileName, fileContent)
    
    const headers: Record<string, string> = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    }
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        return { success: true, message: 'API 支持 multipart/form-data 附件格式' }
      }

      const text = await response.text().catch(() => '')
      
      if (response.status === 400) {
        if (text.includes('content') || text.includes('messages') || text.includes('invalid')) {
          return { success: false, message: 'API 不支持 multipart/form-data 附件格式', needsBase64: true }
        }
      }

      if (response.status === 401 || response.status === 403) {
        return { success: false, message: `认证失败: ${response.status}` }
      }

      return { success: false, message: `HTTP ${response.status}: ${text.substring(0, 200)}` }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, message: `请求失败: ${errorMessage}`, needsBase64: true }
    }
  }

  private async testBase64Attachment(
    endpoint: string,
    apiKey?: string,
    modelName?: string,
    content?: string,
    fileName?: string,
    fileContent?: string
  ): Promise<{ success: boolean; message: string }> {
    const base64Content = this.encodeToBase64(fileContent || '')

    const requestBody = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: content || 'Please summarize the attached document.',
            },
            {
              type: 'file_url',
              file_url: {
                url: `data:text/plain;base64,${base64Content}`,
              },
            },
          ],
        },
      ],
      max_tokens: 100,
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        return { success: true, message: 'API 支持 base64 编码文件附件' }
      }

      const text = await response.text().catch(() => '')
      return { success: false, message: `API 不支持 base64 附件格式: ${text.substring(0, 200)}` }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, message: `请求失败: ${errorMessage}` }
    }
  }

  private buildMultipartBody(
    boundary: string,
    content?: string,
    fileName?: string,
    fileContent?: string
  ): string {
    const parts: string[] = []

    parts.push(`--${boundary}\r\n`)
    parts.push(`Content-Disposition: form-data; name="messages"\r\n`)
    parts.push(`Content-Type: application/json\r\n\r\n`)
    const messageContent = content || 'Test message'
    const messageBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    }
    parts.push(`${JSON.stringify(messageBody)}\r\n`)

    if (fileName && fileContent) {
      parts.push(`--${boundary}\r\n`)
      parts.push(`Content-Disposition: form-data; name="files"; filename="${fileName}"\r\n`)
      parts.push(`Content-Type: text/plain\r\n\r\n`)
      parts.push(`${fileContent}\r\n`)
    }

    parts.push(`--${boundary}--\r\n`)

    return parts.join('')
  }

  private encodeToBase64(content: string): string {
    try {
      return btoa(content)
    } catch {
      return content
    }
  }
}

export const attachmentSupportService = new AttachmentSupportService()
