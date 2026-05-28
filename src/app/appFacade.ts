import type { AppConfig } from '../types/config'
import type { PromptTemplate, ChunkingMetadata } from '../types/prompt'
import type { SourceFileRef } from '../types/file'
import type { JobState } from '../types/task'
import { services } from './services'
import { errorHandler } from '../services/error/ErrorHandlerService'
import { versionService } from '../services/version/VersionService'

function withErrorHandling<T extends (...args: any[]) => any>(func: T): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      return await func(...args)
    } catch (error) {
      errorHandler.handleError(error)
      const recovered = errorHandler.attemptRecovery(error)
      if (!recovered) {
        throw new Error(errorHandler.formatError(error))
      }
      return await func(...args)
    }
  }
}

export const appFacade = {
  loadInitialData: withErrorHandling(async (): Promise<{
    config: AppConfig
    apiKeySaved: boolean
    templates: PromptTemplate[]
  }> => {
    const [config, templates] = await Promise.all([
      services.useCases.loadModelConfig.execute(),
      services.useCases.listTemplates.execute(),
    ])

    let apiKeySaved = false
    try {
      apiKeySaved = await services.repositories.credentialRepository.hasApiKey()
    } catch {
      apiKeySaved = false
    }

    return {
      config: {
        ...config,
        apiKeySaved,
      },
      apiKeySaved,
      templates,
    }
  }),

  saveModelConfig: withErrorHandling(async (input: {
    providerType: 'openai_compatible' | 'anthropic' | 'google' | 'local'
    endpoint: string
    endpointMode: 'auto' | 'manual'
    modelName: string
    apiKey?: string
    rememberApiKey: boolean
    timeoutMs: number
  }): Promise<void> => {
    await services.useCases.saveModelConfig.execute(input)
  }),

  saveUiPreferences: withErrorHandling(async (input: {
    lastInputPath?: string
    lastOutputPath?: string
    recursiveDefault?: boolean
    concurrency?: number
    retryCount?: number
    skipExistingOutput?: boolean
  }): Promise<void> => {
    await services.useCases.saveUiPreferences.execute(input)
  }),

  testModelConnection: withErrorHandling(async (input: {
    providerType: 'openai_compatible' | 'anthropic' | 'google' | 'local'
    endpoint: string
    endpointMode: 'auto' | 'manual'
    modelName: string
    timeoutMs: number
    runtimeApiKey?: string
  }): Promise<{ normalizedEndpoint: string; preview: string }> => {
    return services.useCases.testModelConnection.execute({
      modelConfig: {
        providerType: input.providerType,
        endpoint: input.endpoint,
        endpointMode: input.endpointMode,
        modelName: input.modelName,
        timeoutMs: input.timeoutMs,
      },
      runtimeApiKey: input.runtimeApiKey,
    })
  }),

  pickSingleFile: withErrorHandling(async (): Promise<string | null> => {
    return services.repositories.fileGateway.pickSingleFile()
  }),

  pickFolder: withErrorHandling(async (): Promise<string | null> => {
    return services.repositories.fileGateway.pickFolder()
  }),

  pickOutputDirectory: withErrorHandling(async (): Promise<string | null> => {
    return services.repositories.fileGateway.pickOutputDirectory()
  }),

  loadFiles: withErrorHandling(async (input: {
    sourcePath: string
    sourceType: 'file' | 'folder'
    recursive: boolean
  }): Promise<SourceFileRef[]> => {
    return services.useCases.loadInputFiles.execute(input)
  }),

  listTemplates: withErrorHandling(async (): Promise<PromptTemplate[]> => {
    return services.useCases.listTemplates.execute()
  }),

  saveTemplate: withErrorHandling(async (input: {
    id?: string
    name: string
    content: string
  }): Promise<PromptTemplate> => {
    return services.useCases.saveTemplate.execute(input)
  }),

  deleteTemplate: withErrorHandling(async (id: string): Promise<void> => {
    await services.useCases.deleteTemplate.execute(id)
  }),

  getZoteroItems: withErrorHandling(async (): Promise<any[]> => {
    return services.repositories.zoteroRepository.getZoteroItems()
  }),

  getZoteroCollections: withErrorHandling(async (): Promise<{ id: string; name: string }[]> => {
    return services.repositories.zoteroRepository.getCollections()
  }),

  getZoteroItemsByCollection: withErrorHandling(async (collectionId: string): Promise<any[]> => {
    return services.repositories.zoteroRepository.getItemsByCollection(collectionId)
  }),

  setZoteroDbPath: withErrorHandling(async (path: string): Promise<void> => {
    services.repositories.zoteroRepository.setZoteroDbPath(path)
  }),

  getZoteroDbPath: withErrorHandling(async (): Promise<string> => {
    return services.repositories.zoteroRepository.getZoteroDbPath()
  }),

  isZoteroAvailable: withErrorHandling(async (): Promise<boolean> => {
    return services.repositories.zoteroRepository.isZoteroAvailable()
  }),

  runSingle: withErrorHandling(async (input: {
    file: SourceFileRef
    outputDir: string
    promptContent: string
    promptName?: string
    modelConfig: {
      providerType: 'openai_compatible' | 'anthropic' | 'google' | 'local'
      endpoint: string
      endpointMode: 'auto' | 'manual'
      modelName: string
      timeoutMs: number
      temperature?: number
      maxTokens?: number
    }
    runtimeApiKey?: string
    signal?: AbortSignal
    onStageChange?: (stage: string) => void
    enableChunking?: boolean
  }): Promise<{ outputPath: string; content: string; chunking?: ChunkingMetadata; paperDirection?: any }> => {
    const runSingleInterpretation = await services.container.getAsync<any>('runSingleInterpretation')
    return runSingleInterpretation.execute(input)
  }),

  runBatch: withErrorHandling(async (input: {
    files: SourceFileRef[]
    outputDir: string
    promptContent: string
    promptName?: string
    modelConfig: {
      providerType: 'openai_compatible' | 'anthropic' | 'google' | 'local'
      endpoint: string
      endpointMode: 'auto' | 'manual'
      modelName: string
      timeoutMs: number
      temperature?: number
      maxTokens?: number
    }
    batchConfig: {
      concurrency: number
      retryCount: number
      skipExistingOutput: boolean
    }
    runtimeApiKey?: string
    signal?: AbortSignal
    onProgress?: (state: JobState) => void
    onStageChange?: (stage: string) => void
    shouldCancel?: () => boolean
    enableChunking?: boolean
  }): Promise<JobState> => {
    const runBatchInterpretation = await services.container.getAsync<any>('runBatchInterpretation')
    return runBatchInterpretation.execute(input)
  }),

  getVersionInfo: withErrorHandling(async (): Promise<any> => {
    return versionService.getVersionInfo()
  }),

  getVersionChangelog: withErrorHandling(async (): Promise<string> => {
    return versionService.getVersionChangelog()
  }),

  isNewVersion: withErrorHandling(async (currentVersion: string): Promise<boolean> => {
    return versionService.isNewVersion(currentVersion)
  }),
}

// 初始化时打印版本信息
versionService.logVersionInfo()
