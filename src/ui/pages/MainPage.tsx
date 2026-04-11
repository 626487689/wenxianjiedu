import { useEffect, useMemo, useRef, useState } from 'react'
import type { EndpointMode, ModelProviderType } from '../../types/config'
import type { PromptTemplate, ChunkingMetadata } from '../../types/prompt'
import type { SourceFileRef } from '../../types/file'
import type { JobState } from '../../types/task'
import { ModelConfigPanel } from '../components/ModelConfigPanel'
import { InputSelectorPanel } from '../components/InputSelectorPanel'
import { OutputPanel } from '../components/OutputPanel'
import { PromptEditorPanel } from '../components/PromptEditorPanel'
import { TaskPanel } from '../components/TaskPanel'
import { ResultPanel } from '../components/ResultPanel'
import { appFacade } from '../../app/appFacade'

export function MainPage() {
  const cancelRequestedRef = useRef(false)
  const runAbortControllerRef = useRef<AbortController | null>(null)

  const [providerType, setProviderType] = useState<ModelProviderType>('openai_compatible')
  const [endpoint, setEndpoint] = useState('')
  const [endpointMode, setEndpointMode] = useState<EndpointMode>('auto')
  const [modelName, setModelName] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const [timeoutMs, setTimeoutMs] = useState(60000)
  const [rememberApiKey, setRememberApiKey] = useState(true)

  const [sourceType, setSourceType] = useState<'file' | 'folder' | null>(null)
  const [sourcePath, setSourcePath] = useState('')
  const [recursive, setRecursive] = useState(false)
  const [files, setFiles] = useState<SourceFileRef[]>([])

  const [outputDir, setOutputDir] = useState('')

  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>()
  const [templateNameInput, setTemplateNameInput] = useState('')
  const [promptContent, setPromptContent] = useState('')

  const [concurrency, setConcurrency] = useState(1)
  const [retryCount, setRetryCount] = useState(0)
  const [skipExistingOutput, setSkipExistingOutput] = useState(false)

  const [jobState, setJobState] = useState<JobState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const [latestOutputPath, setLatestOutputPath] = useState<string | undefined>()
  const [latestOutputContent, setLatestOutputContent] = useState<string | undefined>()
  const [latestError, setLatestError] = useState<string | undefined>()
  const [latestChunking, setLatestChunking] = useState<ChunkingMetadata | undefined>()
  const [currentStage, setCurrentStage] = useState<string | undefined>()

  const [loadingConfig, setLoadingConfig] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState(false)

  useEffect(() => {
    let active = true

    async function bootstrap() {
      try {
        setLoadingConfig(true)
        setLatestError(undefined)

        const initial = await appFacade.loadInitialData()
        if (!active) return

        setProviderType(initial.config.model.providerType)
        setEndpoint(initial.config.model.endpoint)
        setEndpointMode(initial.config.model.endpointMode)
        setModelName(initial.config.model.modelName)
        setTimeoutMs(initial.config.model.timeoutMs)
        setApiKeySaved(initial.apiKeySaved)
        setRecursive(initial.config.recursiveDefault)
        setOutputDir(initial.config.lastOutputPath ?? '')
        setConcurrency(initial.config.batch.concurrency)
        setRetryCount(initial.config.batch.retryCount)
        setSkipExistingOutput(initial.config.batch.skipExistingOutput)
        setTemplates(initial.templates)
      } catch (error) {
        if (!active) return
        setLatestError(getErrorMessage(error, '初始化失败'))
      } finally {
        if (!active) return
        setLoadingConfig(false)
      }
    }

    bootstrap()

    return () => {
      active = false
    }
  }, [])

  const canStart = useMemo(() => {
    return (
      !isRunning &&
      endpoint.trim().length > 0 &&
      modelName.trim().length > 0 &&
      (apiKeySaved || apiKeyInput.trim().length > 0) &&
      files.length > 0 &&
      outputDir.trim().length > 0 &&
      promptContent.trim().length > 0
    )
  }, [isRunning, endpoint, modelName, apiKeySaved, apiKeyInput, files, outputDir, promptContent])

  const canCancel = useMemo(() => {
    return isRunning && !isCancelling
  }, [isRunning, isCancelling])

  const currentFileNames = useMemo(() => {
    if (!jobState) {
      return []
    }

    return jobState.currentItemIds
      .map((itemId) => jobState.items.find((item) => item.id === itemId)?.file.name)
      .filter((value): value is string => Boolean(value))
  }, [jobState])

  async function persistUiPreferences(input: {
    lastInputPath?: string
    lastOutputPath?: string
    recursiveDefault?: boolean
    concurrency?: number
    retryCount?: number
    skipExistingOutput?: boolean
  }) {
    try {
      await appFacade.saveUiPreferences(input)
    } catch {
      // ignore preference persistence failures to avoid blocking core flow
    }
  }

  async function reloadTemplates() {
    const next = await appFacade.listTemplates()
    setTemplates(next)
  }

  async function handleSaveConfig() {
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
      setLatestError(getErrorMessage(error, '保存配置失败'))
    } finally {
      setSavingConfig(false)
    }
  }

  async function handleTestConnection() {
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
      setLatestError(getErrorMessage(error, '测试连接失败'))
    } finally {
      setTestingConnection(false)
    }
  }

  async function handlePickFile() {
    try {
      setLoadingFiles(true)
      setLatestError(undefined)

      const path = await appFacade.pickSingleFile()
      if (!path) return

      const loaded = await appFacade.loadFiles({
        sourcePath: path,
        sourceType: 'file',
        recursive: false,
      })

      setSourceType('file')
      setSourcePath(path)
      setFiles(loaded)
      await persistUiPreferences({
        lastInputPath: path,
        recursiveDefault: false,
      })
    } catch (error) {
      setLatestError(getErrorMessage(error, '选择文件失败'))
    } finally {
      setLoadingFiles(false)
    }
  }

  async function handlePickFolder() {
    try {
      setLoadingFiles(true)
      setLatestError(undefined)

      const path = await appFacade.pickFolder()
      if (!path) return

      const loaded = await appFacade.loadFiles({
        sourcePath: path,
        sourceType: 'folder',
        recursive,
      })

      setSourceType('folder')
      setSourcePath(path)
      setFiles(loaded)
      await persistUiPreferences({
        lastInputPath: path,
        recursiveDefault: recursive,
      })
    } catch (error) {
      setLatestError(getErrorMessage(error, '选择文件夹失败'))
    } finally {
      setLoadingFiles(false)
    }
  }

  async function handleRecursiveChange(value: boolean) {
    setRecursive(value)

    await persistUiPreferences({
      recursiveDefault: value,
    })

    if (sourceType !== 'folder' || !sourcePath) return

    try {
      setLoadingFiles(true)
      setLatestError(undefined)

      const loaded = await appFacade.loadFiles({
        sourcePath,
        sourceType: 'folder',
        recursive: value,
      })

      setFiles(loaded)
    } catch (error) {
      setLatestError(getErrorMessage(error, '刷新文件列表失败'))
    } finally {
      setLoadingFiles(false)
    }
  }

  async function handlePickOutputDir() {
    try {
      setLatestError(undefined)

      const path = await appFacade.pickOutputDirectory()
      if (!path) return

      setOutputDir(path)
      await persistUiPreferences({
        lastOutputPath: path,
      })
    } catch (error) {
      setLatestError(getErrorMessage(error, '选择输出目录失败'))
    }
  }

  function handleSelectTemplate(id: string) {
    setSelectedTemplateId(id || undefined)

    const template = templates.find((item) => item.id === id)
    if (!template) return

    setTemplateNameInput(template.name)
    setPromptContent(template.content)
  }

  function handleNewTemplate() {
    setSelectedTemplateId(undefined)
    setTemplateNameInput('')
    setPromptContent('')
  }

  async function handleSaveTemplate() {
    try {
      setSavingTemplate(true)
      setLatestError(undefined)

      const saved = await appFacade.saveTemplate({
        id: selectedTemplateId,
        name: templateNameInput,
        content: promptContent,
      })

      await reloadTemplates()
      setSelectedTemplateId(saved.id)
      setTemplateNameInput(saved.name)
      setPromptContent(saved.content)
    } catch (error) {
      setLatestError(getErrorMessage(error, '保存模板失败'))
    } finally {
      setSavingTemplate(false)
    }
  }

  async function handleDeleteTemplate() {
    if (!selectedTemplateId) return

    try {
      setDeletingTemplate(true)
      setLatestError(undefined)

      await appFacade.deleteTemplate(selectedTemplateId)
      await reloadTemplates()

      setSelectedTemplateId(undefined)
      setTemplateNameInput('')
      setPromptContent('')
    } catch (error) {
      setLatestError(getErrorMessage(error, '删除模板失败'))
    } finally {
      setDeletingTemplate(false)
    }
  }

  async function handleConcurrencyChange(value: number) {
    const next = clampInteger(value, 1, 6)
    setConcurrency(next)
    await persistUiPreferences({ concurrency: next })
  }

  async function handleRetryCountChange(value: number) {
    const next = clampInteger(value, 0, 5)
    setRetryCount(next)
    await persistUiPreferences({ retryCount: next })
  }

  async function handleSkipExistingOutputChange(value: boolean) {
    setSkipExistingOutput(value)
    await persistUiPreferences({ skipExistingOutput: value })
  }

  async function handleStart() {
    try {
      setLatestError(undefined)
      setLatestOutputPath(undefined)
      setLatestOutputContent(undefined)
      setLatestChunking(undefined)
      setCurrentStage('准备启动任务')
      setIsRunning(true)
      setIsCancelling(false)
      cancelRequestedRef.current = false
      runAbortControllerRef.current = new AbortController()

      const runtimeApiKey = apiKeyInput.trim() || undefined

      if (!outputDir.trim()) {
        throw new Error('请先选择输出目录')
      }

      if (!promptContent.trim()) {
        throw new Error('请先填写或选择提示词模板')
      }

      if (!endpoint.trim()) {
        throw new Error('请先填写模型 Endpoint URL')
      }

      if (!modelName.trim()) {
        throw new Error('请先填写模型名称')
      }

      if (!runtimeApiKey && !apiKeySaved) {
        throw new Error('请先输入 API Key，或先保存可用的 API Key')
      }

      if (files.length === 1) {
        const result = await appFacade.runSingle({
          file: files[0],
          outputDir,
          promptContent,
          promptName: selectedPromptName(selectedTemplateId, templates),
          modelConfig: {
            providerType,
            endpoint,
            endpointMode,
            modelName,
            timeoutMs,
          },
          runtimeApiKey,
          signal: runAbortControllerRef.current.signal,
          onStageChange: setCurrentStage,
        })

        const singleState: JobState = {
          id: 'single_job',
          mode: 'single',
          total: 1,
          completed: 1,
          failed: 0,
          cancelledCount: 0,
          skippedCount: 0,
          cancelled: false,
          currentItemId: undefined,
          currentItemIds: [],
          items: [
            {
              id: 'single_task',
              file: files[0],
              status: 'success',
              attempts: 1,
              startedAt: new Date().toISOString(),
              finishedAt: new Date().toISOString(),
              outputPath: result.outputPath,
            },
          ],
        }

        setJobState(singleState)
        setLatestOutputPath(result.outputPath)
        setLatestOutputContent(result.content)
        setLatestChunking(result.chunking)
        setCurrentStage('任务完成')
        setApiKeyInput('')
        return
      }

      const finalState = await appFacade.runBatch({
        files,
        outputDir,
        promptContent,
        promptName: selectedPromptName(selectedTemplateId, templates),
        modelConfig: {
          providerType,
          endpoint,
          endpointMode,
          modelName,
          timeoutMs,
        },
        batchConfig: {
          concurrency,
          retryCount,
          skipExistingOutput,
        },
        runtimeApiKey,
        signal: runAbortControllerRef.current.signal,
        onProgress: (state) => {
          setJobState(state)

          const latestSuccess = [...state.items]
            .reverse()
            .find((item) => item.status === 'success' && item.outputPath)

          if (latestSuccess?.outputPath) {
            setLatestOutputPath(latestSuccess.outputPath)
            if (latestSuccess.chunking) {
              setLatestChunking(latestSuccess.chunking)
            }
          }

          const latestFail = [...state.items]
            .reverse()
            .find((item) => item.status === 'failed' && item.errorMessage)

          if (latestFail?.errorMessage) {
            setLatestError(latestFail.errorMessage)
          }
        },
        onStageChange: setCurrentStage,
        shouldCancel: () => cancelRequestedRef.current,
      })

      setJobState(finalState)
      setCurrentStage(finalState.cancelled ? '任务已取消' : '批量任务完成')
      setApiKeyInput('')
    } catch (error) {
      const message = getErrorMessage(error, '启动任务失败')
      if (message === '任务已取消') {
        setCurrentStage('任务已取消')
      } else {
        setCurrentStage((value) => (value ? `${value}（失败）` : undefined))
      }
      setLatestError(message === '任务已取消' ? undefined : message)
    } finally {
      setIsRunning(false)
      setIsCancelling(false)
      cancelRequestedRef.current = false
      runAbortControllerRef.current = null
    }
  }

  function handleCancel() {
    setIsCancelling(true)
    cancelRequestedRef.current = true
    runAbortControllerRef.current?.abort('user-cancelled')
  }

  if (loadingConfig) {
    return <div style={loadingStyles}>加载中...</div>
  }

  return (
    <div style={styles.page}>
      <div style={styles.leftColumn}>
        <ModelConfigPanel
          providerType={providerType}
          endpoint={endpoint}
          endpointMode={endpointMode}
          modelName={modelName}
          apiKeyInput={apiKeyInput}
          apiKeySaved={apiKeySaved}
          timeoutMs={timeoutMs}
          rememberApiKey={rememberApiKey}
          saving={savingConfig}
          testing={testingConnection}
          onProviderTypeChange={setProviderType}
          onEndpointChange={setEndpoint}
          onEndpointModeChange={setEndpointMode}
          onModelNameChange={setModelName}
          onApiKeyChange={setApiKeyInput}
          onTimeoutChange={setTimeoutMs}
          onRememberApiKeyChange={setRememberApiKey}
          onSave={handleSaveConfig}
          onTest={handleTestConnection}
        />

        <InputSelectorPanel
          sourceType={sourceType}
          sourcePath={sourcePath}
          recursive={recursive}
          files={files}
          loading={loadingFiles}
          onPickFile={handlePickFile}
          onPickFolder={handlePickFolder}
          onRecursiveChange={handleRecursiveChange}
        />

        <OutputPanel outputDir={outputDir} onPickOutputDir={handlePickOutputDir} />
      </div>

      <div style={styles.middleColumn}>
        <PromptEditorPanel
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          templateNameInput={templateNameInput}
          promptContent={promptContent}
          saving={savingTemplate}
          deleting={deletingTemplate}
          onSelectTemplate={handleSelectTemplate}
          onTemplateNameChange={setTemplateNameInput}
          onPromptChange={setPromptContent}
          onNewTemplate={handleNewTemplate}
          onSaveTemplate={handleSaveTemplate}
          onDeleteTemplate={handleDeleteTemplate}
        />
      </div>

      <div style={styles.rightColumn}>
        <TaskPanel
          canStart={canStart}
          canCancel={canCancel}
          isRunning={isRunning}
          isCancelling={isCancelling}
          total={jobState?.total ?? 0}
          completed={jobState?.completed ?? 0}
          failed={jobState?.failed ?? 0}
          cancelledCount={jobState?.cancelledCount ?? 0}
          skippedCount={jobState?.skippedCount ?? 0}
          concurrency={concurrency}
          retryCount={retryCount}
          skipExistingOutput={skipExistingOutput}
          currentFileNames={currentFileNames}
          currentStage={currentStage}
          onConcurrencyChange={handleConcurrencyChange}
          onRetryCountChange={handleRetryCountChange}
          onSkipExistingOutputChange={handleSkipExistingOutputChange}
          onStart={handleStart}
          onCancel={handleCancel}
        />

        <ResultPanel
          latestOutputPath={latestOutputPath}
          latestOutputContent={latestOutputContent}
          latestError={latestError}
          latestChunking={latestChunking}
          jobState={jobState}
        />
      </div>
    </div>
  )
}

function selectedPromptName(
  selectedTemplateId: string | undefined,
  templates: PromptTemplate[],
): string | undefined {
  if (!selectedTemplateId) return undefined
  return templates.find((item) => item.id === selectedTemplateId)?.name
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (error && typeof error === 'object') {
    try {
      const serialized = JSON.stringify(error)
      if (serialized && serialized !== '{}') {
        return serialized
      }
    } catch {
      // ignore serialization failures
    }
  }

  return fallback
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.max(min, Math.min(max, Math.floor(value)))
}

const loadingStyles: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '16px',
  background: '#f5f7fb',
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr 360px',
    gap: '16px',
    padding: '16px',
    minHeight: '100vh',
    boxSizing: 'border-box',
    background: '#f5f7fb',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  middleColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
}
