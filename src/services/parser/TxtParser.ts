import type { FileGateway } from '../../repositories/file/FileGateway'
import type { ParsedDocument } from '../../types/parser'
import type { SourceFileRef } from '../../types/file'

export class TxtParser {
  constructor(private readonly fileGateway: FileGateway) {}

  async parse(file: SourceFileRef): Promise<ParsedDocument> {
    const text = await this.fileGateway.readTextFile(file.path)

    if (!text.trim()) {
      throw new Error('EMPTY_CONTENT')
    }

    return {
      id: file.id,
      path: file.path,
      name: file.name,
      kind: 'txt',
      text,
      meta: {
        extractedAt: new Date().toISOString(),
      },
    }
  }
}
