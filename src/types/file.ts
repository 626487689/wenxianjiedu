export type FileKind = 'pdf' | 'md' | 'txt'

export interface SourceFileRef {
  id: string
  path: string
  name: string
  ext: FileKind
}
