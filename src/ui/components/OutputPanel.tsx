import { PanelCard } from './PanelCard'

type OutputPanelProps = {
  outputDir: string
  onPickOutputDir: () => void
}

export function OutputPanel(props: OutputPanelProps) {
  return (
    <PanelCard title="输出目录">
      <div style={styles.container}>
        <button onClick={props.onPickOutputDir}>选择输出目录</button>

        <div style={styles.pathBox}>
          <div style={styles.label}>当前输出目录</div>
          <div style={styles.pathValue}>{props.outputDir || '未选择'}</div>
        </div>
      </div>
    </PanelCard>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  pathBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    color: '#6b7280',
  },
  pathValue: {
    fontSize: '13px',
    color: '#111827',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px 12px',
    wordBreak: 'break-all',
  },
}
