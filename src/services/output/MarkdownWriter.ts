import type { MarkdownOutputInput, OutputWriteResult } from '../../types/output'

export interface MarkdownWriter {
  write(outputDir: string, input: MarkdownOutputInput): Promise<OutputWriteResult>
}
