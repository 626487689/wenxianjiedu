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
  enableChunking: boolean
  currentFileNames: string[]
  currentStage?: string
  onConcurrencyChange: (value: number) => void
  onRetryCountChange: (value: number) => void
  onSkipExistingOutputChange: (value: boolean) => void
  onEnableChunkingChange: (value: boolean) => void
  onStart: () => void
  onCancel: () => void
}

export function TaskPanel(props: TaskPanelProps) {
  const processed = props.completed + props.failed + props.cancelledCount
  const progress = props.total > 0 ? Math.round((processed / props.total) * 100) : 0
  const remaining = Math.max(props.total - processed, 0)

  const stats = [
    { label: '总数', value: props.total, color: 'var(--color-text-primary)' },
    { label: '完成', value: props.completed, color: 'var(--color-success)' },
    { label: '失败', value: props.failed, color: 'var(--color-error)' },
    { label: '取消', value: props.cancelledCount, color: 'var(--color-warning)' },
    { label: '跳过', value: props.skippedCount, color: 'var(--color-info)' },
    { label: '剩余', value: remaining, color: 'var(--color-text-secondary)' },
  ]

  return (
    <PanelCard title="任务控制" extra={<span style={styles.version}>{versionFingerprint}</span>}>
      <div style={styles.container}>
        <div style={styles.batchConfig}>
          <div style={styles.configRow}>
            <label style={styles.label}>
              <span style={styles.labelText}>批处理并发数</span>
              <div style={styles.inputWrapper}>
                <button
                  style={styles.stepperButton}
                  onClick={() => props.onConcurrencyChange(Math.max(1, props.concurrency - 1))}
                  disabled={props.isRunning || props.concurrency <= 1}
                >
                  -
                </button>
                <input
                  style={styles.numberInput}
                  type="number"
                  min={1}
                  max={6}
                  value={props.concurrency}
                  onChange={(e) => props.onConcurrencyChange(Number(e.target.value || 1))}
                  disabled={props.isRunning}
                />
                <button
                  style={styles.stepperButton}
                  onClick={() => props.onConcurrencyChange(Math.min(6, props.concurrency + 1))}
                  disabled={props.isRunning || props.concurrency >= 6}
                >
                  +
                </button>
              </div>
            </label>
          </div>

          <div style={styles.configRow}>
            <label style={styles.label}>
              <span style={styles.labelText}>失败重试次数</span>
              <div style={styles.inputWrapper}>
                <button
                  style={styles.stepperButton}
                  onClick={() => props.onRetryCountChange(Math.max(0, props.retryCount - 1))}
                  disabled={props.isRunning || props.retryCount <= 0}
                >
                  -
                </button>
                <input
                  style={styles.numberInput}
                  type="number"
                  min={0}
                  max={5}
                  value={props.retryCount}
                  onChange={(e) => props.onRetryCountChange(Number(e.target.value || 0))}
                  disabled={props.isRunning}
                />
                <button
                  style={styles.stepperButton}
                  onClick={() => props.onRetryCountChange(Math.min(5, props.retryCount + 1))}
                  disabled={props.isRunning || props.retryCount >= 5}
                >
                  +
                </button>
              </div>
            </label>
          </div>

          <div style={styles.checkboxContainer}>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={props.skipExistingOutput}
                onChange={(e) => props.onSkipExistingOutputChange(e.target.checked)}
                disabled={props.isRunning}
              />
              <span style={styles.checkboxLabel}>跳过已有输出文件</span>
            </label>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={props.enableChunking}
                onChange={(e) => props.onEnableChunkingChange(e.target.checked)}
                disabled={props.isRunning}
              />
              <span style={styles.checkboxLabel}>启用分块处理</span>
            </label>
          </div>
        </div>

        <div style={styles.actions}>
          <button
            style={styles.startButton}
            onClick={props.onStart}
            disabled={!props.canStart}
          >
            {props.isRunning ? (
              <>
                <span style={styles.spinner} className="animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <span style={styles.buttonIcon}>▶</span>
                开始处理
              </>
            )}
          </button>
          <button
            style={styles.cancelButton}
            onClick={props.onCancel}
            disabled={!props.canCancel}
          >
            {props.isCancelling ? (
              <>
                <span style={styles.spinner} className="animate-spin" />
                取消中...
              </>
            ) : (
              <>
                <span style={styles.buttonIcon}>⏹</span>
                取消任务
              </>
            )}
          </button>
        </div>

        <div style={styles.stats}>
          {stats.map((stat) => (
            <div key={stat.label} style={styles.statItem}>
              <span style={{ ...styles.statValue, color: stat.color }}>{stat.value}</span>
              <span style={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>

        <div style={styles.progressContainer}>
          <div style={styles.progressHeader}>
            <span style={styles.progressLabel}>进度</span>
            <span style={styles.progressPercentage}>{progress}%</span>
          </div>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
                background:
                  progress === 100
                    ? 'var(--color-success)'
                    : props.isRunning
                    ? 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))'
                    : 'var(--color-primary)',
              }}
              className={props.isRunning && progress < 100 ? 'animate-progress' : ''}
            />
          </div>
        </div>

        <div style={styles.currentInfo}>
          <div style={styles.currentItem}>
            <span style={styles.currentLabel}>当前文件</span>
            <span style={styles.currentValue}>
              {props.currentFileNames.length > 0 ? (
                <span className="animate-fadeIn">{props.currentFileNames.join('，')}</span>
              ) : (
                <span style={styles.emptyText}>无</span>
              )}
            </span>
          </div>
          <div style={styles.currentItem}>
            <span style={styles.currentLabel}>当前阶段</span>
            <span style={styles.currentValue}>
              {props.currentStage ? (
                <span className="animate-fadeIn">{props.currentStage}</span>
              ) : (
                <span style={styles.emptyText}>无</span>
              )}
            </span>
          </div>
        </div>
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
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
    fontFamily: 'var(--font-mono)',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)',
  },
  batchConfig: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-md)',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
  },
  configRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-md)',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
    flex: 1,
  },
  labelText: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-secondary)',
    fontWeight: 500,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  stepperButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-sm)',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  numberInput: {
    width: '56px',
    height: '28px',
    padding: '0 var(--spacing-sm)',
    fontSize: 'var(--font-sm)',
    textAlign: 'center',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
  },
  checkboxContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
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
  actions: {
    display: 'flex',
    gap: 'var(--spacing-sm)',
  },
  startButton: {
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
  cancelButton: {
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
  buttonIcon: {
    fontSize: 'var(--font-sm)',
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 'var(--spacing-sm)',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 'var(--spacing-sm)',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
  },
  statValue: {
    fontSize: 'var(--font-lg)',
    fontWeight: 700,
  },
  statLabel: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
    marginTop: '2px',
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-sm)',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-secondary)',
    fontWeight: 500,
  },
  progressPercentage: {
    fontSize: 'var(--font-sm)',
    fontWeight: 700,
    color: 'var(--color-primary)',
  },
  progressBar: {
    height: '8px',
    backgroundColor: 'var(--color-border)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width var(--transition-normal)',
    backgroundSize: '200% 100%',
  },
  currentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
  },
  currentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
  },
  currentLabel: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
    fontWeight: 500,
  },
  currentValue: {
    fontSize: 'var(--font-sm)',
    color: 'var(--color-text-primary)',
    wordBreak: 'break-all',
    flex: 1,
    textAlign: 'right',
    marginLeft: 'var(--spacing-md)',
  },
  emptyText: {
    color: 'var(--color-text-tertiary)',
    fontStyle: 'italic',
  },
}
