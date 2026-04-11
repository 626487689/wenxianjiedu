import type { SourceFileRef } from '../../types/file'
import { PanelCard } from './PanelCard'

type InputSelectorPanelProps = {
  sourceType: 'file' | 'folder' | null
  sourcePath: string
  recursive: boolean
  files: SourceFileRef[]
  loading: boolean
  onPickFile: () => void
  onPickFolder: () => void
  onRecursiveChange: (value: boolean) => void
}

export function InputSelectorPanel(props: InputSelectorPanelProps) {
  return (
    <PanelCard title="输入选择">
      <div style={styles.container}>
        <div style={styles.actions}>
          <button onClick={props.onPickFile} disabled={props.loading}>
            选择文件
          </button>
          <button onClick={props.onPickFolder} disabled={props.loading}>
            选择文件夹
          </button>
        </div>

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={props.recursive}
            onChange={(e) => props.onRecursiveChange(e.target.checked)}
            disabled={props.sourceType !== 'folder'}
          />
          递归扫描子目录
        </label>

        <div style={styles.pathBox}>
          <div style={styles.label}>当前输入源</div>
          <div style={styles.pathValue}>{props.sourcePath || '未选择'}</div>
        </div>

        <div style={styles.fileListBox}>
          <div style={styles.label}>待处理文件（{props.files.length}）</div>
          <div style={styles.fileList}>
            {props.files.length === 0 ? (
              <div style={styles.empty}>暂无可处理文件</div>
            ) : (
              props.files.map((file) => (
                <div key={file.id} style={styles.fileItem}>
                  <div style={styles.fileName}>{file.name}</div>
                  <div style={styles.fileMeta}>
                    <span>{file.ext.toUpperCase()}</span>
                    <span>{file.path}</span>
                  </div>
                </div>
              ))
            )}
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
    gap: '12px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
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
  fileListBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fileList: {
    maxHeight: '240px',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fileItem: {
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    background: '#fafafa',
  },
  fileName: {
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  fileMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '12px',
    color: '#6b7280',
    wordBreak: 'break-all',
  },
  empty: {
    padding: '12px',
    border: '1px dashed #d1d5db',
    borderRadius: '8px',
    color: '#6b7280',
    fontSize: '13px',
  },
}
