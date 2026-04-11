import type { EndpointMode } from '../types/config'

export function normalizeOpenAIEndpoint(raw: string, mode: EndpointMode = 'auto'): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return trimmed
  }

  if (mode === 'manual') {
    return trimmed
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return trimmed
  }

  const normalizedPath = normalizeEndpointPath(url.pathname)
  url.pathname = normalizedPath
  return url.toString()
}

function normalizeEndpointPath(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/'

  if (path === '/') {
    return '/v1/chat/completions'
  }

  if (/\/v\d+$/i.test(path)) {
    return `${path}/chat/completions`
  }

  if (/\/chat\/completions$/i.test(path)) {
    return path
  }

  if (/\/completions$/i.test(path)) {
    return path
  }

  return `${path}/chat/completions`
}
