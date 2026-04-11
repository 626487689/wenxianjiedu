import { TauriConfigRepository } from '../repositories/config/TauriConfigRepository'
import { TauriCredentialRepository } from '../repositories/credential/TauriCredentialRepository'
import { TauriFileGateway } from '../repositories/file/TauriFileGateway'
import { LocalPromptTemplateRepository } from '../repositories/template/LocalPromptTemplateRepository'
import { DefaultDocumentParser } from '../services/parser/DefaultDocumentParser'
import { DefaultPromptComposer } from '../services/prompt/DefaultPromptComposer'
import { OpenAICompatibleClient } from '../services/llm/OpenAICompatibleClient'
import { DefaultMarkdownWriter } from '../services/output/DefaultMarkdownWriter'
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

const configRepository = new TauriConfigRepository()
const credentialRepository = new TauriCredentialRepository()
const fileGateway = new TauriFileGateway()
const templateRepository = new LocalPromptTemplateRepository()

const documentParser = new DefaultDocumentParser(fileGateway)
const promptComposer = new DefaultPromptComposer()
const llmClient = new OpenAICompatibleClient()
const markdownWriter = new DefaultMarkdownWriter(fileGateway)

const runSingleInterpretationUseCase = new RunSingleInterpretationUseCase(
  credentialRepository,
  documentParser,
  promptComposer,
  llmClient,
  markdownWriter,
)

export const services = {
  repositories: {
    configRepository,
    credentialRepository,
    fileGateway,
    templateRepository,
  },
  useCases: {
    saveModelConfig: new SaveModelConfigUseCase(configRepository, credentialRepository),
    loadModelConfig: new LoadModelConfigUseCase(configRepository),
    testModelConnection: new TestModelConnectionUseCase(credentialRepository, llmClient),
    saveUiPreferences: new SaveUiPreferencesUseCase(configRepository),
    loadInputFiles: new LoadInputFilesUseCase(fileGateway),
    listTemplates: new ListTemplatesUseCase(templateRepository),
    saveTemplate: new SaveTemplateUseCase(templateRepository),
    deleteTemplate: new DeleteTemplateUseCase(templateRepository),
    runSingleInterpretation: runSingleInterpretationUseCase,
    runBatchInterpretation: new RunBatchInterpretationUseCase(runSingleInterpretationUseCase, fileGateway),
  },
}
