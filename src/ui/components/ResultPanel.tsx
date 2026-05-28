import React, { useState, useEffect } from 'react'
import type { ChunkingMetadata } from '../../types/prompt'
import type { JobState, TaskItem, TaskItemStatus } from '../../types/task'
import { PanelCard } from './PanelCard'

type ResultPanelProps = {
  latestOutputPath?: string
  latestOutputContent?: string
  latestError?: string
  latestChunking?: ChunkingMetadata
  latestPaperDirection?: any
  jobState?: JobState | null
}

export function ResultPanel(props: ResultPanelProps) {
  const items = props.jobState?.items ?? []
  const batchStats = summarizeBatchChunking(items)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    outputPath: true,
    batchReport: true,
    error: true,
    chunking: true,
    paperDirection: true,
    batchStats: true,
    jobSummary: true,
    items: true,
    preview: true,
  })

  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  const sections = [
    {
      key: 'outputPath',
      label: '最近输出路径',
      hasContent: !!props.latestOutputPath,
      render: () => (
        <div style={styles.box}>
          <div style={styles.boxContent}>{props.latestOutputPath || '暂无'}</div>
          {props.latestOutputPath && (
            <button
              style={styles.copyButton}
              onClick={() => copyToClipboard(props.latestOutputPath!, 'outputPath')}
            >
              {copiedKey === 'outputPath' ? '✓ 已复制' : '复制'}
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'batchReport',
      label: '批处理报告',
      hasContent: !!props.jobState?.reportPath,
      render: () => (
        <div style={styles.box}>
          <div style={styles.boxContent}>{props.jobState?.reportPath || '暂无'}</div>
          {props.jobState?.reportPath && (
            <button
              style={styles.copyButton}
              onClick={() => copyToClipboard(props.jobState!.reportPath!, 'batchReport')}
            >
              {copiedKey === 'batchReport' ? '✓ 已复制' : '复制'}
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'error',
      label: '最近错误',
      hasContent: !!props.latestError,
      render: () => (
        <div style={styles.boxError}>
          <div style={styles.boxContent}>{props.latestError || '无'}</div>
          {props.latestError && (
            <button
              style={styles.copyButton}
              onClick={() => copyToClipboard(props.latestError!, 'error')}
            >
              {copiedKey === 'error' ? '✓ 已复制' : '复制'}
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'chunking',
      label: '长文处理状态',
      hasContent: !!props.latestChunking?.enabled,
      render: () => (
        <div style={styles.box}>
          <div style={styles.boxContent}>{formatChunkingSummary(props.latestChunking)}</div>
          <button
            style={styles.copyButton}
            onClick={() => copyToClipboard(formatChunkingSummary(props.latestChunking), 'chunking')}
          >
            {copiedKey === 'chunking' ? '✓ 已复制' : '复制'}
          </button>
        </div>
      ),
    },
    {
      key: 'paperDirection',
      label: '论文方向分析',
      hasContent: !!props.latestPaperDirection,
      render: () => (
        <div style={styles.box}>
          <div style={styles.boxContent}>{formatPaperDirectionSummary(props.latestPaperDirection)}</div>
          <button
            style={styles.copyButton}
            onClick={() => copyToClipboard(formatPaperDirectionSummary(props.latestPaperDirection), 'paperDirection')}
          >
            {copiedKey === 'paperDirection' ? '✓ 已复制' : '复制'}
          </button>
        </div>
      ),
    },
    {
      key: 'batchStats',
      label: '批量长文统计',
      hasContent: batchStats.total > 0,
      render: () => (
        <div style={styles.box}>
          <div style={styles.boxContent}>{formatBatchChunkingSummary(batchStats)}</div>
          <button
            style={styles.copyButton}
            onClick={() => copyToClipboard(formatBatchChunkingSummary(batchStats), 'batchStats')}
          >
            {copiedKey === 'batchStats' ? '✓ 已复制' : '复制'}
          </button>
        </div>
      ),
    },
    {
      key: 'jobSummary',
      label: '批处理汇总',
      hasContent: !!props.jobState,
      render: () => (
        <div style={styles.box}>
          <div style={styles.boxContent}>{formatJobSummary(props.jobState)}</div>
          <button
            style={styles.copyButton}
            onClick={() => copyToClipboard(formatJobSummary(props.jobState), 'jobSummary')}
          >
            {copiedKey === 'jobSummary' ? '✓ 已复制' : '复制'}
          </button>
        </div>
      ),
    },
  ]

  return (
    <PanelCard title="结果与日志">
      <div style={styles.container}>
        {sections.map((section) => (
          <div key={section.key} style={styles.section}>
            <div
              style={styles.sectionHeader}
              onClick={() => toggleSection(section.key)}
            >
              <div style={styles.sectionLeft}>
                <span style={styles.label}>{section.label}</span>
                {section.hasContent && (
                  <span style={styles.contentBadge}>有内容</span>
                )}
              </div>
              <button style={styles.toggleButton}>
                {expandedSections[section.key] ? '▼' : '▶'}
              </button>
            </div>
            {expandedSections[section.key] && (
              <div className="animate-fadeIn" style={styles.sectionContent}>
                {section.render()}
              </div>
            )}
          </div>
        ))}

        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('items')}>
            <div style={styles.sectionLeft}>
              <span style={styles.label}>任务项状态</span>
              <span style={styles.countBadge}>{items.length}</span>
            </div>
            <button style={styles.toggleButton}>
              {expandedSections.items ? '▼' : '▶'}
            </button>
          </div>
          {expandedSections.items && (
            <div className="animate-fadeIn" style={styles.sectionContent}>
              <div style={styles.items}>
                {items.length === 0 ? (
                  <div style={styles.empty}>暂无任务记录</div>
                ) : (
                  items.map((item) => {
                    const statusMeta = getStatusMeta(item.status, item.skipped)

                    return (
                      <div key={item.id} style={styles.item} className="animate-fadeIn">
                        <div style={styles.itemHeader}>
                          <span style={styles.itemName}>{item.file.name}</span>
                          <span style={{ ...styles.statusBadge, ...statusMeta.badgeStyle }}>
                            {statusMeta.label}
                          </span>
                        </div>
                        {item.attempts ? (
                          <div style={styles.itemMeta}>尝试次数：{item.attempts}</div>
                        ) : null}
                        {item.errorMessage ? (
                          <div style={styles.itemError}>{item.errorMessage}</div>
                        ) : null}
                        {item.status === 'cancelled' ? (
                          <div style={styles.itemCancelled}>任务在执行过程中被用户取消</div>
                        ) : null}
                        {item.skipped ? (
                          <div style={styles.itemSkipped}>检测到已有输出，当前任务已跳过并沿用原结果</div>
                        ) : null}
                        {item.outputPath ? (
                          <div style={styles.itemPath}>
                            <div style={styles.itemPathContent}>{item.outputPath}</div>
                            <button
                              style={styles.itemCopyButton}
                              onClick={() => copyToClipboard(item.outputPath!, `item-${item.id}`)}
                            >
                              {copiedKey === `item-${item.id}` ? '✓' : '复制'}
                            </button>
                          </div>
                        ) : null}
                        {item.chunking ? (
                          <div style={styles.itemChunking}>
                            {formatItemChunkingSummary(item.chunking)}
                          </div>
                        ) : null}
                        {item.startedAt && (
                          <div style={styles.itemMeta}>开始时间：{new Date(item.startedAt).toLocaleString()}</div>
                        )}
                        {item.finishedAt && (
                          <div style={styles.itemMeta}>完成时间：{new Date(item.finishedAt).toLocaleString()}</div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('preview')}>
            <div style={styles.sectionLeft}>
              <span style={styles.label}>最近结果预览</span>
              {props.latestOutputContent && (
                <span style={styles.contentBadge}>有内容</span>
              )}
            </div>
            <button style={styles.toggleButton}>
              {expandedSections.preview ? '▼' : '▶'}
            </button>
          </div>
          {expandedSections.preview && (
            <div className="animate-fadeIn" style={styles.sectionContent}>
              <div style={styles.previewContainer}>
                <pre style={styles.preview}>
                  {props.latestOutputContent || '暂无结果'}
                </pre>
                {props.latestOutputContent && (
                  <button
                    style={styles.copyButton}
                    onClick={() => copyToClipboard(props.latestOutputContent!, 'preview')}
                  >
                    {copiedKey === 'preview' ? '✓ 已复制' : '复制'}
                  </button>
                )}
              </div>
            </div>
          )}
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

function formatPaperDirectionSummary(paperDirection?: any): string {
  if (!paperDirection) {
    return '暂无论文方向分析结果'
  }

  const lines = [
    `主要方向: ${paperDirection.mainDirection}`,
    `子方向: ${paperDirection.subDirections?.join(', ') ?? '无'}`,
    `核心关键词: ${paperDirection.keywords?.join(', ') ?? '无'}`,
    `置信度: ${paperDirection.confidence ?? '未知'}`,
  ]

  return lines.join('\n')
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
        backgroundColor: '#ecfccb',
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
          backgroundColor: '#f3f4f6',
          color: '#4b5563',
          borderColor: '#d1d5db',
        },
      }
    case 'running':
      return {
        label: '执行中',
        badgeStyle: {
          backgroundColor: '#dbeafe',
          color: '#1d4ed8',
          borderColor: '#93c5fd',
        },
      }
    case 'success':
      return {
        label: '已完成',
        badgeStyle: {
          backgroundColor: '#dcfce7',
          color: '#166534',
          borderColor: '#86efac',
        },
      }
    case 'failed':
      return {
        label: '失败',
        badgeStyle: {
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          borderColor: '#fca5a5',
        },
      }
    case 'cancelled':
      return {
        label: '已取消',
        badgeStyle: {
          backgroundColor: '#fef3c7',
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
    gap: 'var(--spacing-sm)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  sectionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
  },
  label: {
    fontSize: 'var(--font-sm)',
    color: 'var(--color-text-secondary)',
    fontWeight: 500,
  },
  contentBadge: {
    padding: '1px 6px',
    fontSize: 'var(--font-xs)',
    fontWeight: 500,
    color: 'var(--color-success)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: '999px',
  },
  countBadge: {
    padding: '1px 6px',
    fontSize: 'var(--font-xs)',
    fontWeight: 600,
    color: 'var(--color-primary)',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: '999px',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
    cursor: 'pointer',
    padding: '0 4px',
    transition: 'transform var(--transition-fast)',
  },
  sectionContent: {
    paddingLeft: 'var(--spacing-md)',
    paddingRight: 'var(--spacing-md)',
  },
  box: {
    fontSize: 'var(--font-sm)',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    wordBreak: 'break-all',
    minHeight: '20px',
    whiteSpace: 'pre-wrap',
    position: 'relative',
  },
  boxContent: {
    marginBottom: 'var(--spacing-sm)',
  },
  copyButton: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '4px 8px',
    fontSize: 'var(--font-xs)',
    cursor: 'pointer',
    color: 'var(--color-text-secondary)',
    transition: 'all var(--transition-fast)',
  },
  previewContainer: {
    position: 'relative',
  },
  boxError: {
    fontSize: 'var(--font-sm)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    color: 'var(--color-error)',
    wordBreak: 'break-all',
    minHeight: '20px',
  },
  items: {
    maxHeight: '200px',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
  },
  item: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    backgroundColor: 'var(--color-surface)',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--spacing-sm)',
    alignItems: 'center',
    fontSize: 'var(--font-sm)',
  },
  itemName: {
    fontWeight: 600,
    wordBreak: 'break-all',
    flex: 1,
  },
  itemMeta: {
    marginTop: '4px',
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    border: '1px solid transparent',
    padding: '2px 8px',
    fontSize: 'var(--font-xs)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  itemError: {
    marginTop: '4px',
    fontSize: 'var(--font-xs)',
    color: 'var(--color-error)',
    wordBreak: 'break-all',
  },
  itemCancelled: {
    marginTop: '4px',
    fontSize: 'var(--font-xs)',
    color: 'var(--color-warning)',
    wordBreak: 'break-all',
  },
  itemSkipped: {
    marginTop: '4px',
    fontSize: 'var(--font-xs)',
    color: 'var(--color-success)',
    wordBreak: 'break-all',
  },
  itemPath: {
    marginTop: '4px',
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-tertiary)',
    wordBreak: 'break-all',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPathContent: {
    flex: 1,
    marginRight: 'var(--spacing-sm)',
  },
  itemCopyButton: {
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: 'var(--font-xs)',
    cursor: 'pointer',
    color: 'var(--color-text-secondary)',
  },
  itemChunking: {
    marginTop: '4px',
    fontSize: 'var(--font-xs)',
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    padding: '4px 6px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  preview: {
    minHeight: '150px',
    maxHeight: '280px',
    overflow: 'auto',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-md)',
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: 'var(--font-xs)',
    lineHeight: 1.6,
    fontFamily: 'var(--font-mono)',
  },
  empty: {
    padding: 'var(--spacing-lg)',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-tertiary)',
    fontSize: 'var(--font-sm)',
    textAlign: 'center',
  },
}
