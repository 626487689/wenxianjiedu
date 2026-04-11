export function joinFilePath(dir: string, fileName: string): string {
  const normalizedDir = dir.replace(/[\\/]+$/, '')
  return `${normalizedDir}/${fileName}`
}
