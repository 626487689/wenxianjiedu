import { render, screen, fireEvent } from '@testing-library/react'
import { OutputPanel } from '../ui/components/OutputPanel'
import { describe, it, expect, vi } from 'vitest'

const mockProps = {
  outputDir: '',
  outputFormat: 'default' as const,
  onPickOutputDir: vi.fn(),
  onOutputFormatChange: vi.fn(),
}

describe('OutputPanel', () => {
  it('should render pick directory button', () => {
    render(<OutputPanel {...mockProps} />)
    
    expect(screen.getByText('选择输出目录')).toBeInTheDocument()
  })

  it('should call onPickOutputDir when button is clicked', () => {
    const onPickOutputDir = vi.fn()
    render(<OutputPanel {...mockProps} onPickOutputDir={onPickOutputDir} />)
    
    fireEvent.click(screen.getByText('选择输出目录'))
    expect(onPickOutputDir).toHaveBeenCalledTimes(1)
  })

  it('should display output directory', () => {
    render(<OutputPanel {...mockProps} outputDir="/path/to/output" />)
    
    expect(screen.getByText('/path/to/output')).toBeInTheDocument()
  })

  it('should display empty state when no directory is selected', () => {
    render(<OutputPanel {...mockProps} />)
    
    expect(screen.getByText('未选择')).toBeInTheDocument()
  })

  it('should render format options', () => {
    render(<OutputPanel {...mockProps} />)
    
    expect(screen.getByText('默认 Markdown')).toBeInTheDocument()
    expect(screen.getByText('Obsidian 兼容')).toBeInTheDocument()
  })

  it('should call onOutputFormatChange when format is selected', () => {
    const onOutputFormatChange = vi.fn()
    render(<OutputPanel {...mockProps} onOutputFormatChange={onOutputFormatChange} />)
    
    fireEvent.click(screen.getByText('Obsidian 兼容'))
    expect(onOutputFormatChange).toHaveBeenCalledWith('obsidian')
  })

  it('should show default format as active', () => {
    const { container } = render(<OutputPanel {...mockProps} outputFormat="default" />)
    
    const buttons = container.querySelectorAll('[data-testid="format-option"]')
    expect(buttons.length).toBe(2)
    expect(buttons[0].getAttribute('data-active')).toBe('true')
    expect(buttons[1].getAttribute('data-active')).toBe('false')
  })

  it('should show obsidian format as active', () => {
    const { container } = render(<OutputPanel {...mockProps} outputFormat="obsidian" />)
    
    const buttons = container.querySelectorAll('[data-testid="format-option"]')
    expect(buttons.length).toBe(2)
    expect(buttons[1].getAttribute('data-active')).toBe('true')
    expect(buttons[0].getAttribute('data-active')).toBe('false')
  })

  it('should display tip message', () => {
    render(<OutputPanel {...mockProps} />)
    
    expect(screen.getByText('输出文件将以 Markdown 格式保存，支持表格、代码块等格式。')).toBeInTheDocument()
  })
})
