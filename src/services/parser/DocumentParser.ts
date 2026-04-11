import type { SourceFileRef } from '../../types/file'
import type { ParsedDocument } from '../../types/parser'

export interface DocumentParser {
  parse(file: SourceFileRef): Promise<ParsedDocument>
}
