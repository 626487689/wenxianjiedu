import { render, screen, fireEvent } from '@testing-library/react'
import { InputSelectorPanel } from '../ui/components/InputSelectorPanel'
import { describe, it, expect, vi } from 'vitest'

const mockFiles = [
  { id: '1', name: 'test1.pdf', path: '/path/to/test1.pdf', ext: 'pdf' as const },
  { id: '2', name: 'test2.txt', path: '/path/to/test2.txt', ext: 'txt' as const },
]

const mockProps = {
  sourceType: null,
  sourcePath: '',
  recursive: false,
  files: [],
  loading: false,
  onPickFile: vi.fn(),
  onPickFolder: vi.fn(),
  onToggleZotero: vi.fn(),
  onRecursiveChange: vi.fn(),
}

describe('InputSelectorPanel', () => {
  it('should render action buttons', () => {
    render(<InputSelectorPanel {...mockProps} />)
    
    expect(screen.getByText('选择文件')).toBeInTheDocument()
    expect(screen.getByText('选择文件夹')).toBeInTheDocument()
    expect(screen.getByText('从Zotero选择')).toBeInTheDocument()
  })

  it('should call onPickFile when button is clicked', () => {
    const onPickFile = vi.fn()
    render(<InputSelectorPanel {...mockProps} onPickFile={onPickFile} />)
    
    fireEvent.click(screen.getByText('选择文件'))
    expect(onPickFile).toHaveBeenCalledTimes(1)
  })

  it('should call onPickFolder when button is clicked', () => {
    const onPickFolder = vi.fn()
    render(<InputSelectorPanel {...mockProps} onPickFolder={onPickFolder} />)
    
    fireEvent.click(screen.getByText('选择文件夹'))
    expect(onPickFolder).toHaveBeenCalledTimes(1)
  })

  it('should call onToggleZotero when button is clicked', () => {
    const onToggleZotero = vi.fn()
    render(<InputSelectorPanel {...mockProps} onToggleZotero={onToggleZotero} />)
    
    fireEvent.click(screen.getByText('从Zotero选择'))
    expect(onToggleZotero).toHaveBeenCalledTimes(1)
  })

  it('should show empty state when no files', () => {
    render(<InputSelectorPanel {...mockProps} />)
    
    expect(screen.getByText('暂无可处理文件')).toBeInTheDocument()
    expect(screen.getByText('点击上方按钮选择文件或文件夹')).toBeInTheDocument()
  })

  it('should render file list when files exist', () => {
    render(<InputSelectorPanel {...mockProps} files={mockFiles} />)
    
    expect(screen.getByText('test1.pdf')).toBeInTheDocument()
    expect(screen.getByText('test2.txt')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('TXT')).toBeInTheDocument()
  })

  it('should show file count badge', () => {
    render(<InputSelectorPanel {...mockProps} files={mockFiles} />)
    
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should toggle recursive checkbox', () => {
    const onRecursiveChange = vi.fn()
    render(<InputSelectorPanel {...mockProps} onRecursiveChange={onRecursiveChange} sourceType="folder" />)
    
    const checkbox = screen.getByLabelText('递归扫描子目录') as HTMLInputElement
    fireEvent.click(checkbox)
    expect(onRecursiveChange).toHaveBeenCalledWith(true)
  })

  it('should disable recursive checkbox when sourceType is not folder', () => {
    const { container } = render(<InputSelectorPanel {...mockProps} sourceType="file" />)
    
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(checkbox.disabled).toBe(true)
  })

  it('should display source path', () => {
    render(<InputSelectorPanel {...mockProps} sourcePath="/path/to/files" />)
    
    expect(screen.getByText('/path/to/files')).toBeInTheDocument()
  })

  it('should show loading state on buttons', () => {
    render(<InputSelectorPanel {...mockProps} loading={true} />)
    
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    })
  })
})
