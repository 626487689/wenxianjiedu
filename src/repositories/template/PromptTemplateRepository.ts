import type { PromptTemplate } from '../../types/prompt'

export interface PromptTemplateRepository {
  list(): Promise<PromptTemplate[]>
  create(input: { name: string; content: string }): Promise<PromptTemplate>
  update(template: PromptTemplate): Promise<PromptTemplate>
  remove(id: string): Promise<void>
  getById(id: string): Promise<PromptTemplate | null>
}
