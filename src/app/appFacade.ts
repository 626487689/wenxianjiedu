import type { AppConfig } from '../types/config'
import type { PromptTemplate, ChunkingMetadata } from '../types/prompt'
import type { SourceFileRef } from '../types/file'
import type { JobState } from '../types/task'
import { services } from './services'

export const appFacade = {
  async loadInitialData(): Promise<{
    config: AppConfig
    apiKeySaved: boolean
    templates: PromptTemplate[]
  }> {
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
  },

  async saveModelConfig(input: {
    providerType: 'openai_compatible'
    endpoint: string
    endpointMode: 'auto' | 'manual'
    modelName: string
    apiKey?: string
    rememberApiKey: boolean
    timeoutMs: number
  }): Promise<void> {
    await services.useCases.saveModelConfig.execute(input)
  },

  async saveUiPreferences(input: {
    lastInputPath?: string
    lastOutputPath?: string
    recursiveDefault?: boolean
    concurrency?: number
    retryCount?: number
    skipExistingOutput?: boolean
  }): Promise<void> {
    await services.useCases.saveUiPreferences.execute(input)
  },

  async testModelConnection(input: {
    providerType: 'openai_compatible'
    endpoint: string
    endpointMode: 'auto' | 'manual'
    modelName: string
    timeoutMs: number
    runtimeApiKey?: string
  }): Promise<{ normalizedEndpoint: string; preview: string }> {
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
  },

  async pickSingleFile(): Promise<string | null> {
    return services.repositories.fileGateway.pickSingleFile()
  },

  async pickFolder(): Promise<string | null> {
    return services.repositories.fileGateway.pickFolder()
  },

  async pickOutputDirectory(): Promise<string | null> {
    return services.repositories.fileGateway.pickOutputDirectory()
  },

  async loadFiles(input: {
    sourcePath: string
    sourceType: 'file' | 'folder'
    recursive: boolean
  }): Promise<SourceFileRef[]> {
    return services.useCases.loadInputFiles.execute(input)
  },

  async listTemplates(): Promise<PromptTemplate[]> {
    return services.useCases.listTemplates.execute()
  },

  async saveTemplate(input: {
    id?: string
    name: string
    content: string
  }): Promise<PromptTemplate> {
    return services.useCases.saveTemplate.execute(input)
  },

  async deleteTemplate(id: string): Promise<void> {
    await services.useCases.deleteTemplate.execute(id)
  },

  async runSingle(input: {
    file: SourceFileRef
    outputDir: string
    promptContent: string
    promptName?: string
    modelConfig: {
      providerType: 'openai_compatible'
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
  }): Promise<{ outputPath: string; content: string; chunking?: ChunkingMetadata }> {
    return services.useCases.runSingleInterpretation.execute(input)
  },

  async runBatch(input: {
    files: SourceFileRef[]
    outputDir: string
    promptContent: string
    promptName?: string
    modelConfig: {
      providerType: 'openai_compatible'
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
  }): Promise<JobState> {
    return services.useCases.runBatchInterpretation.execute(input)
  },
}
