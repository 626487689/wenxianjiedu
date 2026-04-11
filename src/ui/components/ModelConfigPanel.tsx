import type { EndpointMode, ModelProviderType } from '../../types/config'
import { normalizeOpenAIEndpoint } from '../../utils/endpoint'
import { PanelCard } from './PanelCard'

type ModelConfigPanelProps = {
  providerType: ModelProviderType
  endpoint: string
  endpointMode: EndpointMode
  modelName: string
  apiKeyInput: string
  apiKeySaved: boolean
  timeoutMs: number
  rememberApiKey: boolean
  saving: boolean
  testing: boolean
  onProviderTypeChange: (value: ModelProviderType) => void
  onEndpointChange: (value: string) => void
  onEndpointModeChange: (value: EndpointMode) => void
  onModelNameChange: (value: string) => void
  onApiKeyChange: (value: string) => void
  onTimeoutChange: (value: number) => void
  onRememberApiKeyChange: (value: boolean) => void
  onSave: () => void
  onTest?: () => void
}

export function ModelConfigPanel(props: ModelConfigPanelProps) {
  const resolvedEndpoint = normalizeOpenAIEndpoint(props.endpoint, props.endpointMode)

  return (
    <PanelCard title="模型配置">
      <div style={styles.form}>
        <label style={styles.label}>
          协议类型
          <select
            style={styles.input}
            value={props.providerType}
            onChange={(e) => props.onProviderTypeChange(e.target.value as ModelProviderType)}
          >
            <option value="openai_compatible">OpenAI Compatible</option>
          </select>
        </label>

        <label style={styles.label}>
          Endpoint URL
          <input
            style={styles.input}
            value={props.endpoint}
            onChange={(e) => props.onEndpointChange(e.target.value)}
            placeholder="https://example.com/v1/chat/completions"
          />
        </label>

        <label style={styles.label}>
          路径模式
          <select
            style={styles.input}
            value={props.endpointMode}
            onChange={(e) => props.onEndpointModeChange(e.target.value as EndpointMode)}
          >
            <option value="auto">自动补全 OpenAI 路径</option>
            <option value="manual">手动使用输入的完整路径</option>
          </select>
        </label>

        <div style={styles.tip}>
          实际请求地址预览：{resolvedEndpoint || '未填写'}
        </div>

        <label style={styles.label}>
          Model Name
          <input
            style={styles.input}
            value={props.modelName}
            onChange={(e) => props.onModelNameChange(e.target.value)}
            placeholder="gpt-4o-mini / your-model-name"
          />
        </label>

        <label style={styles.label}>
          API Key
          <input
            style={styles.input}
            type="password"
            value={props.apiKeyInput}
            onChange={(e) => props.onApiKeyChange(e.target.value)}
            placeholder={props.apiKeySaved ? '已有已保存 Key，输入可临时覆盖本次运行' : '请输入 API Key'}
          />
        </label>

        <label style={styles.label}>
          Timeout (ms)
          <input
            style={styles.input}
            type="number"
            value={props.timeoutMs}
            onChange={(e) => props.onTimeoutChange(Number(e.target.value || 0))}
          />
        </label>

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={props.rememberApiKey}
            onChange={(e) => props.onRememberApiKeyChange(e.target.checked)}
          />
          本地保存 API Key（当前为开发期最小实现）
        </label>

        <div style={styles.tip}>
          使用远程模型端点时，文献内容将发送到你配置的模型服务进行推理。当前版本重点增强 OpenAI-compatible 接口适配稳定性。
        </div>

        <div style={styles.actions}>
          <button onClick={props.onSave} disabled={props.saving}>
            {props.saving ? '保存中...' : '保存配置'}
          </button>
          {props.onTest ? (
            <button onClick={props.onTest} disabled={props.testing}>
              {props.testing ? '测试中...' : '测试连接'}
            </button>
          ) : null}
        </div>
      </div>
    </PanelCard>
  )
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
  },
  tip: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.5,
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px 12px',
    wordBreak: 'break-all',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
}
