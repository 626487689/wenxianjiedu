import type { SourceFileRef } from '../../types/file'
import type { ModelConfig } from '../../types/config'
import type { JobState, TaskItem } from '../../types/task'
import type { FileGateway } from '../../repositories/file/FileGateway'
import { createId } from '../../utils/id'
import { joinFilePath } from '../../utils/path'
import { nowIso } from '../../utils/time'
import { buildOutputFileName } from '../../services/output/fileName'
import { normalizeRunError } from '../../utils/runError'
import { RunSingleInterpretationUseCase } from './RunSingleInterpretationUseCase'
import { ConcurrencyManager, Task } from '../../utils/concurrencyManager'
import { logger } from '../../services/logger/LoggerService'
import { pluginManager } from '../../plugins/PluginManager'

export interface RunBatchInterpretationInput {
  files: SourceFileRef[]
  outputDir: string
  promptContent: string
  promptName?: string
  modelConfig: ModelConfig
  batchConfig: {
    concurrency: number
    retryCount: number
    skipExistingOutput: boolean
  }
  runtimeApiKey?: string
  signal?: AbortSignal
  onProgress?: (state: JobState) => void
  onStageChange?: (stage: string) => void
  shouldCancel?: () => boolean
  enableChunking?: boolean
}

export class RunBatchInterpretationUseCase {
  constructor(
    private readonly runSingleUseCase: RunSingleInterpretationUseCase,
    private readonly fileGateway: FileGateway,
  ) {}

  async execute(input: RunBatchInterpretationInput): Promise<JobState> {
    const items: TaskItem[] = input.files.map((file) => ({
      id: createId('task'),
      file,
      status: 'pending',
    }))

    const state: JobState = {
      id: createId('job'),
      mode: input.files.length > 1 ? 'batch' : 'single',
      total: items.length,
      completed: 0,
      failed: 0,
      cancelledCount: 0,
      skippedCount: 0,
      cancelled: false,
      currentItemId: undefined,
      currentItemIds: [],
      items,
    }

    const concurrency = clampInteger(input.batchConfig.concurrency, 1, 6)
    const retryCount = clampInteger(input.batchConfig.retryCount, 0, 5)

    input.onProgress?.(cloneState(state))

    // 初始化插件管理器
    if (!pluginManager.isInitialized()) {
      await pluginManager.initialize()
    }

    // 触发批处理开始前的插件事件
    await pluginManager.emitBatchBeforeStart(input.files)

    const finalizePendingAsCancelled = () => {
      state.cancelled = true
      for (const pending of state.items.filter((x) => x.status === 'pending')) {
        pending.status = 'cancelled'
        pending.finishedAt = nowIso()
        state.cancelledCount += 1
      }
    }

    const updateCurrentItems = () => {
      state.currentItemId = state.currentItemIds[0]
    }

    // 创建并发管理器
    const concurrencyManager = new ConcurrencyManager<void>(concurrency)

    // 监听取消信号
    if (input.signal) {
      input.signal.addEventListener('abort', () => {
        concurrencyManager.cancel()
        finalizePendingAsCancelled()
        input.onProgress?.(cloneState(state))
      })
    }

    // 为每个文件创建任务
    const tasks: Task<void>[] = items.map((item) => ({
      id: item.id,
      priority: 0, // 可以根据文件大小或其他因素设置优先级
      execute: async () => {
        // 检查是否取消
        if (input.shouldCancel?.() || input.signal?.aborted) {
          item.status = 'cancelled'
          item.finishedAt = nowIso()
          item.errorCode = 'CANCELLED'
          item.errorMessage = '任务已取消'
          state.cancelled = true
          state.cancelledCount += 1
          return
        }

        const expectedOutputPath = joinFilePath(input.outputDir, buildOutputFileName(item.file.name))
        if (input.batchConfig.skipExistingOutput && (await this.fileGateway.exists(expectedOutputPath))) {
          item.status = 'success'
          item.skipped = true
          item.outputPath = expectedOutputPath
          item.finishedAt = nowIso()
          item.attempts = 0
          state.completed += 1
          state.skippedCount += 1
          return
        }

        for (let attempt = 1; attempt <= retryCount + 1; attempt += 1) {
          item.attempts = attempt

          // 检查是否取消
          if (input.shouldCancel?.() || input.signal?.aborted) {
            item.status = 'cancelled'
            item.finishedAt = nowIso()
            item.errorCode = 'CANCELLED'
            item.errorMessage = '任务已取消'
            state.cancelled = true
            state.cancelledCount += 1
            return
          }

          try {
            const result = await this.runSingleUseCase.execute({
              file: item.file,
              outputDir: input.outputDir,
              promptContent: input.promptContent,
              promptName: input.promptName,
              modelConfig: input.modelConfig,
              runtimeApiKey: input.runtimeApiKey,
              signal: input.signal,
              onStageChange: (stage) => input.onStageChange?.(`${item.file.name}：${stage}`),
              enableChunking: input.enableChunking,
            })

            item.status = 'success'
            item.finishedAt = nowIso()
            item.outputPath = result.outputPath
            item.chunking = result.chunking
            item.errorCode = undefined
            item.errorMessage = undefined
            state.completed += 1
            break
          } catch (error) {
            const normalized = normalizeRunError(error, '批处理执行失败')

            if (normalized.isCancelled) {
              item.status = 'cancelled'
              item.finishedAt = nowIso()
              item.errorCode = normalized.code
              item.errorMessage = normalized.message
              state.cancelled = true
              state.cancelledCount += 1
              return
            }

            item.errorCode = normalized.code

            if (attempt <= retryCount) {
              item.errorMessage = `第 ${attempt} 次尝试失败：${normalized.message}`
              input.onStageChange?.(`${item.file.name}：处理失败，准备进行第 ${attempt + 1} 次尝试`)
              continue
            }

            item.status = 'failed'
            item.finishedAt = nowIso()
            item.errorMessage = normalized.message
            state.failed += 1
            break
          }
        }
      },
      onStart: () => {
        item.status = 'running'
        item.startedAt = item.startedAt ?? nowIso()
        state.currentItemIds = [...state.currentItemIds, item.id]
        updateCurrentItems()
        input.onProgress?.(cloneState(state))
      },
      onComplete: () => {
        state.currentItemIds = state.currentItemIds.filter((id) => id !== item.id)
        updateCurrentItems()
        input.onProgress?.(cloneState(state))
      },
      onError: (error) => {
        logger.error(`任务 ${item.id} 执行失败: ${error}`)
        state.currentItemIds = state.currentItemIds.filter((id) => id !== item.id)
        updateCurrentItems()
        input.onProgress?.(cloneState(state))
      }
    }))

    // 添加所有任务到并发管理器
    tasks.forEach(task => concurrencyManager.addTask(task))

    // 等待所有任务完成
    await new Promise<void>((resolve) => {
      const checkComplete = () => {
        const status = concurrencyManager.getStatus()
        if (status.running === 0 && status.queueLength === 0) {
          resolve()
        } else {
          setTimeout(checkComplete, 100)
        }
      }
      checkComplete()
    })

    if (state.mode === 'batch') {
      try {
        state.reportPath = await this.writeBatchReport(input.outputDir, state)
      } catch {
        state.reportPath = undefined
      }
    }

    state.currentItemIds = []
    state.currentItemId = undefined
    input.onProgress?.(cloneState(state))

    // 触发批处理完成后的插件事件
    await pluginManager.emitBatchAfterComplete(cloneState(state))

    return cloneState(state)
  }

  private async writeBatchReport(outputDir: string, state: JobState): Promise<string> {
    const stamp = nowIso().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
    const reportPath = joinFilePath(outputDir, `批处理报告_${stamp}.md`)
    const content = [
      '# 批处理报告',
      '',
      `- 生成时间：${nowIso()}`,
      `- 总任务数：${state.total}`,
      `- 已完成：${state.completed}`,
      `- 失败：${state.failed}`,
      `- 已取消：${state.cancelledCount}`,
      `- 跳过已有输出：${state.skippedCount}`,
      '',
      '## 任务明细',
      '',
      ...state.items.flatMap((item) => [
        `### ${item.file.name}`,
        `- 状态：${formatTaskStatus(item)}`,
        `- 尝试次数：${item.attempts ?? 0}`,
        `- 输出路径：${item.outputPath ?? '无'}`,
        `- 错误码：${item.errorCode ?? '无'}`,
        `- 错误信息：${item.errorMessage ?? '无'}`,
        '',
      ]),
    ].join('\n')

    await this.fileGateway.writeTextFile(reportPath, content)
    return reportPath
  }
}

function formatTaskStatus(item: TaskItem): string {
  if (item.skipped) {
    return '已跳过（沿用已有输出）'
  }

  switch (item.status) {
    case 'success':
      return '已完成'
    case 'failed':
      return '失败'
    case 'cancelled':
      return '已取消'
    case 'running':
      return '执行中'
    case 'pending':
      return '等待中'
  }
}

function cloneState(state: JobState): JobState {
  return JSON.parse(JSON.stringify(state)) as JobState
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.max(min, Math.min(max, Math.floor(value)))
}
