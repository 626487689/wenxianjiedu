import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import type { ModelProviderType, EndpointMode, MultiModelEntry, MultiModelConfig } from '../../types/config'
import { appFacade } from '../../app/appFacade'
import { logger } from '../../services/logger/LoggerService'


interface ModelContextValue {
  providerType: ModelProviderType
  endpoint: string
  endpointMode: EndpointMode
  modelName: string
  apiKeyInput: string
  apiKeySaved: boolean
  timeoutMs: number
  rememberApiKey: boolean
  savingConfig: boolean
  testingConnection: boolean
  attachmentTesting: boolean
  attachmentResult: { supportsAttachments: boolean; attachmentType?: string; message?: string } | null
  setProviderType: (v: ModelProviderType) => void
  setEndpoint: (v: string) => void
  setEndpointMode: (v: EndpointMode) => void
  setModelName: (v: string) => void
  setApiKeyInput: (v: string) => void
  setTimeoutMs: (v: number) => void
  setRememberApiKey: (v: boolean) => void
  handleSaveConfig: () => Promise<void>
  handleTestConnection: () => Promise<void>
  handleTestAttachment: () => Promise<void>
  latestError: string | undefined
  setLatestError: (v: string | undefined) => void
  latestOutputContent: string | undefined
  setLatestOutputContent: (v: string | undefined) => void
  latestOutputPath: string | undefined
  setLatestOutputPath: (v: string | undefined) => void
  currentStage: string | undefined
  setCurrentStage: (v: string | undefined) => void

  // Multi-model state
  models: MultiModelEntry[]
  activeModelId: string | null
  activeModel: MultiModelEntry | null
  testingModelId: string | null
  modelTestResults: Record<string, { success: boolean; latency?: number; message?: string; timestamp: number }>

  // Multi-model actions
  addModel: (entry: Omit<MultiModelEntry, 'id' | 'priority'>) => void
  updateModel: (id: string, entry: Partial<MultiModelEntry>) => void
  removeModel: (id: string) => void
  setActiveModel: (id: string) => void
  toggleModelEnabled: (id: string) => void
  reorderModels: (orderedIds: string[]) => void
  setTestingModelId: (id: string | null) => void
  setModelTestResult: (id: string, result: { success: boolean; latency?: number; message?: string }) => void
}

const ModelContext = createContext<ModelContextValue | null>(null)

export function useModelContext() {
  const ctx = useContext(ModelContext)
  if (!ctx) throw new Error('useModelContext must be used within ModelProvider')
  return ctx
}

interface Props { children: ReactNode }

export function ModelProvider({ children }: Props) {
  const [providerType, setProviderType] = useState<ModelProviderType>('openai_compatible')
  const [endpoint, setEndpoint] = useState('')
  const [endpointMode, setEndpointMode] = useState<EndpointMode>('auto')
  const [modelName, setModelName] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const [timeoutMs, setTimeoutMs] = useState(300000)
  const [rememberApiKey, setRememberApiKey] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [attachmentTesting, setAttachmentTesting] = useState(false)
  const [attachmentResult, setAttachmentResult] = useState<{ supportsAttachments: boolean; attachmentType?: string; message?: string } | null>(null)
  const [latestError, setLatestError] = useState<string | undefined>()
  const [latestOutputContent, setLatestOutputContent] = useState<string | undefined>()
  const [latestOutputPath, setLatestOutputPath] = useState<string | undefined>()
  const [currentStage, setCurrentStage] = useState<string | undefined>()

  // Expose setters for external initialization (from AppContext bootstrap)
  const [initialized, setInitialized] = useState(false)

  // --- Multi-model state ---
  const [models, setModels] = useState<MultiModelEntry[]>(() => {
    try {
      const stored = localStorage.getItem('wenxianjiedu-multi-models')
      if (stored) return JSON.parse(stored).models || []
    } catch { /* ignore */ }
    return []
  })
  const [activeModelId, setActiveModelId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('wenxianjiedu-multi-models')
      if (stored) return JSON.parse(stored).activeModelId || null
    } catch { /* ignore */ }
    return null
  })
  const [testingModelId, setTestingModelId] = useState<string | null>(null)
  const [modelTestResults, setModelTestResults] = useState<Record<string, { success: boolean; latency?: number; message?: string; timestamp: number }>>({})

  // Compute active model
  const activeModel = useMemo(() => {
    if (!activeModelId) return null
    return models.find(m => m.id === activeModelId) ?? null
  }, [activeModelId, models])


  // --- Multi-model action implementations ---
  const addModel = useCallback((entry: Omit<MultiModelEntry, 'id' | 'priority'>) => {
    setModels(prev => {
      const newEntry: MultiModelEntry = {
        ...entry,
        id: `model-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        priority: prev.length,
      }
      return [...prev, newEntry]
    })
  }, [])

  const updateModel = useCallback((id: string, updates: Partial<MultiModelEntry>) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }, [])

  const removeModel = useCallback((id: string) => {
    setModels(prev => prev.filter(m => m.id !== id))
    setActiveModelId(prev => prev === id ? null : prev)
  }, [])

  const setActiveModel = useCallback((id: string) => {
    setActiveModelId(id)
  }, [])

  const toggleModelEnabled = useCallback((id: string) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m))
  }, [])

  const reorderModels = useCallback((orderedIds: string[]) => {
    setModels(prev => {
      const map = new Map(prev.map(m => [m.id, m]))
      return orderedIds
        .map((id, index) => {
          const entry = map.get(id)
          return entry ? { ...entry, priority: index } : null
        })
        .filter((m): m is MultiModelEntry => m !== null)
    })
  }, [])

  const setModelTestResult = useCallback((id: string, result: { success: boolean; latency?: number; message?: string }) => {
    setModelTestResults(prev => ({
      ...prev,
      [id]: { ...result, timestamp: Date.now() },
    }))
  }, [])
  // Persist multi-model config
  useEffect(() => {
    try {
      localStorage.setItem('wenxianjiedu-multi-models', JSON.stringify({ models, activeModelId }))
    } catch { /* ignore */ }
  }, [models, activeModelId])

  const loadFromConfig = useCallback(async () => {
    try {
      const initial = await appFacade.loadInitialData()
      setProviderType(initial.config.model.providerType)
      setEndpoint(initial.config.model.endpoint)
      setEndpointMode(initial.config.model.endpointMode)
      setModelName(initial.config.model.modelName)
      setTimeoutMs(initial.config.model.timeoutMs)
      setApiKeySaved(initial.apiKeySaved)
      setInitialized(true)
      logger.info('模型配置加载完成')
    } catch (error) {
      logger.error('模型配置加载失败', error as any)
    }
  }, [])

  const handleSaveConfig = useCallback(async () => {
    try {
      setSavingConfig(true)
      setLatestError(undefined)
      await appFacade.saveModelConfig({
        providerType,
        endpoint,
        endpointMode,
        modelName,
        apiKey: apiKeyInput,
        rememberApiKey,
        timeoutMs,
      })
      const initial = await appFacade.loadInitialData()
      setApiKeySaved(initial.apiKeySaved)
      setApiKeyInput('')
    } catch (error) {
      setLatestError(error instanceof Error ? error.message : '保存配置失败')
    } finally {
      setSavingConfig(false)
    }
  }, [providerType, endpoint, endpointMode, modelName, apiKeyInput, rememberApiKey, timeoutMs])

  const handleTestConnection = useCallback(async () => {
    try {
      setTestingConnection(true)
      setLatestError(undefined)
      setCurrentStage('正在测试模型连接')
      const result = await appFacade.testModelConnection({
        providerType,
        endpoint,
        endpointMode,
        modelName,
        timeoutMs,
        runtimeApiKey: apiKeyInput.trim() || undefined,
      })
      setCurrentStage(`连接测试成功：${result.normalizedEndpoint}`)
      setLatestOutputContent(`模型连接测试成功。\n\n接口地址：${result.normalizedEndpoint}\n返回预览：${result.preview}`)
      setLatestOutputPath(undefined)
      setApiKeyInput('')
      const initial = await appFacade.loadInitialData()
      setApiKeySaved(initial.apiKeySaved)
    } catch (error) {
      setCurrentStage('模型连接测试失败')
      setLatestError(error instanceof Error ? error.message : '测试连接失败')
    } finally {
      setTestingConnection(false)
    }
  }, [providerType, endpoint, endpointMode, modelName, timeoutMs, apiKeyInput])

  const handleTestAttachment = useCallback(async () => {
    try {
      setAttachmentTesting(true)
      setAttachmentResult(null)
      const { attachmentSupportService } = await import('../../services/api/AttachmentSupportService')
      const result = await attachmentSupportService.checkAttachmentSupport(
        endpoint,
        endpointMode,
        apiKeyInput.trim() || undefined,
        modelName
      )
      setAttachmentResult({
        supportsAttachments: result.supportsAttachments,
        attachmentType: result.attachmentType,
        message: result.message,
      })
    } catch (error) {
      setAttachmentResult({
        supportsAttachments: false,
        message: error instanceof Error ? error.message : '测试失败',
      })
    } finally {
      setAttachmentTesting(false)
    }
  }, [endpoint, endpointMode, apiKeyInput, modelName])

  const value: ModelContextValue = {
    providerType, endpoint, endpointMode, modelName,
    apiKeyInput, apiKeySaved, timeoutMs, rememberApiKey,
    savingConfig, testingConnection, attachmentTesting, attachmentResult,
    setProviderType, setEndpoint, setEndpointMode, setModelName,
    setApiKeyInput, setTimeoutMs, setRememberApiKey,
    handleSaveConfig, handleTestConnection, handleTestAttachment,
    latestError, setLatestError,
    latestOutputContent, setLatestOutputContent,
    latestOutputPath, setLatestOutputPath,
    currentStage, setCurrentStage,
    // Multi-model
    models, activeModelId, activeModel,
    testingModelId, setTestingModelId,
    modelTestResults, setModelTestResult,
    addModel, updateModel, removeModel,
    setActiveModel, toggleModelEnabled, reorderModels,
  }

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
}

export { ModelContext }
