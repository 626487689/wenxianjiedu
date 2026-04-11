import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import type { FileGateway } from '../../repositories/file/FileGateway'
import type { ParsedDocument } from '../../types/parser'
import type { SourceFileRef } from '../../types/file'

configurePdfWorker()

const HEADER_FOOTER_MIN_REPEAT = 3
const LINE_MERGE_GAP = 4

export class PdfParser {
  constructor(private readonly fileGateway: FileGateway) {}

  async parse(file: SourceFileRef): Promise<ParsedDocument> {
    const data = await this.fileGateway.readBinaryFile(file.path)
    const pdf = await getDocument({ data }).promise

    try {
      const text = await extractPdfText(pdf)
      if (!text.trim()) {
        throw new Error('EMPTY_CONTENT')
      }

      const meta = await readPdfMeta(pdf)

      return {
        id: file.id,
        path: file.path,
        name: file.name,
        kind: 'pdf',
        text,
        meta: {
          byteSize: data.byteLength > 0 ? data.byteLength : undefined,
          extractedAt: new Date().toISOString(),
          title: meta.title,
        },
      }
    } finally {
      await pdf.destroy()
    }
  }
}

function configurePdfWorker(): void {
  const workerPath = new URL('../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url)
  GlobalWorkerOptions.workerSrc = workerPath.toString()
}

async function extractPdfText(pdf: PDFDocumentProxy): Promise<string> {
  const rawPages: string[][] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)

    try {
      const content = await page.getTextContent()
      const lines = buildPageLines(content.items)
      rawPages.push(lines)
    } finally {
      page.cleanup()
    }
  }

  const repeatedEdgeLines = collectRepeatedEdgeLines(rawPages)

  const pageTexts = rawPages
    .map((lines, index) => formatPageText(index + 1, lines, repeatedEdgeLines))
    .filter((value): value is string => Boolean(value))

  return pageTexts.join('\n\n').trim()
}

function buildPageLines(items: readonly unknown[]): string[] {
  const textItems = items.filter(isTextItem)
  const groups = new Map<number, TextItem[]>()

  for (const item of textItems) {
    const y = normalizeY(item)
    const bucket = findLineBucket(groups, y)
    const list = groups.get(bucket) ?? []
    list.push(item)
    groups.set(bucket, list)
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, lineItems]) => lineItems
      .sort((a, b) => normalizeX(a) - normalizeX(b))
      .map((item) => item.str)
      .join(' '))
    .map(normalizeExtractedLine)
    .filter(Boolean)
}

function findLineBucket(groups: Map<number, TextItem[]>, y: number): number {
  for (const key of groups.keys()) {
    if (Math.abs(key - y) <= LINE_MERGE_GAP) {
      return key
    }
  }

  return y
}

function normalizeY(item: TextItem): number {
  const value = item.transform[5]
  return Number.isFinite(value) ? Math.round(value) : 0
}

function normalizeX(item: TextItem): number {
  const value = item.transform[4]
  return Number.isFinite(value) ? value : 0
}

function normalizeExtractedLine(line: string): string {
  return line
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?%\)])/, '$1')
    .replace(/([\(])\s+/g, '$1')
    .trim()
}

function collectRepeatedEdgeLines(pages: string[][]): Set<string> {
  const counter = new Map<string, number>()

  for (const lines of pages) {
    const edges = getEdgeCandidates(lines)
    const seen = new Set(edges)

    for (const line of seen) {
      counter.set(line, (counter.get(line) ?? 0) + 1)
    }
  }

  return new Set(
    Array.from(counter.entries())
      .filter(([, count]) => count >= HEADER_FOOTER_MIN_REPEAT)
      .map(([line]) => line),
  )
}

function getEdgeCandidates(lines: string[]): string[] {
  const candidates: string[] = []
  const first = lines[0]
  const second = lines[1]
  const last = lines[lines.length - 1]

  if (isHeaderFooterCandidate(first)) candidates.push(first)
  if (isHeaderFooterCandidate(second)) candidates.push(second)
  if (isHeaderFooterCandidate(last)) candidates.push(last)

  return candidates
}

function isHeaderFooterCandidate(line: string | undefined): line is string {
  if (!line) return false
  const normalized = line.trim()
  if (!normalized) return false
  if (normalized.length > 120) return false
  return /\d/.test(normalized) || normalized === normalized.toUpperCase()
}

function formatPageText(pageNumber: number, lines: string[], repeatedEdgeLines: Set<string>): string | null {
  const cleanedLines = lines
    .filter((line) => !repeatedEdgeLines.has(line))
    .filter((line) => !isStandalonePageNumber(line))

  if (cleanedLines.length === 0) {
    return null
  }

  const paragraphs = buildParagraphs(cleanedLines)
  if (paragraphs.length === 0) {
    return null
  }

  return `## 第 ${pageNumber} 页\n${paragraphs.join('\n\n')}`
}

function isStandalonePageNumber(line: string): boolean {
  return /^\d+$/.test(line.trim())
}

function buildParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = []
  let current = ''

  for (const line of lines) {
    if (!current) {
      current = line
      continue
    }

    if (shouldStartNewParagraph(current, line)) {
      paragraphs.push(current)
      current = line
      continue
    }

    current = joinParagraphLine(current, line)
  }

  if (current) {
    paragraphs.push(current)
  }

  return paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean)
}

function shouldStartNewParagraph(current: string, next: string): boolean {
  if (isLikelyHeading(next)) return true
  if (/[.!?：:]$/.test(current)) return true
  if (/^[-•*]\s/.test(next)) return true
  if (/^\d+[.)]\s/.test(next)) return true
  return false
}

function isLikelyHeading(line: string): boolean {
  if (line.length > 90) return false
  if (/^(abstract|introduction|conclusion|references|keywords)\b/i.test(line)) return true
  if (/^#+\s/.test(line)) return true
  if (/^[A-Z][A-Z\s\d,&/-]{3,}$/.test(line)) return true
  return false
}

function joinParagraphLine(current: string, next: string): string {
  if (current.endsWith('-') && /^[A-Za-z]/.test(next)) {
    return `${current.slice(0, -1)}${next}`
  }

  return `${current} ${next}`
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?%\)])/, '$1')
    .replace(/([\(])\s+/g, '$1')
    .trim()
}

function isTextItem(item: unknown): item is TextItem {
  return typeof item === 'object' && item !== null && 'str' in item && 'transform' in item
}

async function readPdfMeta(pdf: PDFDocumentProxy): Promise<{ title?: string }> {
  try {
    const metadata = await pdf.getMetadata()
    const info = metadata.info as { Title?: unknown }
    const rawTitle = info.Title
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : ''

    return {
      title: title || undefined,
    }
  } catch {
    return {}
  }
}
