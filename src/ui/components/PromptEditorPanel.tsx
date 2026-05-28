import type { PromptTemplate } from '../../types/prompt'
import { PanelCard } from './PanelCard'

type PromptEditorPanelProps = {
  templates: PromptTemplate[]
  selectedTemplateId?: string
  templateNameInput: string
  promptContent: string
  saving: boolean
  deleting: boolean
  onSelectTemplate: (id: string) => void
  onTemplateNameChange: (value: string) => void
  onPromptChange: (value: string) => void
  onNewTemplate: () => void
  onSaveTemplate: () => void
  onDeleteTemplate: () => void
}

export function PromptEditorPanel(props: PromptEditorPanelProps) {
  const charCount = props.promptContent.length
  const wordCount = props.promptContent.split(/\s+/).filter(Boolean).length

  return (
    <PanelCard title="提示词与模板">
      <div style={styles.container}>
        <div style={styles.templateSelectorRow}>
          <label style={styles.label}>
            <span style={styles.labelText}>模板</span>
            <select
              style={styles.select}
              value={props.selectedTemplateId ?? ''}
              onChange={(e) => props.onSelectTemplate(e.target.value)}
            >
              <option value="">请选择模板</option>
              {props.templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={styles.label}>
          <span style={styles.labelText}>模板名称</span>
          <input
            style={styles.input}
            value={props.templateNameInput}
            onChange={(e) => props.onTemplateNameChange(e.target.value)}
            placeholder="例如：结构化论文解读"
          />
        </label>

        <div style={styles.editorWrapper}>
          <div style={styles.editorHeader}>
            <span style={styles.labelText}>提示词内容</span>
            <span style={styles.counter}>
              {charCount} 字符 · {wordCount} 词
            </span>
          </div>
          <textarea
            style={styles.textarea}
            value={props.promptContent}
            onChange={(e) => props.onPromptChange(e.target.value)}
            placeholder="请输入文献解读提示词..."
            spellCheck={false}
          />
          <div style={styles.editorFooter}>
            <span style={styles.tip}>
              💡 提示：使用清晰的指令和格式要求可以获得更好的解读效果
            </span>
          </div>
        </div>

        <div style={styles.actions}>
          <button style={styles.actionButton} onClick={props.onNewTemplate}>
            <span style={styles.buttonIcon}>+</span>
            新建模板
          </button>
          <button
            style={styles.actionButtonPrimary}
            onClick={props.onSaveTemplate}
            disabled={props.saving}
          >
            {props.saving ? (
              <>
                <span style={styles.spinner} className="animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <span style={styles.buttonIcon}>✓</span>
                保存模板
              </>
            )}
          </button>
          <button
            style={styles.actionButtonDanger}
            onClick={props.onDeleteTemplate}
            disabled={props.deleting || !props.selectedTemplateId}
          >
            {props.deleting ? (
              <>
                <span style={styles.spinner} className="animate-spin" />
                删除中...
              </>
            ) : (
              <>
                <span style={styles.buttonIcon}>🗑</span>
                删除模板
              </>
            )}
          </button>
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
    height: '100%',
  },
  templateSelectorRow: {
    display: 'flex',
    gap: 'var(--spacing-md)',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
    fontSize: 'var(--font-sm)',
    color: 'var(--color-text-secondary)',
    flex: 1,
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
  editorWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
    flex: 1,
    minHeight: '300px',
  },
  editorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
    fontFamily: 'var(--font-mono)',
  },
  textarea: {
    flex: 1,
    minHeight: '280px',
    resize: 'vertical',
    padding: 'var(--spacing-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: 'var(--font-sm)',
    lineHeight: 1.6,
    fontFamily: 'var(--font-mono)',
    backgroundColor: 'var(--color-surface)',
    transition: 'all var(--transition-fast)',
    outline: 'none',
    tabSize: 2,
  },
  editorFooter: {
    display: 'flex',
    justifyContent: 'flex-start',
  },
  tip: {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
    padding: '4px 8px',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: '4px',
  },
  actions: {
    display: 'flex',
    gap: 'var(--spacing-sm)',
    flexWrap: 'wrap',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: 'var(--font-sm)',
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  actionButtonPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: 'var(--font-sm)',
    fontWeight: 500,
    color: 'white',
    backgroundColor: 'var(--color-primary)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  actionButtonDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: 'var(--font-sm)',
    fontWeight: 500,
    color: 'var(--color-error)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  buttonIcon: {
    fontSize: 'var(--font-sm)',
  },
  spinner: {
    width: '12px',
    height: '12px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
  },
}
