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
  onToggleZotero: () => void
  onRecursiveChange: (value: boolean) => void
}

export function InputSelectorPanel(props: InputSelectorPanelProps) {
  const getFileIcon = (ext: string) => {
    const icons: Record<string, string> = {
      pdf: '📄',
      txt: '📝',
      md: '📓',
    }
    return icons[ext.toLowerCase()] || '📁'
  }

  return (
    <PanelCard title="输入选择">
      <div style={styles.container}>
        <div style={styles.actions}>
          <button
            style={styles.actionButton}
            onClick={props.onPickFile}
            disabled={props.loading}
          >
            <span style={styles.buttonIcon}>📁</span>
            选择文件
          </button>
          <button
            style={styles.actionButton}
            onClick={props.onPickFolder}
            disabled={props.loading}
          >
            <span style={styles.buttonIcon}>📂</span>
            选择文件夹
          </button>
          <button
            style={styles.actionButton}
            onClick={props.onToggleZotero}
            disabled={props.loading}
          >
            <span style={styles.buttonIcon}>📚</span>
            从Zotero选择
          </button>
        </div>

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={props.recursive}
            onChange={(e) => props.onRecursiveChange(e.target.checked)}
            disabled={props.sourceType !== 'folder'}
          />
          <span style={styles.checkboxLabel}>递归扫描子目录</span>
        </label>

        <div style={styles.pathBox}>
          <div style={styles.pathLabel}>当前输入源</div>
          <div style={styles.pathValue}>
            {props.sourcePath || (
              <span style={styles.emptyValue}>未选择</span>
            )}
          </div>
        </div>

        <div style={styles.fileListBox}>
          <div style={styles.fileListHeader}>
            <span style={styles.fileListLabel}>待处理文件</span>
            <span style={styles.fileCount}>{props.files.length}</span>
          </div>
          <div style={styles.fileList}>
            {props.files.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📭</div>
                <div style={styles.emptyText}>暂无可处理文件</div>
                <div style={styles.emptyHint}>点击上方按钮选择文件或文件夹</div>
              </div>
            ) : (
              props.files.map((file, index) => (
                <div
                  key={file.id}
                  style={{ ...styles.fileItem, animationDelay: `${index * 30}ms` }}
                  className="animate-fadeIn"
                >
                  <div style={styles.fileIcon}>{getFileIcon(file.ext)}</div>
                  <div style={styles.fileInfo}>
                    <div style={styles.fileName}>{file.name}</div>
                    <div style={styles.fileMeta}>
                      <span style={styles.fileType}>{file.ext.toUpperCase()}</span>
                      <span style={styles.filePath}>{file.path}</span>
                    </div>
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
    gap: 'var(--spacing-md)',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },
  actionButton: {
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
  fileListBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },
  fileListHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
  },
  fileListLabel: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
    fontWeight: 500,
  },
  fileCount: {
    padding: '1px 6px',
    fontSize: 'var(--font-xs)',
    fontWeight: 600,
    color: 'var(--color-primary)',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: '999px',
  },
  fileList: {
    maxHeight: '200px',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-sm)',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    transition: 'all var(--transition-fast)',
  },
  fileIcon: {
    fontSize: 'var(--font-lg)',
    flexShrink: 0,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 'var(--font-sm)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
  },
  fileType: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: 'var(--font-xs)',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-bg-secondary)',
    borderRadius: '4px',
    alignSelf: 'flex-start',
  },
  filePath: {
    wordBreak: 'break-all',
    fontFamily: 'var(--font-mono)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-xl) var(--spacing-md)',
    gap: 'var(--spacing-sm)',
  },
  emptyIcon: {
    fontSize: '32px',
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 'var(--font-sm)',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
  },
  emptyHint: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
  },
}
