import type { FileKind } from './file'

export interface ParsedDocument {
  id: string
  path: string
  name: string
  kind: FileKind
  text: string
  meta: {
    byteSize?: number
    extractedAt: string
    title?: string
  }
}
