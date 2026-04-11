import type { PromptTemplateRepository } from '../../repositories/template/PromptTemplateRepository'

export class DeleteTemplateUseCase {
  constructor(private readonly templateRepository: PromptTemplateRepository) {}

  async execute(id: string): Promise<void> {
    if (!id.trim()) {
      throw new Error('模板 ID 不能为空')
    }

    await this.templateRepository.remove(id)
  }
}
