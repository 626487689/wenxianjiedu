import { useState } from 'react'
import type { MultiModelEntry, ModelProviderType, EndpointMode, ModelConfig } from '../../types/config'
import { useModelContext } from '../contexts/ModelContext'
import { PanelCard } from './PanelCard'

const PROVIDER_LABELS: Record<ModelProviderType, string> = {
  openai_compatible: 'OpenAI Compatible',
  anthropic: 'Anthropic',
  google: 'Google',
  local: '本地模型',
}

export function MultiModelManager() {
  const {
    models, activeModelId,
    addModel, updateModel, removeModel,
    setActiveModel, toggleModelEnabled, reorderModels,
  } = useModelContext()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formProviderType, setFormProviderType] = useState<ModelProviderType>('openai_compatible')
  const [formEndpoint, setFormEndpoint] = useState('')
  const [formEndpointMode, setFormEndpointMode] = useState<EndpointMode>('auto')
  const [formModelName, setFormModelName] = useState('')
  const [formTimeoutMs, setFormTimeoutMs] = useState(300000)

  function resetForm() {
    setFormName('')
    setFormProviderType('openai_compatible')
    setFormEndpoint('')
    setFormEndpointMode('auto')
    setFormModelName('')
    setFormTimeoutMs(300000)
    setEditingId(null)
    setShowForm(false)
  }

  function handleAddOrEdit() {
    if (!formName.trim() || !formModelName.trim()) return
    const config: ModelConfig = {
      providerType: formProviderType,
      endpoint: formEndpoint,
      endpointMode: formEndpointMode,
      modelName: formModelName,
      timeoutMs: formTimeoutMs,
    }
    if (editingId) {
      updateModel(editingId, { name: formName.trim(), config })
    } else {
      addModel({ name: formName.trim(), config, enabled: true })
    }
    resetForm()
  }

  function startEdit(entry: MultiModelEntry) {
    setFormName(entry.name)
    setFormProviderType(entry.config.providerType)
    setFormEndpoint(entry.config.endpoint)
    setFormEndpointMode(entry.config.endpointMode)
    setFormModelName(entry.config.modelName)
    setFormTimeoutMs(entry.config.timeoutMs)
    setEditingId(entry.id)
    setShowForm(true)
  }

  function moveUp(id: string) {
    const sorted = [...models].sort((a, b) => a.priority - b.priority)
    const idx = sorted.findIndex(m => m.id === id)
    if (idx <= 0) return
    const ids = sorted.map(m => m.id)
    ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
    reorderModels(ids)
  }

  function moveDown(id: string) {
    const sorted = [...models].sort((a, b) => a.priority - b.priority)
    const idx = sorted.findIndex(m => m.id === id)
    if (idx < 0 || idx >= sorted.length - 1) return
    const ids = sorted.map(m => m.id)
    ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
    reorderModels(ids)
  }

  const sortedModels = [...models].sort((a, b) => a.priority - b.priority)

  return (
    <PanelCard title="模型管理" extra={`${models.length} 个模型`}>
      {sortedModels.length > 0 && (
        <div style={styles.list}>
          <div style={{ ...styles.row, ...styles.headerRow }}>
            <div style={styles.cellStatus} />
            <div style={styles.cellName}>名称</div>
            <div style={styles.cellProvider}>协议</div>
            <div style={styles.cellModel}>模型</div>
            <div style={styles.cellActions}>操作</div>
          </div>
          {sortedModels.map((entry) => (
            <div
              key={entry.id}
              style={{
                ...styles.row,
                opacity: entry.enabled ? 1 : 0.5,
                backgroundColor: entry.id === activeModelId ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
              }}
            >
              <div style={styles.cellStatus}>
                {entry.id === activeModelId && (
                  <span title="当前活跃" style={{ color: '#10b981', fontSize: 14 }}>●</span>
                )}
              </div>
              <div style={styles.cellName}>
                <div style={styles.modelName}>{entry.name}</div>
                <div style={styles.modelEndpoint}>{entry.config.endpoint || '未设置'}</div>
              </div>
              <div style={styles.cellProvider}>{PROVIDER_LABELS[entry.config.providerType]}</div>
              <div style={styles.cellModel}>{entry.config.modelName}</div>
              <div style={styles.cellActions}>
                <button style={styles.smallBtn} onClick={() => moveUp(entry.id)} title="上移" disabled={entry.priority === 0}>↑</button>
                <button style={styles.smallBtn} onClick={() => moveDown(entry.id)} title="下移" disabled={entry.priority === sortedModels.length - 1}>↓</button>
                <button
                  style={{ ...styles.smallBtn, color: entry.enabled ? '#10b981' : 'var(--color-text-tertiary)' }}
                  onClick={() => toggleModelEnabled(entry.id)}
                  title={entry.enabled ? '禁用' : '启用'}
                >{entry.enabled ? '👁' : '👁‍🗨'}</button>
                <button
                  style={{
                    ...styles.smallBtn,
                    backgroundColor: entry.id === activeModelId ? 'var(--color-primary)' : undefined,
                    color: entry.id === activeModelId ? 'white' : undefined,
                  }}
                  onClick={() => setActiveModel(entry.id)}
                  title="设为活跃"
                >⚡</button>
                <button style={styles.smallBtn} onClick={() => startEdit(entry)} title="编辑">✏️</button>
                <button style={{ ...styles.smallBtn, color: 'var(--color-error)' }} onClick={() => removeModel(entry.id)} title="删除">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {models.length === 0 && !showForm && (
        <div style={styles.empty}>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>暂无模型配置，点击下方按钮添加。</p>
        </div>
      )}

      {showForm && (
        <div style={styles.form}>
          <h4 style={styles.formTitle}>{editingId ? '编辑模型' : '添加模型'}</h4>
          <label style={styles.label}>
            <span style={styles.labelText}>模型名称</span>
            <input style={styles.input} value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="例如：GPT-4o 主力模型" />
          </label>
          <label style={styles.label}>
            <span style={styles.labelText}>协议类型</span>
            <select style={styles.select} value={formProviderType} onChange={(e) => setFormProviderType(e.target.value as ModelProviderType)}>
              <option value="openai_compatible">OpenAI Compatible</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="local">本地模型</option>
            </select>
          </label>
          <label style={styles.label}>
            <span style={styles.labelText}>Endpoint URL</span>
            <input style={styles.input} value={formEndpoint} onChange={(e) => setFormEndpoint(e.target.value)} placeholder="https://api.openai.com/v1/chat/completions" />
          </label>
          <label style={styles.label}>
            <span style={styles.labelText}>路径模式</span>
            <select style={styles.select} value={formEndpointMode} onChange={(e) => setFormEndpointMode(e.target.value as EndpointMode)}>
              <option value="auto">自动补全 OpenAI 路径</option>
              <option value="manual">手动使用完整路径</option>
            </select>
          </label>
          <label style={styles.label}>
            <span style={styles.labelText}>Model Name</span>
            <input style={styles.input} value={formModelName} onChange={(e) => setFormModelName(e.target.value)} placeholder="gpt-4o-mini" />
          </label>
          <label style={styles.label}>
            <span style={styles.labelText}>Timeout (ms)</span>
            <input style={styles.input} type="number" min={0} max={300000} value={formTimeoutMs} onChange={(e) => setFormTimeoutMs(Number(e.target.value || 0))} />
          </label>
          <div style={styles.formActions}>
            <button style={styles.saveBtn} onClick={handleAddOrEdit}>{editingId ? '保存修改' : '添加模型'}</button>
            <button style={styles.cancelBtn} onClick={resetForm}>取消</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button style={styles.addBtn} onClick={() => setShowForm(true)}>+ 添加模型</button>
      )}
    </PanelCard>
  )
}

const styles: Record<string, React.CSSProperties> = {
  list: { display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  row: { display: 'flex', alignItems: 'center', padding: 'var(--spacing-sm) var(--spacing-md)', borderBottom: '1px solid var(--color-border)', fontSize: 'var(--font-sm)', gap: 'var(--spacing-sm)' },
  headerRow: { backgroundColor: 'var(--color-bg-tertiary)', fontWeight: 600, fontSize: 'var(--font-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' },
  cellStatus: { width: 20, flexShrink: 0 },
  cellName: { flex: 2, minWidth: 120 },
  cellProvider: { flex: 1, minWidth: 100 },
  cellModel: { flex: 1, minWidth: 100 },
  cellActions: { flex: 1.5, minWidth: 200, display: 'flex', gap: 4, justifyContent: 'flex-end' },
  modelName: { fontWeight: 500, color: 'var(--color-text-primary)' },
  modelEndpoint: { fontSize: 'var(--font-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  smallBtn: { padding: '4px 6px', fontSize: 'var(--font-xs)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface)', cursor: 'pointer', color: 'var(--color-text-secondary)', transition: 'all var(--transition-fast)', lineHeight: 1 },
  empty: { padding: 'var(--spacing-lg)', textAlign: 'center' },
  addBtn: { marginTop: 'var(--spacing-md)', padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-sm)', fontWeight: 500, color: 'var(--color-primary)', backgroundColor: 'transparent', border: '1px dashed var(--color-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', width: '100%', transition: 'all var(--transition-fast)' },
  form: { marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' },
  formTitle: { margin: 0, fontSize: 'var(--font-md)', fontWeight: 600, color: 'var(--color-text-primary)' },
  label: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', fontSize: 'var(--font-sm)' },
  labelText: { fontWeight: 500, fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' },
  input: { padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--font-sm)', backgroundColor: 'var(--color-surface)', outline: 'none' },
  select: { padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--font-sm)', backgroundColor: 'var(--color-surface)', cursor: 'pointer', outline: 'none' },
  formActions: { display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' },
  saveBtn: { flex: 1, padding: 'var(--spacing-sm) var(--spacing-lg)', fontSize: 'var(--font-sm)', fontWeight: 500, color: 'white', backgroundColor: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' },
  cancelBtn: { padding: 'var(--spacing-sm) var(--spacing-lg)', fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' },
}
