import type { ChunkingMetadata } from '../../types/prompt'
import type { JobState, TaskItem, TaskItemStatus } from '../../types/task'
import { PanelCard } from './PanelCard'

type ResultPanelProps = {
  latestOutputPath?: string
  latestOutputContent?: string
  latestError?: string
  latestChunking?: ChunkingMetadata
  jobState?: JobState | null
}

export function ResultPanel(props: ResultPanelProps) {
  const items = props.jobState?.items ?? []
  const batchStats = summarizeBatchChunking(items)

  return (
    <PanelCard title="结果与日志">
      <div style={styles.container}>
        <div>
          <div style={styles.label}>最近输出路径</div>
          <div style={styles.box}>{props.latestOutputPath || '暂无'}</div>
        </div>

        <div>
          <div style={styles.label}>批处理报告</div>
          <div style={styles.box}>{props.jobState?.reportPath || '暂无'}</div>
        </div>

        <div>
          <div style={styles.label}>最近错误</div>
          <div style={styles.boxError}>{props.latestError || '无'}</div>
        </div>

        <div>
          <div style={styles.label}>长文处理状态</div>
          <div style={styles.box}>{formatChunkingSummary(props.latestChunking)}</div>
        </div>

        <div>
          <div style={styles.label}>批量长文统计</div>
          <div style={styles.box}>{formatBatchChunkingSummary(batchStats)}</div>
        </div>

        <div>
          <div style={styles.label}>批处理汇总</div>
          <div style={styles.box}>{formatJobSummary(props.jobState)}</div>
        </div>

        <div>
          <div style={styles.label}>任务项状态</div>
          <div style={styles.items}>
            {items.length === 0 ? (
              <div style={styles.empty}>暂无任务记录</div>
            ) : (
              items.map((item) => {
                const statusMeta = getStatusMeta(item.status, item.skipped)

                return (
                  <div key={item.id} style={styles.item}>
                    <div style={styles.itemHeader}>
                      <span style={styles.itemName}>{item.file.name}</span>
                      <span style={{ ...styles.statusBadge, ...statusMeta.badgeStyle }}>{statusMeta.label}</span>
                    </div>
                    {item.attempts ? <div style={styles.itemMeta}>尝试次数：{item.attempts}</div> : null}
                    {item.errorMessage ? <div style={styles.itemError}>{item.errorMessage}</div> : null}
                    {item.status === 'cancelled' ? (
                      <div style={styles.itemCancelled}>任务在执行过程中被用户取消</div>
                    ) : null}
                    {item.skipped ? <div style={styles.itemSkipped}>检测到已有输出，当前任务已跳过并沿用原结果</div> : null}
                    {item.outputPath ? <div style={styles.itemPath}>{item.outputPath}</div> : null}
                    {item.chunking ? (
                      <div style={styles.itemChunking}>{formatItemChunkingSummary(item.chunking)}</div>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div>
          <div style={styles.label}>最近结果预览</div>
          <pre style={styles.preview}>{props.latestOutputContent || '暂无结果'}</pre>
        </div>
      </div>
    </PanelCard>
  )
}

function formatChunkingSummary(chunking?: ChunkingMetadata): string {
  if (!chunking) {
    return '暂无长文处理信息'
  }

  if (!chunking.enabled) {
    return '本次任务未启用长文分块'
  }

  const lines = [
    `已启用长文分块，共 ${chunking.chunkCount ?? '未知'} 个分块。`,
    chunking.degraded ? '本次输出已触发降级。' : '本次输出未触发降级。',
  ]

  if (chunking.degraded && chunking.degradeReason) {
    lines.push(`降级原因：${chunking.degradeReason}`)
  }

  return lines.join('\n')
}

function summarizeBatchChunking(items: TaskItem[]): {
  total: number
  chunked: number
  degraded: number
} {
  const completedItems = items.filter((item) => item.status === 'success' && !item.skipped)
  const chunked = completedItems.filter((item) => item.chunking?.enabled).length
  const degraded = completedItems.filter((item) => item.chunking?.enabled && item.chunking.degraded).length

  return {
    total: completedItems.length,
    chunked,
    degraded,
  }
}

function formatBatchChunkingSummary(stats: {
  total: number
  chunked: number
  degraded: number
}): string {
  if (stats.total === 0) {
    return '暂无已完成任务，暂不显示批量统计'
  }

  return [
    `已完成任务数：${stats.total}`,
    `启用长文分块：${stats.chunked}`,
    `触发降级输出：${stats.degraded}`,
  ].join('\n')
}

function formatJobSummary(jobState?: JobState | null): string {
  if (!jobState) {
    return '暂无批处理汇总'
  }

  return [
    `总任务数：${jobState.total}`,
    `完成：${jobState.completed}`,
    `失败：${jobState.failed}`,
    `取消：${jobState.cancelledCount}`,
    `跳过已有输出：${jobState.skippedCount}`,
  ].join('\n')
}

function formatItemChunkingSummary(chunking: ChunkingMetadata): string {
  if (!chunking.enabled) {
    return '长文状态：未启用分块'
  }

  const base = `长文状态：已分块（${chunking.chunkCount ?? '未知'} 段）`
  if (!chunking.degraded) {
    return `${base}；未降级`
  }

  return chunking.degradeReason
    ? `${base}；已降级：${chunking.degradeReason}`
    : `${base}；已降级`
}

function getStatusMeta(
  status: TaskItemStatus,
  skipped?: boolean,
): {
  label: string
  badgeStyle: React.CSSProperties
} {
  if (skipped) {
    return {
      label: '已跳过',
      badgeStyle: {
        background: '#ecfccb',
        color: '#3f6212',
        borderColor: '#bef264',
      },
    }
  }

  switch (status) {
    case 'pending':
      return {
        label: '等待中',
        badgeStyle: {
          background: '#f3f4f6',
          color: '#4b5563',
          borderColor: '#d1d5db',
        },
      }
    case 'running':
      return {
        label: '执行中',
        badgeStyle: {
          background: '#dbeafe',
          color: '#1d4ed8',
          borderColor: '#93c5fd',
        },
      }
    case 'success':
      return {
        label: '已完成',
        badgeStyle: {
          background: '#dcfce7',
          color: '#166534',
          borderColor: '#86efac',
        },
      }
    case 'failed':
      return {
        label: '失败',
        badgeStyle: {
          background: '#fee2e2',
          color: '#b91c1c',
          borderColor: '#fca5a5',
        },
      }
    case 'cancelled':
      return {
        label: '已取消',
        badgeStyle: {
          background: '#fef3c7',
          color: '#92400e',
          borderColor: '#fcd34d',
        },
      }
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '6px',
  },
  box: {
    fontSize: '13px',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px 12px',
    wordBreak: 'break-all',
    minHeight: '20px',
    whiteSpace: 'pre-wrap',
  },
  boxError: {
    fontSize: '13px',
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#9a3412',
    wordBreak: 'break-all',
    minHeight: '20px',
  },
  items: {
    maxHeight: '260px',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  item: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px 12px',
    background: '#fff',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    alignItems: 'center',
    fontSize: '13px',
  },
  itemName: {
    fontWeight: 600,
    wordBreak: 'break-all',
  },
  itemMeta: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#475569',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    border: '1px solid transparent',
    padding: '2px 8px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  itemError: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#b91c1c',
    wordBreak: 'break-all',
  },
  itemCancelled: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#92400e',
    wordBreak: 'break-all',
  },
  itemSkipped: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#3f6212',
    wordBreak: 'break-all',
  },
  itemPath: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#6b7280',
    wordBreak: 'break-all',
  },
  itemChunking: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#1f2937',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '6px 8px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  preview: {
    minHeight: '180px',
    maxHeight: '320px',
    overflow: 'auto',
    background: '#0f172a',
    color: '#e2e8f0',
    borderRadius: '8px',
    padding: '12px',
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '12px',
    lineHeight: 1.6,
  },
  empty: {
    padding: '12px',
    border: '1px dashed #d1d5db',
    borderRadius: '8px',
    color: '#6b7280',
    fontSize: '13px',
  },
}
