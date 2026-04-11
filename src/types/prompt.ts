import type { FileKind } from './file'
import type { ParsedDocument } from './parser'

export interface PromptTemplate {
  id: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface ComposePromptInput {
  promptContent: string
  document: ParsedDocument
}

export interface ChunkingMetadata {
  enabled: boolean
  chunkCount?: number
  originalLength: number
  finalLength: number
  degraded?: boolean
  degradeReason?: string
}

export interface ComposedPrompt {
  userPrompt: string
  sourceSummary: {
    fileName: string
    filePath: string
    kind: FileKind
  }
  truncation: {
    applied: boolean
    originalLength: number
    finalLength: number
  }
  chunking?: ChunkingMetadata
}
