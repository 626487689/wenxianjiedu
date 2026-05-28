import { PanelCard } from './PanelCard'
import type { OutputFormat } from '../../types/config'

type OutputPanelProps = {
  outputDir: string
  outputFormat: OutputFormat
  onPickOutputDir: () => void
  onOutputFormatChange: (value: OutputFormat) => void
}

export function OutputPanel(props: OutputPanelProps) {
  return (
    <PanelCard title="输出设置">
      <div style={styles.container}>
        <button style={styles.pickButton} onClick={props.onPickOutputDir}>
          <span style={styles.buttonIcon}>📂</span>
          选择输出目录
        </button>

        <div style={styles.pathBox}>
          <div style={styles.pathLabel}>当前输出目录</div>
          <div style={styles.pathValue}>
            {props.outputDir || (
              <span style={styles.emptyValue}>未选择</span>
            )}
          </div>
        </div>

        <div style={styles.formatBox}>
          <div style={styles.formatLabel}>输出格式</div>
          <div style={styles.formatOptions}>
            <button
              style={{
                ...styles.formatOption,
                ...(props.outputFormat === 'default' ? styles.formatOptionActive : {}),
              }}
              onClick={() => props.onOutputFormatChange('default')}
              data-testid="format-option"
              data-active={props.outputFormat === 'default'}
            >
              <span style={styles.formatIcon}>📝</span>
              <span style={styles.formatText}>默认 Markdown</span>
            </button>
            <button
              style={{
                ...styles.formatOption,
                ...(props.outputFormat === 'obsidian' ? styles.formatOptionActive : {}),
              }}
              onClick={() => props.onOutputFormatChange('obsidian')}
              data-testid="format-option"
              data-active={props.outputFormat === 'obsidian'}
            >
              <span style={styles.formatIcon}>🔹</span>
              <span style={styles.formatText}>Obsidian 兼容</span>
            </button>
          </div>
        </div>

        <div style={styles.tip}>
            <div style={styles.tipIcon}>💾</div>
            <div style={styles.tipContent}>
              输出文件将以 Markdown 格式保存。在浏览器模式下，文件会自动下载到默认下载目录。
            </div>
          </div>
      </div>
    </PanelCard>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)',
  },
  pickButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: 'var(--font-sm)',
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    width: '100%',
  },
  buttonIcon: {
    fontSize: 'var(--font-lg)',
  },
  pathBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },
  pathLabel: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
    fontWeight: 500,
  },
  pathValue: {
    fontSize: 'var(--font-sm)',
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    wordBreak: 'break-all',
    fontFamily: 'var(--font-mono)',
  },
  emptyValue: {
    color: 'var(--color-text-tertiary)',
    fontStyle: 'italic',
  },
  formatBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },
  formatLabel: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
    fontWeight: 500,
  },
  formatOptions: {
    display: 'flex',
    gap: 'var(--spacing-sm)',
  },
  formatOption: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: 'var(--spacing-sm)',
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  formatOptionActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'var(--color-primary)',
    color: 'var(--color-primary)',
  },
  formatIcon: {
    fontSize: 'var(--font-lg)',
  },
  formatText: {
    fontWeight: 500,
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
  },
  tipIcon: {
    fontSize: 'var(--font-lg)',
    flexShrink: 0,
  },
  tipContent: {
    flex: 1,
  },
}
