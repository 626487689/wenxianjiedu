import type { SourceFileRef } from './file'
import type { ChunkingMetadata } from './prompt'

export type TaskMode = 'single' | 'batch'

export type TaskItemStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'

export interface TaskItem {
  id: string
  file: SourceFileRef
  status: TaskItemStatus
  attempts?: number
  skipped?: boolean
  startedAt?: string
  finishedAt?: string
  outputPath?: string
  errorCode?: string
  errorMessage?: string
  chunking?: ChunkingMetadata
}

export interface JobState {
  id: string
  mode: TaskMode
  total: number
  completed: number
  failed: number
  cancelledCount: number
  skippedCount: number
  cancelled: boolean
  currentItemId?: string
  currentItemIds: string[]
  reportPath?: string
  items: TaskItem[]
}
