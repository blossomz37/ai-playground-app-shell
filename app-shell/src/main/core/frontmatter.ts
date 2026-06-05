import type { DocumentSourceMetadata } from '@shared/module-contract'

type RawFrontmatterValue = string | number | string[]

export interface ParsedFrontmatter {
  body: string
  metadata: DocumentSourceMetadata | null
}

const FRONTMATTER_BOUNDARY = '---'
const KEY_PATTERN = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/

export function parseFrontmatter(content: string): ParsedFrontmatter {
  const withoutBom = content.replace(/^\uFEFF/, '')
  const lines = withoutBom.split(/\r?\n/)
  if (lines[0]?.trim() !== FRONTMATTER_BOUNDARY) {
    return { body: content, metadata: null }
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === FRONTMATTER_BOUNDARY)
  if (closingIndex === -1) {
    return { body: content, metadata: null }
  }

  const rawText = lines.slice(1, closingIndex).join('\n')
  const raw = parseRawFrontmatter(rawText)
  const body = lines.slice(closingIndex + 1).join('\n').replace(/^\n/, '')
  if (Object.keys(raw).length === 0) {
    return { body, metadata: null }
  }

  const metadata = normalizeFrontmatter(raw, rawText)

  return { body, metadata }
}

function parseRawFrontmatter(rawText: string): Record<string, RawFrontmatterValue> {
  const lines = rawText.split(/\r?\n/)
  const raw: Record<string, RawFrontmatterValue> = {}

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const match = line.match(KEY_PATTERN)
    if (!match) continue

    const key = match[1]
    const inlineValue = match[2]?.trim() ?? ''
    if (inlineValue) {
      raw[key] = parseScalar(inlineValue)
      continue
    }

    const values: string[] = []
    let cursor = index + 1
    while (cursor < lines.length && !KEY_PATTERN.test(lines[cursor])) {
      const value = normalizeContinuationLine(lines[cursor])
      if (value) values.push(value)
      cursor += 1
    }

    if (values.length === 0) {
      raw[key] = ''
    } else if (key === 'related' || values.length > 1) {
      raw[key] = values
    } else {
      raw[key] = parseScalar(values[0])
    }

    index = cursor - 1
  }

  return raw
}

function normalizeContinuationLine(line: string): string {
  return unquote(line.trim().replace(/^-\s+/, ''))
}

function parseScalar(value: string): string | number {
  const normalized = unquote(value)
  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    const numberValue = Number(normalized)
    if (Number.isFinite(numberValue)) return numberValue
  }
  return normalized
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).trim()
  }
  return value.trim()
}

function normalizeFrontmatter(raw: Record<string, RawFrontmatterValue>, rawText: string): DocumentSourceMetadata {
  return {
    file: stringValue(raw['file']),
    description: stringValue(raw['description']),
    version: stringValue(raw['version']),
    created: stringValue(raw['created']),
    modified: stringValue(raw['modified']),
    author: stringValue(raw['author']),
    status: stringValue(raw['status']),
    related: stringArrayValue(raw['related']),
    word_count: numberValue(raw['word_count']),
    raw,
    rawText
  }
}

function stringValue(value: RawFrontmatterValue | undefined): string | undefined {
  if (Array.isArray(value) || value === undefined) return undefined
  return String(value).trim() || undefined
}

function stringArrayValue(value: RawFrontmatterValue | undefined): string[] | undefined {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return undefined
}

function numberValue(value: RawFrontmatterValue | undefined): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
