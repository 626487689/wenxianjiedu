import type { EndpointMode, ModelProviderType } from '../../types/config'
import { normalizeOpenAIEndpoint } from '../../utils/endpoint'
import { configPresetService } from '../../services/config/ConfigPresetService'
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
  attachmentTesting?: boolean
  attachmentResult?: {
    supportsAttachments: boolean
    attachmentType?: string
    message?: string
  } | null
  onProviderTypeChange: (value: ModelProviderType) => void
  onEndpointChange: (value: string) => void
  onEndpointModeChange: (value: EndpointMode) => void
  onModelNameChange: (value: string) => void
  onApiKeyChange: (value: string) => void
  onTimeoutChange: (value: number) => void
  onRememberApiKeyChange: (value: boolean) => void
  onSave: () => void
  onTest?: () => void
  onTestAttachment?: () => void
}

export function ModelConfigPanel(props: ModelConfigPanelProps) {
  const resolvedEndpoint = normalizeOpenAIEndpoint(props.endpoint, props.endpointMode)

  return (
    <PanelCard title="模型配置">
      <div style={styles.form}>
        <label style={styles.label}>
          <span style={styles.labelText}>配置预设</span>
          <select
            style={styles.select}
            onChange={(e) => {
              const presetId = e.target.value
              if (presetId) {
                const preset = configPresetService.getPresetById(presetId)
                if (preset) {
                  props.onProviderTypeChange(preset.providerType as ModelProviderType)
                  props.onEndpointChange(preset.endpoint)
                  props.onEndpointModeChange(preset.endpointMode as EndpointMode)
                  props.onModelNameChange(preset.modelName)
                  props.onTimeoutChange(preset.timeoutMs)
                }
              }
            }}
          >
            <option value="">选择配置预设</option>
            {configPresetService.getPresets().map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.label}>
          <span style={styles.labelText}>协议类型</span>
          <select
            style={styles.select}
            value={props.providerType}
            onChange={(e) => props.onProviderTypeChange(e.target.value as ModelProviderType)}
          >
            <option value="openai_compatible">OpenAI Compatible</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
            <option value="local">本地模型</option>
          </select>
        </label>

        <label style={styles.label}>
          <span style={styles.labelText}>Endpoint URL</span>
          <input
            style={styles.input}
            value={props.endpoint}
            onChange={(e) => props.onEndpointChange(e.target.value)}
            placeholder="https://example.com/v1/chat/completions"
          />
        </label>

        <label style={styles.label}>
          <span style={styles.labelText}>路径模式</span>
          <select
            style={styles.select}
            value={props.endpointMode}
            onChange={(e) => props.onEndpointModeChange(e.target.value as EndpointMode)}
          >
            <option value="auto">自动补全 OpenAI 路径</option>
            <option value="manual">手动使用输入的完整路径</option>
          </select>
        </label>

        <div style={styles.tip}>
          <div style={styles.tipIcon}>📋</div>
          <div style={styles.tipContent}>
            <div style={styles.tipLabel}>实际请求地址预览</div>
            <div style={styles.tipValue}>{resolvedEndpoint || '未填写'}</div>
          </div>
        </div>

        <label style={styles.label}>
          <span style={styles.labelText}>Model Name</span>
          <input
            style={styles.input}
            value={props.modelName}
            onChange={(e) => props.onModelNameChange(e.target.value)}
            placeholder="gpt-4o-mini / your-model-name"
          />
        </label>

        <label style={styles.label}>
          <span style={styles.labelText}>API Key</span>
          <div style={styles.apiKeyRow}>
            <input
              style={styles.input}
              type="password"
              value={props.apiKeyInput}
              onChange={(e) => props.onApiKeyChange(e.target.value)}
              placeholder={props.apiKeySaved ? '已有已保存 Key，输入可临时覆盖本次运行' : '请输入 API Key'}
            />
            {props.apiKeySaved && (
              <div style={styles.apiKeyIndicator}>
                <span style={styles.apiKeyBadge}>已保存</span>
              </div>
            )}
          </div>
        </label>

        <label style={styles.label}>
          <span style={styles.labelText}>Timeout (ms)</span>
          <input
            style={styles.input}
            type="number"
            min={0}
            max={300000}
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
          <span style={styles.checkboxLabel}>本地保存 API Key（当前为开发期最小实现）</span>
        </label>

        <div style={styles.tip}>
          <div style={styles.tipIcon}>💡</div>
          <div style={styles.tipContent}>
            使用远程模型端点时，文献内容将发送到你配置的模型服务进行推理。当前版本重点增强 OpenAI-compatible 接口适配稳定性。
          </div>
        </div>

        <div style={styles.actions}>
          <button
            style={styles.saveButton}
            onClick={props.onSave}
            disabled={props.saving}
          >
            {props.saving ? (
              <>
                <span style={styles.spinner} className="animate-spin" />
                保存中...
              </>
            ) : (
              '保存配置'
            )}
          </button>
          {props.onTest ? (
            <button
              style={styles.testButton}
              onClick={props.onTest}
              disabled={props.testing}
            >
              {props.testing ? (
                <>
                  <span style={styles.spinner} className="animate-spin" />
                  测试中...
                </>
              ) : (
                '测试连接'
              )}
            </button>
          ) : null}
          {props.onTestAttachment ? (
            <button
              style={styles.attachmentTestButton}
              onClick={props.onTestAttachment}
              disabled={props.attachmentTesting}
            >
              {props.attachmentTesting ? (
                <>
                  <span style={styles.spinner} className="animate-spin" />
                  测试附件...
                </>
              ) : (
                '测试附件支持'
              )}
            </button>
          ) : null}
        </div>
        {props.attachmentResult && (
          <div style={{
            ...styles.attachmentResult,
            backgroundColor: props.attachmentResult.supportsAttachments 
              ? 'rgba(16, 185, 129, 0.1)' 
              : 'rgba(239, 68, 68, 0.1)',
            borderColor: props.attachmentResult.supportsAttachments 
              ? 'rgba(16, 185, 129, 0.3)' 
              : 'rgba(239, 68, 68, 0.3)',
          }}>
            <div style={styles.attachmentResultIcon}>
              {props.attachmentResult.supportsAttachments ? '✅' : '❌'}
            </div>
            <div style={styles.attachmentResultContent}>
              <div style={styles.attachmentResultTitle}>
                {props.attachmentResult.supportsAttachments 
                  ? '支持附件' 
                  : '不支持附件'}
              </div>
              <div style={styles.attachmentResultMessage}>
                {props.attachmentResult.message}
              </div>
              {props.attachmentResult.attachmentType && (
                <div style={styles.attachmentResultType}>
                  附件格式: {props.attachmentResult.attachmentType}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PanelCard>
  )
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
    fontSize: 'var(--font-sm)',
    color: 'var(--color-text-secondary)',
  },
  labelText: {
    fontWeight: 500,
    fontSize: 'var(--font-sm)',
    color: 'var(--color-text-secondary)',
  },
  input: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: 'var(--font-sm)',
    backgroundColor: 'var(--color-surface)',
    transition: 'all var(--transition-fast)',
    outline: 'none',
  },
  select: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: 'var(--font-sm)',
    backgroundColor: 'var(--color-surface)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    outline: 'none',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    fontSize: 'var(--font-sm)',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: 'var(--font-sm)',
    color: 'var(--color-text-secondary)',
  },
  tip: {
    display: 'flex',
    gap: 'var(--spacing-sm)',
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.5,
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    wordBreak: 'break-all',
  },
  tipIcon: {
    fontSize: 'var(--font-lg)',
    flexShrink: 0,
  },
  tipContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  tipLabel: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
    fontWeight: 500,
  },
  tipValue: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  apiKeyRow: {
    position: 'relative',
  },
  apiKeyIndicator: {
    position: 'absolute',
    right: 'var(--spacing-sm)',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  apiKeyBadge: {
    padding: '2px 8px',
    fontSize: 'var(--font-xs)',
    fontWeight: 500,
    color: 'var(--color-success)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: '999px',
  },
  actions: {
    display: 'flex',
    gap: 'var(--spacing-sm)',
    marginTop: 'var(--spacing-sm)',
  },
  saveButton: {
    flex: 1,
    padding: 'var(--spacing-sm) var(--spacing-lg)',
    fontSize: 'var(--font-sm)',
    fontWeight: 500,
    color: 'white',
    backgroundColor: 'var(--color-primary)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-xs)',
  },
  testButton: {
    flex: 1,
    padding: 'var(--spacing-sm) var(--spacing-lg)',
    fontSize: 'var(--font-sm)',
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-xs)',
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
  },
  attachmentTestButton: {
    padding: 'var(--spacing-sm) var(--spacing-lg)',
    fontSize: 'var(--font-sm)',
    fontWeight: 500,
    color: 'var(--color-primary)',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-primary)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-xs)',
  },
  attachmentResult: {
    display: 'flex',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    marginTop: 'var(--spacing-sm)',
  },
  attachmentResultIcon: {
    fontSize: 'var(--font-lg)',
    flexShrink: 0,
  },
  attachmentResultContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  attachmentResultTitle: {
    fontSize: 'var(--font-sm)',
    fontWeight: 600,
  },
  attachmentResultMessage: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-secondary)',
  },
  attachmentResultType: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
    marginTop: '2px',
  },
}
