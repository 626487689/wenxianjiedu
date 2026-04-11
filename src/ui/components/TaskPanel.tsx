import { PanelCard } from './PanelCard'

const versionFingerprint = `v${__APP_VERSION__} · ${formatBuildTime(__APP_BUILD_TIME__)}`

type TaskPanelProps = {
  canStart: boolean
  canCancel: boolean
  isRunning: boolean
  isCancelling: boolean
  total: number
  completed: number
  failed: number
  cancelledCount: number
  skippedCount: number
  concurrency: number
  retryCount: number
  skipExistingOutput: boolean
  currentFileNames: string[]
  currentStage?: string
  onConcurrencyChange: (value: number) => void
  onRetryCountChange: (value: number) => void
  onSkipExistingOutputChange: (value: boolean) => void
  onStart: () => void
  onCancel: () => void
}

export function TaskPanel(props: TaskPanelProps) {
  const processed = props.completed + props.failed + props.cancelledCount
  const progress = props.total > 0 ? Math.round((processed / props.total) * 100) : 0
  const remaining = Math.max(props.total - processed, 0)

  return (
    <PanelCard title="任务控制" extra={<span style={styles.version}>{versionFingerprint}</span>}>
      <div style={styles.container}>
        <div style={styles.batchConfig}>
          <label style={styles.label}>
            批处理并发数
            <input
              style={styles.input}
              type="number"
              min={1}
              max={6}
              value={props.concurrency}
              onChange={(e) => props.onConcurrencyChange(Number(e.target.value || 1))}
              disabled={props.isRunning}
            />
          </label>

          <label style={styles.label}>
            失败重试次数
            <input
              style={styles.input}
              type="number"
              min={0}
              max={5}
              value={props.retryCount}
              onChange={(e) => props.onRetryCountChange(Number(e.target.value || 0))}
              disabled={props.isRunning}
            />
          </label>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={props.skipExistingOutput}
              onChange={(e) => props.onSkipExistingOutputChange(e.target.checked)}
              disabled={props.isRunning}
            />
            跳过已有输出文件
          </label>
        </div>

        <div style={styles.actions}>
          <button onClick={props.onStart} disabled={!props.canStart}>
            {props.isRunning ? '处理中...' : '开始处理'}
          </button>
          <button onClick={props.onCancel} disabled={!props.canCancel}>
            {props.isCancelling ? '取消中...' : '取消任务'}
          </button>
        </div>

        <div style={styles.stats}>
          <div>总数：{props.total}</div>
          <div>完成：{props.completed}</div>
          <div>失败：{props.failed}</div>
          <div>取消：{props.cancelledCount}</div>
          <div>跳过：{props.skippedCount}</div>
          <div>剩余：{remaining}</div>
          <div>进度：{progress}%</div>
        </div>

        <div style={styles.current}>
          当前文件：{props.currentFileNames.length > 0 ? props.currentFileNames.join('，') : '无'}
        </div>
        <div style={styles.current}>当前阶段：{props.currentStage || '无'}</div>
      </div>
    </PanelCard>
  )
}

function formatBuildTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day} ${hour}:${minute}`
}

const styles: Record<string, React.CSSProperties> = {
  version: {
    fontSize: '11px',
    color: '#6b7280',
    fontFamily: 'Consolas, monospace',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  batchConfig: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    color: '#374151',
  },
  input: {
    padding: '8px 10px',
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
  actions: {
    display: 'flex',
    gap: '8px',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px',
    fontSize: '13px',
  },
  current: {
    fontSize: '13px',
    color: '#374151',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px 12px',
    wordBreak: 'break-all',
  },
}
