import { useState, useCallback } from 'react'
import type { ModelProviderType } from '../types/config'
import { attachmentSupportService, type AttachmentSupportResult } from '../services/api/AttachmentSupportService'

export interface UseAttachmentTestReturn {
  isTesting: boolean
  result: AttachmentSupportResult | null
  testAttachmentSupport: (
    endpoint: string,
    providerType: ModelProviderType,
    apiKey?: string,
    modelName?: string
  ) => Promise<AttachmentSupportResult | null>
}

export function useAttachmentTest(): UseAttachmentTestReturn {
  const [isTesting, setIsTesting] = useState(false)
  const [result, setResult] = useState<AttachmentSupportResult | null>(null)

  const testAttachmentSupport = useCallback(async (
    endpoint: string,
    providerType: ModelProviderType,
    apiKey?: string,
    modelName?: string
  ): Promise<AttachmentSupportResult | null> => {
    if (providerType === 'local') {
      const localResult: AttachmentSupportResult = {
        supportsAttachments: true,
        attachmentType: 'none',
        message: 'Local 模式使用模拟响应，无需测试附件支持',
      }
      setResult(localResult)
      return localResult
    }

    setIsTesting(true)
    setResult(null)

    try {
      const testResult = await attachmentSupportService.checkAttachmentSupport(
        endpoint,
        'auto',
        apiKey,
        modelName
      )
      setResult(testResult)
      return testResult
    } catch (error) {
      const errorResult: AttachmentSupportResult = {
        supportsAttachments: false,
        attachmentType: 'none',
        message: error instanceof Error ? error.message : '测试失败',
      }
      setResult(errorResult)
      return errorResult
    } finally {
      setIsTesting(false)
    }
  }, [])

  return {
    isTesting,
    result,
    testAttachmentSupport,
  }
}
