import { open } from '@tauri-apps/plugin-dialog'
import {
  readTextFile,
  writeTextFile,
  exists,
  readDir,
  readFile,
} from '@tauri-apps/plugin-fs'
import type { FileGateway, ScanOptions } from './FileGateway'
import type { SourceFileRef } from '../../types/file'
import { createId } from '../../utils/id'

type DirEntry = {
  name?: string
  isDirectory?: boolean
  children?: DirEntry[]
  path?: string
}

function normalizeExt(name: string): 'pdf' | 'md' | 'txt' | null {
  const lower = name.toLowerCase()
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

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

async function scanDirRecursive(
  dirPath: string,
  recursive: boolean,
): Promise<SourceFileRef[]> {
  const entries = (await readDir(dirPath)) as DirEntry[]
  const files: SourceFileRef[] = []

  for (const entry of entries) {
    const entryPath = entry.path
    if (!entryPath) continue

    const isDir = !!entry.isDirectory

    if (isDir) {
      if (recursive) {
        const nested = await scanDirRecursive(entryPath, recursive)
        files.push(...nested)
      }
      continue
    }

    const name = entry.name ?? inferName(entryPath)
    const ext = normalizeExt(name)
    if (!ext) continue

    files.push({
      id: createId('file'),
      path: normalizePath(entryPath),
      name,
      ext,
    })
  }

  files.sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))
  return files
}

export class TauriFileGateway implements FileGateway {
  async pickSingleFile(): Promise<string | null> {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: 'Supported Documents',
          extensions: ['pdf', 'md', 'txt'],
        },
      ],
    })

    if (!selected || Array.isArray(selected)) {
      return null
    }

    return normalizePath(selected)
  }

  async pickFolder(): Promise<string | null> {
    const selected = await open({
      multiple: false,
      directory: true,
    })

    if (!selected || Array.isArray(selected)) {
      return null
    }

    return normalizePath(selected)
  }

  async pickOutputDirectory(): Promise<string | null> {
    const selected = await open({
      multiple: false,
      directory: true,
    })

    if (!selected || Array.isArray(selected)) {
      return null
    }

    return normalizePath(selected)
  }

  async scanSupportedFiles(
    dirPath: string,
    options: ScanOptions,
  ): Promise<SourceFileRef[]> {
    return scanDirRecursive(dirPath, options.recursive)
  }

  async readTextFile(path: string): Promise<string> {
    return readTextFile(path)
  }

  async readBinaryFile(path: string): Promise<Uint8Array> {
    return readFile(path)
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    await writeTextFile(path, content)
  }

  async exists(path: string): Promise<boolean> {
    return exists(path)
  }
}
