import { useModelContext } from '../contexts/ModelContext'
import type { MultiModelEntry } from '../../types/config'

interface ModelStatusCardProps {
  entry: MultiModelEntry
}

const STATUS_CONFIG = {
  online: { color: '#10b981', label: '在线', icon: '🟢' },
  unknown: { color: '#f59e0b', label: '未知', icon: '🟡' },
  error: { color: '#ef4444', label: '错误', icon: '🔴' },
  disabled: { color: '#9ca3af', label: '已禁用', icon: '⚪' },
} as const

function getStatus(entry: MultiModelEntry, testResult?: { success: boolean; latency?: number; message?: string; timestamp: number }) {
  if (!entry.enabled) return STATUS_CONFIG.disabled
  if (!testResult) return STATUS_CONFIG.unknown
  if (testResult.success) return STATUS_CONFIG.online
  return STATUS_CONFIG.error
}

export function ModelStatusCard({ entry }: ModelStatusCardProps) {
  const {
    activeModelId, setActiveModel,
    testingModelId, setTestingModelId,
    modelTestResults, setModelTestResult,
    setLatestError, setCurrentStage,
  } = useModelContext()

  const testResult = modelTestResults[entry.id]
  const status = getStatus(entry, testResult)
  const isActive = entry.id === activeModelId
  const isTesting = testingModelId === entry.id

  async function handleTest() {
    try {
      setTestingModelId(entry.id)
      setCurrentStage(`正在测试 ${entry.name}...`)
      const { appFacade } = await import('../../app/appFacade')
      const result = await appFacade.testModelConnection({
        providerType: entry.config.providerType,
        endpoint: entry.config.endpoint,
        endpointMode: entry.config.endpointMode,
        modelName: entry.config.modelName,
        timeoutMs: entry.config.timeoutMs,
      })
      setModelTestResult(entry.id, { success: true, message: result.preview })
      setCurrentStage(`${entry.name} 测试成功`)
    } catch (error) {
      setModelTestResult(entry.id, {
        success: false,
        message: error instanceof Error ? error.message : '测试失败',
      })
      setLatestError(`${entry.name} 测试失败`)
    } finally {
      setTestingModelId(null)
    }
  }

  return (
    <div style={{
      ...styles.card,
      borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
      boxShadow: isActive ? '0 0 0 1px var(--color-primary)' : 'none',
    }}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <span style={styles.statusIcon}>{status.icon}</span>
          <span style={styles.name}>{entry.name}</span>
          {isActive && <span style={styles.activeBadge}>活跃</span>}
        </div>
        <span style={{ fontSize: 'var(--font-xs)', color: status.color }}>{status.label}</span>
      </div>

      <div style={styles.body}>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>协议</span>
          <span style={styles.infoValue}>{entry.config.providerType}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>模型</span>
          <span style={styles.infoValue}>{entry.config.modelName}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>端点</span>
          <span style={styles.infoValueMono}>
            {entry.config.endpoint ? (
              entry.config.endpoint.length > 40
                ? entry.config.endpoint.slice(0, 37) + '...'
                : entry.config.endpoint
            ) : '未设置'}
          </span>
        </div>

        {testResult && (
          <div style={styles.testResult}>
            <span style={{ color: testResult.success ? '#10b981' : '#ef4444', fontSize: 'var(--font-xs)' }}>
              {testResult.success ? '✓' : '✗'}
            </span>
            {testResult.message && (
              <span style={styles.testMessage}>{testResult.message}</span>
            )}
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <button style={styles.testBtn} onClick={handleTest} disabled={isTesting}>
          {isTesting ? '测试中...' : '测试'}
        </button>
        {!isActive && (
          <button style={styles.setActiveBtn} onClick={() => setActiveModel(entry.id)}>
            设为活跃
          </button>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--color-surface)',
    overflow: 'hidden',
    transition: 'all var(--transition-fast)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-secondary)',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
  },
  statusIcon: { fontSize: 12, lineHeight: 1 },
  name: { fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--color-text-primary)' },
  activeBadge: {
    padding: '1px 6px',
    fontSize: '10px',
    fontWeight: 600,
    color: 'white',
    backgroundColor: 'var(--color-primary)',
    borderRadius: 999,
  },
  body: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },
  infoRow: { display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-xs)' },
  infoLabel: { color: 'var(--color-text-tertiary)' },
  infoValue: { color: 'var(--color-text-secondary)', fontWeight: 500 },
  infoValueMono: {
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    maxWidth: 180,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  testResult: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 'var(--spacing-xs)',
    padding: 'var(--spacing-xs)',
    backgroundColor: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-xs)',
  },
  testMessage: {
    color: 'var(--color-text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  footer: {
    display: 'flex',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-xs) var(--spacing-md) var(--spacing-sm)',
  },
  testBtn: {
    flex: 1,
    padding: '4px 8px',
    fontSize: 'var(--font-xs)',
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
  },
  setActiveBtn: {
    flex: 1,
    padding: '4px 8px',
    fontSize: 'var(--font-xs)',
    fontWeight: 500,
    color: 'white',
    backgroundColor: 'var(--color-primary)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
  },
}
