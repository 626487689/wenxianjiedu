import { render, screen, fireEvent } from '@testing-library/react'
import { ResultPanel } from '../ui/components/ResultPanel'
import { describe, it, expect, vi } from 'vitest'

const mockProps = {
  latestOutputPath: undefined,
  latestOutputContent: undefined,
  latestError: undefined,
  latestChunking: undefined,
  latestPaperDirection: undefined,
  jobState: null,
}

describe('ResultPanel', () => {
  it('should render all sections', () => {
    render(<ResultPanel {...mockProps} />)
    
    expect(screen.getByText('最近输出路径')).toBeInTheDocument()
    expect(screen.getByText('批处理报告')).toBeInTheDocument()
    expect(screen.getByText('最近错误')).toBeInTheDocument()
    expect(screen.getByText('长文处理状态')).toBeInTheDocument()
    expect(screen.getByText('论文方向分析')).toBeInTheDocument()
    expect(screen.getByText('批量长文统计')).toBeInTheDocument()
    expect(screen.getByText('批处理汇总')).toBeInTheDocument()
    expect(screen.getByText('任务项状态')).toBeInTheDocument()
    expect(screen.getByText('最近结果预览')).toBeInTheDocument()
  })

  it('should display output path when available', () => {
    render(<ResultPanel {...mockProps} latestOutputPath="/path/to/output.md" />)
    
    expect(screen.getByText('/path/to/output.md')).toBeInTheDocument()
  })

  it('should show copy button for output path', () => {
    render(<ResultPanel {...mockProps} latestOutputPath="/path/to/output.md" />)
    
    const buttons = screen.getAllByText('复制')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should copy to clipboard when copy button is clicked', async () => {
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    render(<ResultPanel {...mockProps} latestOutputPath="/path/to/output.md" />)
    
    const copyButton = screen.getAllByText('复制')[0]
    fireEvent.click(copyButton)
    
    expect(writeTextSpy).toHaveBeenCalledWith('/path/to/output.md')
  })

  it('should show copied feedback', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    render(<ResultPanel {...mockProps} latestOutputPath="/path/to/output.md" />)
    
    const copyButton = screen.getAllByText('复制')[0]
    fireEvent.click(copyButton)
    
    expect(await screen.findByText('✓ 已复制')).toBeInTheDocument()
  })

  it('should display error when available', () => {
    render(<ResultPanel {...mockProps} latestError="Test error message" />)
    
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('should display output content in preview', () => {
    const { container } = render(<ResultPanel {...mockProps} latestOutputContent="# Test Output\n\nThis is a test output." />)
    
    const content = container.textContent || ''
    expect(content).toContain('Test Output')
    expect(content).toContain('This is a test output.')
  })

  it('should toggle sections when clicked', () => {
    const { container } = render(<ResultPanel {...mockProps} />)
    
    const sectionHeader = screen.getByText('最近输出路径').parentElement?.parentElement
    fireEvent.click(sectionHeader!)
    
    const sectionContent = container.querySelector('.animate-fadeIn')
    expect(sectionContent).toBeInTheDocument()
  })

  it('should display job state items', () => {
    const jobState = {
      id: 'job-1',
      mode: 'batch' as const,
      total: 3,
      completed: 2,
      failed: 1,
      cancelledCount: 0,
      skippedCount: 0,
      cancelled: false,
      currentItemIds: [],
      items: [
        { id: '1', file: { id: 'f1', name: 'test1.pdf', path: '/path/to/test1.pdf', ext: 'pdf' as const }, status: 'success' as const },
        { id: '2', file: { id: 'f2', name: 'test2.pdf', path: '/path/to/test2.pdf', ext: 'pdf' as const }, status: 'failed' as const, errorMessage: 'Failed' },
        { id: '3', file: { id: 'f3', name: 'test3.pdf', path: '/path/to/test3.pdf', ext: 'pdf' as const }, status: 'pending' as const },
      ],
    }
    
    render(<ResultPanel {...mockProps} jobState={jobState} />)
    
    expect(screen.getByText('test1.pdf')).toBeInTheDocument()
    expect(screen.getByText('test2.pdf')).toBeInTheDocument()
    expect(screen.getByText('test3.pdf')).toBeInTheDocument()
    expect(screen.getByText('已完成')).toBeInTheDocument()
    expect(screen.getByText('失败')).toBeInTheDocument()
    expect(screen.getByText('等待中')).toBeInTheDocument()
  })

  it('should display chunking info when available', () => {
    const chunking = {
      enabled: true,
      chunkCount: 3,
      degraded: false,
      originalLength: 1000,
      finalLength: 900,
    }
    
    const { container } = render(<ResultPanel {...mockProps} latestChunking={chunking} />)
    
    const content = container.textContent || ''
    expect(content).toContain('长文分块')
    expect(content).toContain('3')
  })

  it('should display paper direction info when available', () => {
    const paperDirection = {
      mainDirection: 'Computer Science',
      subDirections: ['AI', 'Machine Learning'],
      keywords: ['neural network', 'deep learning'],
      confidence: 'high',
    }
    
    render(<ResultPanel {...mockProps} latestPaperDirection={paperDirection} />)
    
    expect(screen.getByText((content: string) => content.includes('Computer Science'))).toBeInTheDocument()
  })

  it('should display job summary when jobState is available', () => {
    const jobState = {
      id: 'job-2',
      mode: 'batch' as const,
      total: 5,
      completed: 3,
      failed: 1,
      cancelledCount: 0,
      skippedCount: 1,
      cancelled: false,
      currentItemIds: [],
      items: [],
    }
    
    const { container } = render(<ResultPanel {...mockProps} jobState={jobState} />)
    
    const summaryText = container.textContent || ''
    expect(summaryText).toContain('5')
    expect(summaryText).toContain('完成')
    expect(summaryText).toContain('失败')
  })
})
