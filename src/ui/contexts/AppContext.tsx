import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import type { PromptTemplate } from '../../types/prompt'
import type { SourceFileRef } from '../../types/file'
import { appFacade } from '../../app/appFacade'
import { logger } from '../../services/logger/LoggerService'
import { ModelProvider, useModelContext } from './ModelContext'
import { TaskProvider, useTaskContext } from './TaskContext'

interface AppContextValue {
  // Files
  sourceType: 'file' | 'folder' | null
  sourcePath: string
  recursive: boolean
  files: SourceFileRef[]
  loadingFiles: boolean
  handlePickFile: () => Promise<void>
  handlePickFolder: () => Promise<void>
  handleRecursiveChange: (value: boolean) => void

  // Output
  outputDir: string
  outputFormat: 'default' | 'obsidian'
  handlePickOutputDir: () => Promise<void>
  handleOutputFormatChange: (value: 'default' | 'obsidian') => void

  // Templates
  templates: PromptTemplate[]
  selectedTemplateId: string | undefined
  templateNameInput: string
  promptContent: string
  setSelectedTemplateId: (id: string | undefined) => void
  setTemplateNameInput: (name: string) => void
  setPromptContent: (content: string) => void
  savingTemplate: boolean
  deletingTemplate: boolean
  handleSaveTemplate: () => Promise<void>
  handleDeleteTemplate: (id: string) => Promise<void>

  // Bootstrap
  loadingConfig: boolean
  bootstrapError: string | undefined
}

const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

interface InnerProps {
  children: ReactNode
}

function AppContextInner({ children }: InnerProps) {
  const model = useModelContext()
  const task = useTaskContext()

  // File state
  const [sourceType, setSourceType] = useState<'file' | 'folder' | null>(null)
  const [sourcePath, setSourcePath] = useState('')
  const [recursive, setRecursive] = useState(false)
  const [files, setFiles] = useState<SourceFileRef[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)

  // Output state
  const [outputDir, setOutputDir] = useState('')
  const [outputFormat, setOutputFormat] = useState<'default' | 'obsidian'>('default')

  // Template state
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>()
  const [templateNameInput, setTemplateNameInput] = useState('')
  const [promptContent, setPromptContent] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState(false)

  // Bootstrap
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [bootstrapError, setBootstrapError] = useState<string | undefined>()

  // --- Bootstrap ---
  useEffect(() => {
    let active = true
    const logHandler = (entry: any) => {
      if (!active) return
      const msg = typeof entry === 'string'
        ? entry
        : `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`
      task.addLog(msg)
    }
    logger.addLogHandler(logHandler)

    async function bootstrap() {
      try {
        setLoadingConfig(true)
        setBootstrapError(undefined)
        logger.info('开始初始化应用')
        const initial = await appFacade.loadInitialData()
        if (!active) return

        // Model
        model.setProviderType(initial.config.model.providerType)
        model.setEndpoint(initial.config.model.endpoint)
        model.setEndpointMode(initial.config.model.endpointMode)
        model.setModelName(initial.config.model.modelName)
        model.setTimeoutMs(initial.config.model.timeoutMs)
        model.setLatestError(undefined)

        // Files
        setRecursive(initial.config.recursiveDefault)
        setOutputDir(initial.config.lastOutputPath ?? '')
        setOutputFormat(initial.config.outputFormat ?? 'default')

        // Task
        task.setConcurrency(initial.config.batch.concurrency)
        task.setRetryCount(initial.config.batch.retryCount)
        task.setSkipExistingOutput(initial.config.batch.skipExistingOutput)

        // Templates
        setTemplates(initial.templates)

        logger.info('应用初始化完成')
      } catch (error) {
        if (!active) return
        const msg = error instanceof Error ? error.message : '初始化失败'
        setBootstrapError(msg)
        logger.error(msg)
      } finally {
        if (active) setLoadingConfig(false)
      }
    }
    bootstrap()
    return () => { active = false; logger.removeLogHandler(logHandler) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- canStart computation ---
  const canStart = useMemo(() => {
    return (
      !task.isRunning &&
      model.endpoint.trim().length > 0 &&
      model.modelName.trim().length > 0 &&
      (model.apiKeySaved || model.apiKeyInput.trim().length > 0) &&
      files.length > 0 &&
      outputDir.trim().length > 0 &&
      promptContent.trim().length > 0
    )
  }, [task.isRunning, model.endpoint, model.modelName, model.apiKeySaved, model.apiKeyInput, files, outputDir, promptContent])

  // --- Persist helpers ---
  const persistUiPreferences = useCallback(async (input: Record<string, any>) => {
    try { await appFacade.saveUiPreferences(input) } catch { /* ignore */ }
  }, [])

  const reloadTemplates = useCallback(async () => {
    const next = await appFacade.listTemplates()
    setTemplates(next)
  }, [])

  // --- File handlers ---
  const handlePickFile = useCallback(async () => {
    try {
      setLoadingFiles(true)
      model.setLatestError(undefined)
      const path = await appFacade.pickSingleFile()
      if (!path) return
      const loaded = await appFacade.loadFiles({ sourcePath: path, sourceType: 'file', recursive: false })
      setSourceType('file')
      setSourcePath(path)
      setFiles(loaded)
      await persistUiPreferences({ lastInputPath: path, recursiveDefault: false })
    } catch (error) {
      model.setLatestError(error instanceof Error ? error.message : '选择文件失败')
    } finally {
      setLoadingFiles(false)
    }
  }, [model, persistUiPreferences])

  const handlePickFolder = useCallback(async () => {
    try {
      setLoadingFiles(true)
      model.setLatestError(undefined)
      const path = await appFacade.pickFolder()
      if (!path) return
      const loaded = await appFacade.loadFiles({ sourcePath: path, sourceType: 'folder', recursive })
      setSourceType('folder')
      setSourcePath(path)
      setFiles(loaded)
      await persistUiPreferences({ lastInputPath: path, recursiveDefault: recursive })
    } catch (error) {
      model.setLatestError(error instanceof Error ? error.message : '选择文件夹失败')
    } finally {
      setLoadingFiles(false)
    }
  }, [model, recursive, persistUiPreferences])

  const handleRecursiveChange = useCallback(async (value: boolean) => {
    setRecursive(value)
    await persistUiPreferences({ recursiveDefault: value })
    if (sourceType !== 'folder' || !sourcePath) return
    try {
      setLoadingFiles(true)
      model.setLatestError(undefined)
      const loaded = await appFacade.loadFiles({ sourcePath, sourceType: 'folder', recursive: value })
      setFiles(loaded)
    } catch (error) {
      model.setLatestError(error instanceof Error ? error.message : '刷新文件列表失败')
    } finally {
      setLoadingFiles(false)
    }
  }, [model, sourceType, sourcePath, persistUiPreferences])

  // --- Output handlers ---
  const handlePickOutputDir = useCallback(async () => {
    try {
      model.setLatestError(undefined)
      const path = await appFacade.pickOutputDirectory()
      if (!path) return
      setOutputDir(path)
      await persistUiPreferences({ lastOutputPath: path, outputFormat })
    } catch (error) {
      model.setLatestError(error instanceof Error ? error.message : '选择输出目录失败')
    }
  }, [model, outputFormat, persistUiPreferences])

  const handleOutputFormatChange = useCallback(async (value: 'default' | 'obsidian') => {
    setOutputFormat(value)
    await persistUiPreferences({ outputFormat: value })
  }, [persistUiPreferences])

  // --- Template handlers ---
  const handleSaveTemplate = useCallback(async () => {
    try {
      setSavingTemplate(true)
      model.setLatestError(undefined)
      await appFacade.saveTemplate({
        id: selectedTemplateId,
        name: templateNameInput || '未命名模板',
        content: promptContent,
      })
      await reloadTemplates()
    } catch (error) {
      model.setLatestError(error instanceof Error ? error.message : '保存模板失败')
    } finally {
      setSavingTemplate(false)
    }
  }, [model, selectedTemplateId, templateNameInput, promptContent, reloadTemplates])

  const handleDeleteTemplate = useCallback(async (id: string) => {
    try {
      setDeletingTemplate(true)
      model.setLatestError(undefined)
      await appFacade.deleteTemplate(id)
      if (selectedTemplateId === id) {
        setSelectedTemplateId(undefined)
        setPromptContent('')
        setTemplateNameInput('')
      }
      await reloadTemplates()
    } catch (error) {
      model.setLatestError(error instanceof Error ? error.message : '删除模板失败')
    } finally {
      setDeletingTemplate(false)
    }
  }, [model, selectedTemplateId, reloadTemplates])

  const value: AppContextValue = {
    sourceType, sourcePath, recursive, files, loadingFiles,
    handlePickFile, handlePickFolder, handleRecursiveChange,
    outputDir, outputFormat,
    handlePickOutputDir, handleOutputFormatChange,
    templates, selectedTemplateId, templateNameInput, promptContent,
    setSelectedTemplateId, setTemplateNameInput, setPromptContent,
    savingTemplate, deletingTemplate,
    handleSaveTemplate, handleDeleteTemplate,
    loadingConfig, bootstrapError,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <ModelProvider>
      <TaskProviderWrapper>
        <AppContextInner>{children}</AppContextInner>
      </TaskProviderWrapper>
    </ModelProvider>
  )
}

/** TaskProvider needs canStart from AppContext, creating a circular dependency solution */
function TaskProviderWrapper({ children }: { children: ReactNode }) {
  // canStart is initially false; TaskProvider accepts it as a prop and recomputes via context
  return <TaskProvider canStart={false}>{children}</TaskProvider>
}
