import type { DocumentParser } from './DocumentParser'
import type { FileGateway } from '../../repositories/file/FileGateway'
import type { SourceFileRef } from '../../types/file'
import { TxtParser } from './TxtParser'
import { MdParser } from './MdParser'
import { PdfParser } from './PdfParser'

export class DefaultDocumentParser implements DocumentParser {
  private readonly txtParser: TxtParser
  private readonly mdParser: MdParser
  private readonly pdfParser: PdfParser

  constructor(private readonly fileGateway: FileGateway) {
    this.txtParser = new TxtParser(fileGateway)
    this.mdParser = new MdParser(fileGateway)
    this.pdfParser = new PdfParser(fileGateway)
  }

  async parse(file: SourceFileRef) {
    switch (file.ext) {
      case 'txt':
        return this.txtParser.parse(file)
      case 'md':
        return this.mdParser.parse(file)
      case 'pdf':
        return this.pdfParser.parse(file)
      default:
        throw new Error('UNSUPPORTED_TYPE')
    }
  }
}
