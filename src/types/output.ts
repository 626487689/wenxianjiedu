import type { ParsedDocument } from './parser'
import type { ModelUsage } from './llm'
import type { ChunkingMetadata } from './prompt'

export interface MarkdownOutputInput {
  source: ParsedDocument
  promptName?: string
  modelName: string
  endpointSummary: string
  generatedAt: string
  content: string
  usage?: ModelUsage
  chunking?: ChunkingMetadata
  chunkSummaries?: string[]
  truncation?: {
    applied: boolean
    originalLength: number
    finalLength: number
  }
}

export interface OutputWriteResult {
  outputPath: string
}
