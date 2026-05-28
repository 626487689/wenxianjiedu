import { render, screen, fireEvent } from '@testing-library/react'
import { ModelConfigPanel } from '../ui/components/ModelConfigPanel'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock config preset service
vi.mock('../services/config/ConfigPresetService', () => ({
  configPresetService: {
    getPresets: vi.fn(() => [
      { id: 'preset1', name: 'Test Preset' }
    ]),
    getPresetById: vi.fn()
  }
}))

const mockProps = {
  providerType: 'openai_compatible' as const,
  endpoint: 'https://api.example.com/v1',
  endpointMode: 'auto' as const,
  modelName: 'gpt-4o-mini',
  apiKeyInput: '',
  apiKeySaved: false,
  timeoutMs: 60000,
  rememberApiKey: false,
  saving: false,
  testing: false,
  onProviderTypeChange: vi.fn(),
  onEndpointChange: vi.fn(),
  onEndpointModeChange: vi.fn(),
  onModelNameChange: vi.fn(),
  onApiKeyChange: vi.fn(),
  onTimeoutChange: vi.fn(),
  onRememberApiKeyChange: vi.fn(),
  onSave: vi.fn(),
  onTest: vi.fn(),
}

describe('ModelConfigPanel', () => {
  it('should render all form fields', () => {
    const { container } = render(<ModelConfigPanel {...mockProps} />)
    
    expect(screen.getByLabelText('配置预设')).toBeInTheDocument()
    expect(screen.getByLabelText('协议类型')).toBeInTheDocument()
    expect(screen.getByLabelText('Endpoint URL')).toBeInTheDocument()
    expect(screen.getByLabelText('路径模式')).toBeInTheDocument()
    expect(screen.getByLabelText('Model Name')).toBeInTheDocument()
    expect(screen.getByLabelText('API Key')).toBeInTheDocument()
    expect(screen.getByLabelText('Timeout (ms)')).toBeInTheDocument()
    
    // Check checkbox exists
    const checkbox = container.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeInTheDocument()
  })

  it('should display API Key saved indicator', () => {
    render(<ModelConfigPanel {...mockProps} apiKeySaved={true} />)
    
    expect(screen.getByText('已保存')).toBeInTheDocument()
  })

  it('should call onSave when save button is clicked', () => {
    const onSave = vi.fn()
    render(<ModelConfigPanel {...mockProps} onSave={onSave} />)
    
    fireEvent.click(screen.getByText('保存配置'))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('should call onTest when test button is clicked', () => {
    const onTest = vi.fn()
    render(<ModelConfigPanel {...mockProps} onTest={onTest} />)
    
    fireEvent.click(screen.getByText('测试连接'))
    expect(onTest).toHaveBeenCalledTimes(1)
  })

  it('should not render test button when onTest is not provided', () => {
    const { container } = render(<ModelConfigPanel {...mockProps} onTest={undefined} />)
    
    expect(container.textContent).not.toContain('测试连接')
  })

  it('should show loading state for save button', () => {
    const { container } = render(<ModelConfigPanel {...mockProps} saving={true} />)
    
    expect(screen.getByText('保存中...')).toBeInTheDocument()
    expect(container.textContent).not.toContain('保存配置')
  })

  it('should show loading state for test button', () => {
    const { container } = render(<ModelConfigPanel {...mockProps} testing={true} />)
    
    expect(screen.getByText('测试中...')).toBeInTheDocument()
    expect(container.textContent).not.toContain('测试连接')
  })

  it('should update endpoint when input changes', () => {
    const onEndpointChange = vi.fn()
    render(<ModelConfigPanel {...mockProps} onEndpointChange={onEndpointChange} />)
    
    const input = screen.getByLabelText('Endpoint URL') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'https://new-api.example.com/v1' } })
    expect(onEndpointChange).toHaveBeenCalledWith('https://new-api.example.com/v1')
  })

  it('should update model name when input changes', () => {
    const onModelNameChange = vi.fn()
    render(<ModelConfigPanel {...mockProps} onModelNameChange={onModelNameChange} />)
    
    const input = screen.getByLabelText('Model Name') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'new-model' } })
    expect(onModelNameChange).toHaveBeenCalledWith('new-model')
  })

  it('should update API Key when input changes', () => {
    const onApiKeyChange = vi.fn()
    render(<ModelConfigPanel {...mockProps} onApiKeyChange={onApiKeyChange} />)
    
    const input = screen.getByLabelText('API Key') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'sk-new-key' } })
    expect(onApiKeyChange).toHaveBeenCalledWith('sk-new-key')
  })

  it('should update timeout when input changes', () => {
    const onTimeoutChange = vi.fn()
    render(<ModelConfigPanel {...mockProps} onTimeoutChange={onTimeoutChange} />)
    
    const input = screen.getByLabelText('Timeout (ms)') as HTMLInputElement
    fireEvent.change(input, { target: { value: '120000' } })
    expect(onTimeoutChange).toHaveBeenCalledWith(120000)
  })

  it('should handle empty timeout value', () => {
    const onTimeoutChange = vi.fn()
    render(<ModelConfigPanel {...mockProps} onTimeoutChange={onTimeoutChange} />)
    
    const input = screen.getByLabelText('Timeout (ms)') as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    expect(onTimeoutChange).toHaveBeenCalledWith(0)
  })

  it('should toggle rememberApiKey checkbox', () => {
    const onRememberApiKeyChange = vi.fn()
    const { container } = render(<ModelConfigPanel {...mockProps} onRememberApiKeyChange={onRememberApiKeyChange} />)
    
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement
    fireEvent.click(checkbox)
    expect(onRememberApiKeyChange).toHaveBeenCalledWith(true)
  })

  it('should show resolved endpoint in tip', () => {
    render(<ModelConfigPanel {...mockProps} />)
    
    expect(screen.getByText('实际请求地址预览')).toBeInTheDocument()
  })

  it('should show "未填写" when endpoint is empty', () => {
    render(<ModelConfigPanel {...mockProps} endpoint="" />)
    
    expect(screen.getByText('未填写')).toBeInTheDocument()
  })

  it('should update provider type when select changes', () => {
    const onProviderTypeChange = vi.fn()
    render(<ModelConfigPanel {...mockProps} onProviderTypeChange={onProviderTypeChange} />)
    
    const select = screen.getByLabelText('协议类型') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'anthropic' } })
    expect(onProviderTypeChange).toHaveBeenCalledWith('anthropic')
  })

  it('should update endpoint mode when select changes', () => {
    const onEndpointModeChange = vi.fn()
    render(<ModelConfigPanel {...mockProps} onEndpointModeChange={onEndpointModeChange} />)
    
    const select = screen.getByLabelText('路径模式') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'manual' } })
    expect(onEndpointModeChange).toHaveBeenCalledWith('manual')
  })

  it('should show config presets in select', () => {
    render(<ModelConfigPanel {...mockProps} />)
    
    expect(screen.getByText('选择配置预设')).toBeInTheDocument()
  })

  it('should handle empty config preset selection', () => {
    const onProviderTypeChange = vi.fn()
    const onEndpointChange = vi.fn()
    const onEndpointModeChange = vi.fn()
    const onModelNameChange = vi.fn()
    const onTimeoutChange = vi.fn()
    
    render(<ModelConfigPanel 
      {...mockProps} 
      onProviderTypeChange={onProviderTypeChange}
      onEndpointChange={onEndpointChange}
      onEndpointModeChange={onEndpointModeChange}
      onModelNameChange={onModelNameChange}
      onTimeoutChange={onTimeoutChange}
    />)
    
    const select = screen.getByLabelText('配置预设') as HTMLSelectElement
    fireEvent.change(select, { target: { value: '' } })
    
    expect(onProviderTypeChange).not.toHaveBeenCalled()
    expect(onEndpointChange).not.toHaveBeenCalled()
    expect(onEndpointModeChange).not.toHaveBeenCalled()
    expect(onModelNameChange).not.toHaveBeenCalled()
    expect(onTimeoutChange).not.toHaveBeenCalled()
  })

  it('should apply config preset when selected', async () => {
    const { configPresetService } = await import('../services/config/ConfigPresetService')
    const mockPreset = {
      id: 'preset1',
      name: 'Test Preset',
      providerType: 'openai_compatible' as const,
      endpoint: 'https://test.example.com/v1',
      endpointMode: 'auto' as const,
      modelName: 'test-model',
      timeoutMs: 30000,
      temperature: 0.7,
      maxTokens: 4096
    }
    
    vi.mocked(configPresetService.getPresetById).mockReturnValue(mockPreset)
    
    const onProviderTypeChange = vi.fn()
    const onEndpointChange = vi.fn()
    const onEndpointModeChange = vi.fn()
    const onModelNameChange = vi.fn()
    const onTimeoutChange = vi.fn()
    
    render(<ModelConfigPanel 
      {...mockProps} 
      onProviderTypeChange={onProviderTypeChange}
      onEndpointChange={onEndpointChange}
      onEndpointModeChange={onEndpointModeChange}
      onModelNameChange={onModelNameChange}
      onTimeoutChange={onTimeoutChange}
    />)
    
    const select = screen.getByLabelText('配置预设') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'preset1' } })
    
    expect(configPresetService.getPresetById).toHaveBeenCalledWith('preset1')
    expect(onProviderTypeChange).toHaveBeenCalledWith('openai_compatible')
    expect(onEndpointChange).toHaveBeenCalledWith('https://test.example.com/v1')
    expect(onEndpointModeChange).toHaveBeenCalledWith('auto')
    expect(onModelNameChange).toHaveBeenCalledWith('test-model')
    expect(onTimeoutChange).toHaveBeenCalledWith(30000)
  })
})
