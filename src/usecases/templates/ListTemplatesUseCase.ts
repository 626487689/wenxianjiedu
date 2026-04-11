import type { PromptTemplateRepository } from '../../repositories/template/PromptTemplateRepository'

export class ListTemplatesUseCase {
  constructor(private readonly templateRepository: PromptTemplateRepository) {}

  async execute() {
    return this.templateRepository.list()
  }
}
