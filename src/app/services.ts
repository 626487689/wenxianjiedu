import { TauriConfigRepository } from '../repositories/config/TauriConfigRepository'
import type { ConfigRepository } from '../repositories/config/ConfigRepository'
import { TauriCredentialRepository } from '../repositories/credential/TauriCredentialRepository'
import type { CredentialRepository } from '../repositories/credential/CredentialRepository'
import { TauriFileGateway } from '../repositories/file/TauriFileGateway'
import { BrowserFileGateway } from '../repositories/file/BrowserFileGateway'
import type { FileGateway } from '../repositories/file/FileGateway'
import { LocalPromptTemplateRepository } from '../repositories/template/LocalPromptTemplateRepository'
import type { PromptTemplateRepository } from '../repositories/template/PromptTemplateRepository'
import { LocalZoteroRepository } from '../repositories/zotero/LocalZoteroRepository'
import type { ZoteroRepository } from '../repositories/zotero/ZoteroRepository'
import { DefaultDocumentParser } from '../services/parser/DefaultDocumentParser'
import type { DocumentParser } from '../services/parser/DocumentParser'
import { DefaultPromptComposer } from '../services/prompt/DefaultPromptComposer'
import type { PromptComposer } from '../services/prompt/PromptComposer'
import { ModelClientFactory } from '../services/llm/ModelClientFactory'
import { DefaultMarkdownWriter } from '../services/output/DefaultMarkdownWriter'
import { ObsidianMarkdownWriter } from '../services/output/ObsidianMarkdownWriter'
import type { MarkdownWriter } from '../services/output/MarkdownWriter'
import { SaveModelConfigUseCase } from '../usecases/config/SaveModelConfigUseCase'
import { LoadModelConfigUseCase } from '../usecases/config/LoadModelConfigUseCase'
import { TestModelConnectionUseCase } from '../usecases/config/TestModelConnectionUseCase'
import { SaveUiPreferencesUseCase } from '../usecases/config/SaveUiPreferencesUseCase'
import { LoadInputFilesUseCase } from '../usecases/files/LoadInputFilesUseCase'
import { ListTemplatesUseCase } from '../usecases/templates/ListTemplatesUseCase'
import { SaveTemplateUseCase } from '../usecases/templates/SaveTemplateUseCase'
import { DeleteTemplateUseCase } from '../usecases/templates/DeleteTemplateUseCase'
import { RunSingleInterpretationUseCase } from '../usecases/run/RunSingleInterpretationUseCase'
import { RunBatchInterpretationUseCase } from '../usecases/run/RunBatchInterpretationUseCase'
import { container } from '../utils/dependencyInjection'

// 判断是否在 Tauri 环境中运行
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__

// 注册仓库服务
container.registerSingleton<ConfigRepository>('configRepository', () => new TauriConfigRepository())
container.registerSingleton<CredentialRepository>('credentialRepository', () => new TauriCredentialRepository())
container.registerSingleton<FileGateway>('fileGateway', () => 
  isTauri ? new TauriFileGateway() : new BrowserFileGateway()
)
container.registerSingleton<PromptTemplateRepository>('templateRepository', () => new LocalPromptTemplateRepository())
container.registerSingleton<ZoteroRepository>('zoteroRepository', () => new LocalZoteroRepository())

// 注册服务
container.registerSingleton<DocumentParser>('documentParser', () => new DefaultDocumentParser(container.get<FileGateway>('fileGateway')))
container.registerSingleton<PromptComposer>('promptComposer', () => new DefaultPromptComposer())
container.registerSingleton<MarkdownWriter>('defaultMarkdownWriter', () => new DefaultMarkdownWriter(container.get<FileGateway>('fileGateway')))
container.registerSingleton<MarkdownWriter>('obsidianMarkdownWriter', () => new ObsidianMarkdownWriter(container.get<FileGateway>('fileGateway')))

// 注册MarkdownWriter工厂
container.registerAsync<MarkdownWriter>('markdownWriter', async () => {
  const configRepository = container.get<ConfigRepository>('configRepository')
  const defaultMarkdownWriter = container.get<MarkdownWriter>('defaultMarkdownWriter')
  const obsidianMarkdownWriter = container.get<MarkdownWriter>('obsidianMarkdownWriter')

  const config = await configRepository.loadAppConfig()
  return config.outputFormat === 'obsidian' ? obsidianMarkdownWriter : defaultMarkdownWriter
})

// 注册用例服务
container.register<SaveModelConfigUseCase>('saveModelConfig', () => new SaveModelConfigUseCase(
  container.get<ConfigRepository>('configRepository'),
  container.get<CredentialRepository>('credentialRepository')
))
container.register<LoadModelConfigUseCase>('loadModelConfig', () => new LoadModelConfigUseCase(
  container.get<ConfigRepository>('configRepository')
))
container.register<TestModelConnectionUseCase>('testModelConnection', () => new TestModelConnectionUseCase(
  container.get<CredentialRepository>('credentialRepository'),
  ModelClientFactory
))
container.register<SaveUiPreferencesUseCase>('saveUiPreferences', () => new SaveUiPreferencesUseCase(
  container.get<ConfigRepository>('configRepository')
))
container.register<LoadInputFilesUseCase>('loadInputFiles', () => new LoadInputFilesUseCase(
  container.get<FileGateway>('fileGateway')
))
container.register<ListTemplatesUseCase>('listTemplates', () => new ListTemplatesUseCase(
  container.get<PromptTemplateRepository>('templateRepository')
))
container.register<SaveTemplateUseCase>('saveTemplate', () => new SaveTemplateUseCase(
  container.get<PromptTemplateRepository>('templateRepository')
))
container.register<DeleteTemplateUseCase>('deleteTemplate', () => new DeleteTemplateUseCase(
  container.get<PromptTemplateRepository>('templateRepository')
))

// 注册RunSingleInterpretationUseCase
container.registerSingletonAsync<RunSingleInterpretationUseCase>('runSingleInterpretation', async () => {
  const credentialRepository = container.get<CredentialRepository>('credentialRepository')
  const documentParser = container.get<DocumentParser>('documentParser')
  const promptComposer = container.get<PromptComposer>('promptComposer')
  const markdownWriter = await container.getAsync<MarkdownWriter>('markdownWriter')

  return new RunSingleInterpretationUseCase(
    credentialRepository,
    documentParser,
    promptComposer,
    ModelClientFactory,
    markdownWriter
  )
})

// 注册RunBatchInterpretationUseCase
container.registerSingletonAsync<RunBatchInterpretationUseCase>('runBatchInterpretation', async () => {
  const runSingleInterpretation = await container.getAsync<RunSingleInterpretationUseCase>('runSingleInterpretation')
  const fileGateway = container.get<FileGateway>('fileGateway')

  return new RunBatchInterpretationUseCase(
    runSingleInterpretation,
    fileGateway
  )
})

// 初始化服务
async function initializeServices() {
  try {
    // 预初始化一些关键服务
    await container.getAsync<RunSingleInterpretationUseCase>('runSingleInterpretation')
    await container.getAsync<RunBatchInterpretationUseCase>('runBatchInterpretation')
    console.log('Services initialized successfully')
  } catch (error) {
    console.error('Failed to initialize services:', error)
  }
}

// 立即初始化
initializeServices().catch(console.error)

export const services = {
  repositories: {
    get configRepository(): ConfigRepository {
      return container.get<ConfigRepository>('configRepository')
    },
    get credentialRepository(): CredentialRepository {
      return container.get<CredentialRepository>('credentialRepository')
    },
    get fileGateway(): FileGateway {
      return container.get<FileGateway>('fileGateway')
    },
    get templateRepository(): PromptTemplateRepository {
      return container.get<PromptTemplateRepository>('templateRepository')
    },
    get zoteroRepository(): ZoteroRepository {
      return container.get<ZoteroRepository>('zoteroRepository')
    },
  },
  useCases: {
    get saveModelConfig(): SaveModelConfigUseCase {
      return container.get<SaveModelConfigUseCase>('saveModelConfig')
    },
    get loadModelConfig(): LoadModelConfigUseCase {
      return container.get<LoadModelConfigUseCase>('loadModelConfig')
    },
    get testModelConnection(): TestModelConnectionUseCase {
      return container.get<TestModelConnectionUseCase>('testModelConnection')
    },
    get saveUiPreferences(): SaveUiPreferencesUseCase {
      return container.get<SaveUiPreferencesUseCase>('saveUiPreferences')
    },
    get loadInputFiles(): LoadInputFilesUseCase {
      return container.get<LoadInputFilesUseCase>('loadInputFiles')
    },
    get listTemplates(): ListTemplatesUseCase {
      return container.get<ListTemplatesUseCase>('listTemplates')
    },
    get saveTemplate(): SaveTemplateUseCase {
      return container.get<SaveTemplateUseCase>('saveTemplate')
    },
    get deleteTemplate(): DeleteTemplateUseCase {
      return container.get<DeleteTemplateUseCase>('deleteTemplate')
    },
    get runSingleInterpretation(): RunSingleInterpretationUseCase {
      return container.get<RunSingleInterpretationUseCase>('runSingleInterpretation')
    },
    get runBatchInterpretation(): RunBatchInterpretationUseCase {
      return container.get<RunBatchInterpretationUseCase>('runBatchInterpretation')
    },
  },
  container,
}
