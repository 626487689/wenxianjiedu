import type { FileGateway, ScanOptions } from './FileGateway'
import type { SourceFileRef } from '../../types/file'
import { createId } from '../../utils/id'

function normalizeExt(name: string): 'pdf' | 'md' | 'txt' | null {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.md')) return 'md'
  if (lower.endsWith('.txt')) return 'txt'
  return null
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

const selectedFiles = new Map<string, File>()

export class BrowserFileGateway implements FileGateway {
  async pickSingleFile(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.pdf,.md,.txt'
      input.multiple = false
      input.title = '选择论文文件'
      input.onchange = () => {
        const file = input.files?.[0]
        if (file) {
          const fileId = `browser-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          selectedFiles.set(fileId, file)
          resolve(fileId)
        } else {
          resolve(null)
        }
      }
      input.onerror = () => resolve(null)
      input.click()
    })
  }

  async pickFolder(): Promise<string | null> {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        ;(window as any).showDirectoryPicker().then((handle: any) => {
          resolve(`folder-${handle.name || 'selected'}-${Date.now()}`)
        }).catch(() => resolve(null))
      } else {
        const input = document.createElement('input')
        input.type = 'file'
        input.webkitdirectory = true
        input.multiple = false
        input.title = '选择文件夹'
        input.onchange = () => {
          const files = input.files
          if (files && files.length > 0) {
            const folderId = `folder-${Date.now()}`
            Array.from(files).forEach((file: File, index: number) => {
              selectedFiles.set(`${folderId}-${index}`, file)
            })
            resolve(folderId)
          } else {
            resolve(null)
          }
        }
        input.onerror = () => resolve(null)
        input.click()
      }
    })
  }

  async pickOutputDirectory(): Promise<string | null> {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        ;(window as any).showDirectoryPicker().then((handle: any) => {
          resolve(handle.name || 'Output Folder')
        }).catch(() => resolve(null))
      } else {
        const input = document.createElement('input')
        input.type = 'file'
        input.webkitdirectory = true
        input.multiple = false
        input.title = '选择输出目录'
        input.onchange = () => {
          const file = input.files?.[0]
          if (file) {
            const path = file.webkitRelativePath
            const folderPath = path.substring(0, path.lastIndexOf('/'))
            resolve(folderPath || file.name || 'Output Folder')
          } else {
            resolve(null)
          }
        }
        input.onerror = () => resolve(null)
        input.click()
      }
    })
  }

  async scanSupportedFiles(dirPath: string, options: ScanOptions): Promise<SourceFileRef[]> {
    const files: SourceFileRef[] = []
    const supportedExts = ['pdf', 'md', 'txt']
    
    if (dirPath.startsWith('folder-')) {
      selectedFiles.forEach((file, key) => {
        if (key.startsWith(dirPath)) {
          const ext = normalizeExt(file.name)
          if (ext && supportedExts.includes(ext)) {
            files.push({
              id: key,
              path: key,
              name: file.name,
              ext,
            })
          }
        }
      })
    } else {
      for (let i = 0; i < 3; i++) {
        files.push({
          id: createId('file'),
          path: `${dirPath}/document${i + 1}.pdf`,
          name: `document${i + 1}.pdf`,
          ext: 'pdf',
        })
      }
    }

    return files
  }

  async readTextFile(path: string): Promise<string> {
    const file = selectedFiles.get(path)
    if (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve(e.target?.result as string)
        }
        reader.onerror = reject
        reader.readAsText(file)
      })
    }
    
    return `这是文件 ${path} 的内容预览。在浏览器环境中，完整的文件读取功能需要在 Tauri 桌面应用中运行。

文件内容示例：
这是一篇论文的摘要内容...

关键词：人工智能，机器学习，深度学习

摘要：本文介绍了...`
  }

  async readBinaryFile(path: string): Promise<Uint8Array> {
    const file = selectedFiles.get(path)
    if (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer
          resolve(new Uint8Array(arrayBuffer))
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
      })
    }
    return new Uint8Array()
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = path.split('/').pop() || path.split('-').pop() || 'output.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async exists(path: string): Promise<boolean> {
    return selectedFiles.has(path) || true
  }
}
