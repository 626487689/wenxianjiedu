export function sanitizeFileName(name: string): string {
  return name.replace(/[<>:\"/\\|?*\x00-\x1F]/g, '_').trim()
}

export function buildOutputFileName(sourceName: string): string {
  const lastDotIndex = sourceName.lastIndexOf('.')
  const baseName = lastDotIndex > 0 ? sourceName.slice(0, lastDotIndex) : sourceName
  return `${sanitizeFileName(baseName)}_解读.md`
}
