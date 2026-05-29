import { createContext, useContext, useState, useCallback, useRef, useMemo, type ReactNode } from 'react'
import type { SourceFileRef } from '../../types/file'
import type { JobState } from '../../types/task'
import type { ChunkingMetadata } from '../../types/prompt'
import { appFacade } from '../../app/appFacade'
import { logger } from '../../services/logger/LoggerService'

interface TaskContextValue {
  // Execution state
  jobState: JobState | null
  setJobState: (s: JobState | null) => void
  isRunning: boolean
  setIsRunning: (v: boolean) => void
  isCancelling: boolean
  setIsCancelling: (v: boolean) => void
  concurrency: number
  setConcurrency: (v: number) => void
  retryCount: number
  setRetryCount: (v: number) => void
  skipExistingOutput: boolean
  setSkipExistingOutput: (v: boolean) => void
  enableChunking: boolean
  setEnableChunking: (v: boolean) => void

  // Result state
  latestOutputPath: string | undefined
  setLatestOutputPath: (v: string | undefined) => void
  latestOutputContent: string | undefined
  setLatestOutputContent: (v: string | undefined) => void
  latestError: string | undefined
  setLatestError: (v: string | undefined) => void
  latestChunking: ChunkingMetadata | undefined
  setLatestChunking: (v: ChunkingMetadata | undefined) => void
  currentStage: string | undefined
  setCurrentStage: (v: string | undefined) => void

  // Logs
  logs: string[]
  addLog: (msg: string) => void
  progress: number
  setProgress: (v: number) => void

  // Computed
  canStart: boolean
  canCancel: boolean
  currentFileNames: string[]

  // Abort control
  cancelRequestedRef: React.MutableRefObject<boolean>
  runAbortControllerRef: React.MutableRefObject<AbortController | null>
}

const TaskContext = createContext<TaskContextValue | null>(null)

export function useTaskContext() {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTaskContext must be used within TaskProvider')
  return ctx
}

interface Props {
  children: ReactNode
  /** Whether all required fields are filled to allow starting */
  canStart: boolean
}

export function TaskProvider({ children, canStart }: Props) {
  const [jobState, setJobState] = useState<JobState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [concurrency, setConcurrency] = useState(1)
  const [retryCount, setRetryCount] = useState(0)
  const [skipExistingOutput, setSkipExistingOutput] = useState(false)
  const [enableChunking, setEnableChunking] = useState(false)

  const [latestOutputPath, setLatestOutputPath] = useState<string | undefined>()
  const [latestOutputContent, setLatestOutputContent] = useState<string | undefined>()
  const [latestError, setLatestError] = useState<string | undefined>()
  const [latestChunking, setLatestChunking] = useState<ChunkingMetadata | undefined>()
  const [currentStage, setCurrentStage] = useState<string | undefined>()
  const [logs, setLogs] = useState<string[]>([])
  const [progress, setProgress] = useState(0)

  const cancelRequestedRef = useRef(false)
  const runAbortControllerRef = useRef<AbortController | null>(null)

  const canCancel = useMemo(() => isRunning && !isCancelling, [isRunning, isCancelling])

  const currentFileNames = useMemo(() => {
    if (!jobState) return []
    return jobState.currentItemIds
      .map((itemId) => jobState.items.find((item) => item.id === itemId)?.file.name)
      .filter((value): value is string => Boolean(value))
  }, [jobState])

  const addLog = useCallback((msg: string) => {
    setLogs(prev => {
      const next = [...prev, msg]
      return next.length > 100 ? next.slice(-100) : next
    })
  }, [])

  const value: TaskContextValue = {
    jobState, setJobState,
    isRunning, setIsRunning,
    isCancelling, setIsCancelling,
    concurrency, setConcurrency,
    retryCount, setRetryCount,
    skipExistingOutput, setSkipExistingOutput,
    enableChunking, setEnableChunking,
    latestOutputPath, setLatestOutputPath,
    latestOutputContent, setLatestOutputContent,
    latestError, setLatestError,
    latestChunking, setLatestChunking,
    currentStage, setCurrentStage,
    logs, addLog,
    progress, setProgress,
    canStart, canCancel, currentFileNames,
    cancelRequestedRef, runAbortControllerRef,
  }

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>
}

export { TaskContext }
