import type { PromptTemplate } from '../../types/prompt'
import type { PromptTemplateRepository } from '../../repositories/template/PromptTemplateRepository'
import { nowIso } from '../../utils/time'
import { isNonEmpty } from '../../utils/validate'

export interface SaveTemplateInput {
  id?: string
  name: string
  content: string
}

export class SaveTemplateUseCase {
  constructor(private readonly templateRepository: PromptTemplateRepository) {}

  async execute(input: SaveTemplateInput): Promise<PromptTemplate> {
    const name = input.name.trim()
    const content = input.content

    if (!isNonEmpty(name)) {
      throw new Error('模板名称不能为空')
    }

    if (!isNonEmpty(content)) {
      throw new Error('提示词内容不能为空')
    }

    if (!input.id) {
      return this.templateRepository.create({ name, content })
    }

    const existing = await this.templateRepository.getById(input.id)
    if (!existing) {
      throw new Error('模板不存在')
    }

    return this.templateRepository.update({
      ...existing,
      name,
      content,
      updatedAt: nowIso(),
    })
  }
}
