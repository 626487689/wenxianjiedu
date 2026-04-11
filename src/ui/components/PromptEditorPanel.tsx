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
  return (
    <PanelCard title="提示词与模板">
      <div style={styles.container}>
        <label style={styles.label}>
          模板
          <select
            style={styles.input}
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

        <label style={styles.label}>
          模板名称
          <input
            style={styles.input}
            value={props.templateNameInput}
            onChange={(e) => props.onTemplateNameChange(e.target.value)}
            placeholder="例如：结构化论文解读"
          />
        </label>

        <label style={styles.label}>
          提示词内容
          <textarea
            style={styles.textarea}
            value={props.promptContent}
            onChange={(e) => props.onPromptChange(e.target.value)}
            placeholder="请输入文献解读提示词"
          />
        </label>

        <div style={styles.actions}>
          <button onClick={props.onNewTemplate}>新建模板</button>
          <button onClick={props.onSaveTemplate} disabled={props.saving}>
            {props.saving ? '保存中...' : '保存模板'}
          </button>
          <button onClick={props.onDeleteTemplate} disabled={props.deleting || !props.selectedTemplateId}>
            {props.deleting ? '删除中...' : '删除模板'}
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
    gap: '12px',
    height: '100%',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
  },
  textarea: {
    minHeight: '420px',
    resize: 'vertical',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    lineHeight: 1.6,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
}
