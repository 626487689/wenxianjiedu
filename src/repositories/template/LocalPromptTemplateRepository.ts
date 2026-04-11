import type { PromptTemplate } from '../../types/prompt'
import type { PromptTemplateRepository } from './PromptTemplateRepository'
import { createId } from '../../utils/id'
import { nowIso } from '../../utils/time'

const TEMPLATE_STORAGE_KEY = 'literature_interpreter_prompt_templates'

export class LocalPromptTemplateRepository implements PromptTemplateRepository {
  async list(): Promise<PromptTemplate[]> {
    return this.loadAll()
  }

  async getById(id: string): Promise<PromptTemplate | null> {
    const templates = await this.loadAll()
    return templates.find((item) => item.id === id) ?? null
  }

  async create(input: { name: string; content: string }): Promise<PromptTemplate> {
    const templates = await this.loadAll()

    const template: PromptTemplate = {
      id: createId('tpl'),
      name: input.name.trim(),
      content: input.content,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }

    templates.unshift(template)
    this.saveAll(templates)
    return template
  }

  async update(template: PromptTemplate): Promise<PromptTemplate> {
    const templates = await this.loadAll()
    const index = templates.findIndex((item) => item.id === template.id)

    if (index < 0) {
      throw new Error('Template not found')
    }

    const updated: PromptTemplate = {
      ...template,
      updatedAt: nowIso(),
    }

    templates[index] = updated
    this.saveAll(templates)
    return updated
  }

  async remove(id: string): Promise<void> {
    const templates = await this.loadAll()
    const filtered = templates.filter((item) => item.id !== id)
    this.saveAll(filtered)
  }

  private async loadAll(): Promise<PromptTemplate[]> {
    try {
      const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as PromptTemplate[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private saveAll(templates: PromptTemplate[]) {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates))
  }
}
