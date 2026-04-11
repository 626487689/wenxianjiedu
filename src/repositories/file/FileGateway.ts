import type { SourceFileRef } from '../../types/file'

export interface ScanOptions {
  recursive: boolean
}

export interface FileGateway {
  pickSingleFile(): Promise<string | null>
  pickFolder(): Promise<string | null>
  pickOutputDirectory(): Promise<string | null>
  scanSupportedFiles(dirPath: string, options: ScanOptions): Promise<SourceFileRef[]>
  readTextFile(path: string): Promise<string>
  readBinaryFile(path: string): Promise<Uint8Array>
  writeTextFile(path: string, content: string): Promise<void>
  exists(path: string): Promise<boolean>
}
