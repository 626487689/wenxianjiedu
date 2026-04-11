import type { FileGateway } from '../../repositories/file/FileGateway'
import type { SourceFileRef } from '../../types/file'
import { createId } from '../../utils/id'

export interface LoadInputFilesInput {
  sourcePath: string
  sourceType: 'file' | 'folder'
  recursive: boolean
}

function inferExt(path: string): 'pdf' | 'md' | 'txt' | null {
  const lower = path.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.md')) return 'md'
  if (lower.endsWith('.txt')) return 'txt'
  return null
}

function inferName(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || path
}

export class LoadInputFilesUseCase {
  constructor(private readonly fileGateway: FileGateway) {}

  async execute(input: LoadInputFilesInput): Promise<SourceFileRef[]> {
    if (!input.sourcePath.trim()) {
      throw new Error('输入路径不能为空')
    }

    if (input.sourceType === 'file') {
      const ext = inferExt(input.sourcePath)
      if (!ext) {
        return []
      }

      return [
        {
          id: createId('file'),
          path: input.sourcePath,
          name: inferName(input.sourcePath),
          ext,
        },
      ]
    }

    return this.fileGateway.scanSupportedFiles(input.sourcePath, {
      recursive: input.recursive,
    })
  }
}
