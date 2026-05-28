import { render, screen, fireEvent } from '@testing-library/react'
import { TaskPanel } from '../ui/components/TaskPanel'
import { describe, it, expect, vi } from 'vitest'

const mockProps = {
  canStart: true,
  canCancel: false,
  isRunning: false,
  isCancelling: false,
  total: 5,
  completed: 2,
  failed: 1,
  cancelledCount: 0,
  skippedCount: 0,
  concurrency: 2,
  retryCount: 1,
  skipExistingOutput: false,
  enableChunking: true,
  currentFileNames: [],
  currentStage: undefined,
  onConcurrencyChange: vi.fn(),
  onRetryCountChange: vi.fn(),
  onSkipExistingOutputChange: vi.fn(),
  onEnableChunkingChange: vi.fn(),
  onStart: vi.fn(),
  onCancel: vi.fn(),
}

describe('TaskPanel', () => {
  it('should render stats correctly', () => {
    const { container } = render(<TaskPanel {...mockProps} />)
    
    expect(screen.getByText('总数')).toBeInTheDocument()
    expect(screen.getByText('完成')).toBeInTheDocument()
    expect(screen.getByText('失败')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()
    expect(screen.getByText('跳过')).toBeInTheDocument()
    
    // Check stats are present in container
    const content = container.textContent || ''
    expect(content).toContain('5')
    expect(content).toContain('2')
    expect(content).toContain('1')
    expect(content).toContain('0')
    expect(screen.getByText('剩余')).toBeInTheDocument()
  })

  it('should render start button', () => {
    render(<TaskPanel {...mockProps} />)
    
    expect(screen.getByText('开始处理')).toBeInTheDocument()
  })

  it('should call onStart when start button is clicked', () => {
    const onStart = vi.fn()
    const { container } = render(<TaskPanel {...mockProps} onStart={onStart} />)
    
    const buttons = container.querySelectorAll('button')
    const startButton = Array.from(buttons).find(btn => btn.textContent?.includes('开始处理'))
    fireEvent.click(startButton!)
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('should show processing state when isRunning is true', () => {
    const { container } = render(<TaskPanel {...mockProps} isRunning={true} />)
    
    expect(screen.getByText('处理中...')).toBeInTheDocument()
    expect(container.textContent).not.toContain('开始处理')
  })

  it('should show cancel button when canCancel is true', () => {
    const { container } = render(<TaskPanel {...mockProps} canCancel={true} />)
    
    expect(container.textContent).toContain('取消任务')
  })

  it('should call onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    const { container } = render(<TaskPanel {...mockProps} canCancel={true} onCancel={onCancel} />)
    
    const buttons = container.querySelectorAll('button')
    const cancelButton = Array.from(buttons).find(btn => btn.textContent?.includes('取消任务'))
    fireEvent.click(cancelButton!)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('should show cancelling state when isCancelling is true', () => {
    const { container } = render(<TaskPanel {...mockProps} canCancel={true} isCancelling={true} />)
    
    expect(screen.getByText('取消中...')).toBeInTheDocument()
    expect(container.textContent).not.toContain('取消任务')
  })

  it('should increment concurrency when + button is clicked', () => {
    const onConcurrencyChange = vi.fn()
    render(<TaskPanel {...mockProps} onConcurrencyChange={onConcurrencyChange} />)
    
    const buttons = screen.getAllByRole('button')
    const incrementButton = buttons.find(btn => btn.textContent === '+')
    fireEvent.click(incrementButton!)
    expect(onConcurrencyChange).toHaveBeenCalledWith(3)
  })

  it('should decrement concurrency when - button is clicked', () => {
    const onConcurrencyChange = vi.fn()
    render(<TaskPanel {...mockProps} onConcurrencyChange={onConcurrencyChange} />)
    
    const buttons = screen.getAllByRole('button')
    const decrementButton = buttons.find(btn => btn.textContent === '-')
    fireEvent.click(decrementButton!)
    expect(onConcurrencyChange).toHaveBeenCalledWith(1)
  })

  it('should increment retry count when + button is clicked', () => {
    const onRetryCountChange = vi.fn()
    render(<TaskPanel {...mockProps} onRetryCountChange={onRetryCountChange} />)
    
    const buttons = screen.getAllByRole('button')
    const retryIncrementButton = buttons.filter(btn => btn.textContent === '+')[1]
    fireEvent.click(retryIncrementButton!)
    expect(onRetryCountChange).toHaveBeenCalledWith(2)
  })

  it('should toggle skipExistingOutput checkbox', () => {
    const onSkipExistingOutputChange = vi.fn()
    render(<TaskPanel {...mockProps} onSkipExistingOutputChange={onSkipExistingOutputChange} />)
    
    const checkbox = screen.getByLabelText('跳过已有输出文件') as HTMLInputElement
    fireEvent.click(checkbox)
    expect(onSkipExistingOutputChange).toHaveBeenCalledWith(true)
  })

  it('should toggle enableChunking checkbox', () => {
    const onEnableChunkingChange = vi.fn()
    render(<TaskPanel {...mockProps} onEnableChunkingChange={onEnableChunkingChange} />)
    
    const checkbox = screen.getByLabelText('启用分块处理') as HTMLInputElement
    fireEvent.click(checkbox)
    expect(onEnableChunkingChange).toHaveBeenCalledWith(false)
  })

  it('should display progress percentage', () => {
    render(<TaskPanel {...mockProps} />)
    
    expect(screen.getByText('进度')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('should display current file names', () => {
    render(<TaskPanel {...mockProps} currentFileNames={['file1.pdf', 'file2.pdf']} />)
    
    expect(screen.getByText('file1.pdf，file2.pdf')).toBeInTheDocument()
  })

  it('should display current stage', () => {
    render(<TaskPanel {...mockProps} currentStage="解析文件" />)
    
    expect(screen.getByText('解析文件')).toBeInTheDocument()
  })
})
