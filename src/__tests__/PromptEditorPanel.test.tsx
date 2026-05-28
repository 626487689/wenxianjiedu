import { render, screen, fireEvent } from '@testing-library/react'
import { PromptEditorPanel } from '../ui/components/PromptEditorPanel'
import { describe, it, expect, vi } from 'vitest'

const mockTemplates = [
  { id: '1', name: 'Template 1', content: 'Content 1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '2', name: 'Template 2', content: 'Content 2', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
]

const mockProps = {
  templates: mockTemplates,
  selectedTemplateId: undefined,
  templateNameInput: '',
  promptContent: '',
  saving: false,
  deleting: false,
  onSelectTemplate: vi.fn(),
  onTemplateNameChange: vi.fn(),
  onPromptChange: vi.fn(),
  onNewTemplate: vi.fn(),
  onSaveTemplate: vi.fn(),
  onDeleteTemplate: vi.fn(),
}

describe('PromptEditorPanel', () => {
  it('should render template selector', () => {
    render(<PromptEditorPanel {...mockProps} />)
    
    expect(screen.getByLabelText('模板')).toBeInTheDocument()
  })

  it('should render template name input', () => {
    render(<PromptEditorPanel {...mockProps} />)
    
    expect(screen.getByLabelText('模板名称')).toBeInTheDocument()
  })

  it('should render prompt editor', () => {
    const { container } = render(<PromptEditorPanel {...mockProps} />)
    
    const textarea = container.querySelector('textarea')
    expect(textarea).toBeInTheDocument()
  })

  it('should display character and word count', () => {
    render(<PromptEditorPanel {...mockProps} promptContent="Hello world" />)
    
    expect(screen.getByText('11 字符 · 2 词')).toBeInTheDocument()
  })

  it('should call onTemplateNameChange when input changes', () => {
    const onTemplateNameChange = vi.fn()
    render(<PromptEditorPanel {...mockProps} onTemplateNameChange={onTemplateNameChange} />)
    
    const input = screen.getByLabelText('模板名称') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'New Template' } })
    expect(onTemplateNameChange).toHaveBeenCalledWith('New Template')
  })

  it('should call onPromptChange when textarea changes', () => {
    const onPromptChange = vi.fn()
    const { container } = render(<PromptEditorPanel {...mockProps} onPromptChange={onPromptChange} />)
    
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'New prompt content' } })
    expect(onPromptChange).toHaveBeenCalledWith('New prompt content')
  })

  it('should call onSelectTemplate when template is selected', () => {
    const onSelectTemplate = vi.fn()
    render(<PromptEditorPanel {...mockProps} onSelectTemplate={onSelectTemplate} />)
    
    const select = screen.getByLabelText('模板') as HTMLSelectElement
    fireEvent.change(select, { target: { value: '1' } })
    expect(onSelectTemplate).toHaveBeenCalledWith('1')
  })

  it('should call onNewTemplate when button is clicked', () => {
    const onNewTemplate = vi.fn()
    render(<PromptEditorPanel {...mockProps} onNewTemplate={onNewTemplate} />)
    
    fireEvent.click(screen.getByText('新建模板'))
    expect(onNewTemplate).toHaveBeenCalledTimes(1)
  })

  it('should call onSaveTemplate when button is clicked', () => {
    const onSaveTemplate = vi.fn()
    const { container } = render(<PromptEditorPanel {...mockProps} onSaveTemplate={onSaveTemplate} />)
    
    const buttons = container.querySelectorAll('button')
    const saveButton = Array.from(buttons).find(btn => btn.textContent?.includes('保存模板'))
    fireEvent.click(saveButton!)
    expect(onSaveTemplate).toHaveBeenCalledTimes(1)
  })

  it('should show saving state when saving is true', () => {
    const { container } = render(<PromptEditorPanel {...mockProps} saving={true} />)
    
    expect(screen.getByText('保存中...')).toBeInTheDocument()
    expect(container.textContent).not.toContain('保存模板')
  })

  it('should call onDeleteTemplate when button is clicked', () => {
    const onDeleteTemplate = vi.fn()
    const { container } = render(<PromptEditorPanel {...mockProps} selectedTemplateId="1" onDeleteTemplate={onDeleteTemplate} />)
    
    const buttons = container.querySelectorAll('button')
    const deleteButton = Array.from(buttons).find(btn => btn.textContent?.includes('删除模板'))
    fireEvent.click(deleteButton!)
    expect(onDeleteTemplate).toHaveBeenCalledTimes(1)
  })

  it('should disable delete button when no template is selected', () => {
    const { container } = render(<PromptEditorPanel {...mockProps} selectedTemplateId={undefined} />)
    
    const deleteButton = container.querySelector('button:last-child')
    expect((deleteButton as HTMLButtonElement | null)?.disabled).toBe(true)
  })

  it('should show deleting state when deleting is true', () => {
    const { container } = render(<PromptEditorPanel {...mockProps} selectedTemplateId="1" deleting={true} />)
    
    expect(screen.getByText('删除中...')).toBeInTheDocument()
    expect(container.textContent).not.toContain('删除模板')
  })

  it('should display tip message', () => {
    render(<PromptEditorPanel {...mockProps} />)
    
    expect(screen.getByText((content: string) => content.includes('使用清晰的指令和格式要求可以获得更好的解读效果'))).toBeInTheDocument()
  })
})
