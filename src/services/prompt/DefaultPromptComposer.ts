import type { PromptComposer } from './PromptComposer'
import type { ComposePromptInput, ComposedPrompt } from '../../types/prompt'

const MAX_DOCUMENT_CHARS = 15000
const DOCUMENT_TRUNCATION_NOTICE = '\n\n[内容过长，已为模型调用自动截断。当前已优先保留前部完整段落，并在容量边界处截取剩余正文；如需完整分析，请分段处理原文。]'

export class DefaultPromptComposer implements PromptComposer {
  compose(input: ComposePromptInput): ComposedPrompt {
    const { promptContent, document, skipTruncation } = input
    const prepared = buildPromptDocumentText(document.text, skipTruncation)

    const userPrompt = [
      '你将阅读一篇文献或文本材料。请严格按照以下要求进行解读：',
      '',
      promptContent,
      '',
      '以下是文献内容：',
      `文件名：${document.name}`,
      `文件类型：${document.kind}`,
      '文献正文：',
      prepared.text,
    ].join('\n')

    return {
      userPrompt,
      sourceSummary: {
        fileName: document.name,
        filePath: document.path,
        kind: document.kind,
      },
      truncation: {
        applied: prepared.truncated,
        originalLength: prepared.originalLength,
        finalLength: prepared.finalLength,
      },
    }
  }
}

function buildPromptDocumentText(text: string, skipTruncation?: boolean): {
  text: string
  truncated: boolean
  originalLength: number
  finalLength: number
} {
  const normalized = text.trim()
  const originalLength = normalized.length

  if (skipTruncation || originalLength <= MAX_DOCUMENT_CHARS) {
    return {
      text: normalized,
      truncated: false,
      originalLength,
      finalLength: originalLength,
    }
  }

  const bodyBudget = MAX_DOCUMENT_CHARS - DOCUMENT_TRUNCATION_NOTICE.length
  const paragraphs = normalized.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)

  const selected: string[] = []
  let used = 0

  for (const paragraph of paragraphs) {
    const joinCost = selected.length > 0 ? 2 : 0
    if (used + joinCost + paragraph.length <= bodyBudget) {
      selected.push(paragraph)
      used += joinCost + paragraph.length
      continue
    }

    const remaining = bodyBudget - used - joinCost
    if (remaining > 80) {
      selected.push(paragraph.slice(0, remaining).trimEnd())
      used += joinCost + selected[selected.length - 1].length
    }
    break
  }

  const truncatedBody = selected.join('\n\n').trimEnd()
  const finalText = `${truncatedBody}${DOCUMENT_TRUNCATION_NOTICE}`

  return {
    text: finalText,
    truncated: true,
    originalLength,
    finalLength: finalText.length,
  }
}
