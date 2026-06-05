import type { JournalEntry } from './module-contract'

export type JournalEntryPayload = Omit<JournalEntry, 'id'>

type RawFrontmatterValue = string | string[]

const BOUNDARY = '---'
const KEY_PATTERN = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/

export function serializeJournalEntry(entry: JournalEntry): string {
  const frontmatter = [
    BOUNDARY,
    `title: ${quoteScalar(entry.title)}`,
    `date: ${quoteScalar(entry.date)}`,
    `fullDate: ${quoteScalar(entry.fullDate)}`,
    `created: ${quoteScalar(entry.created)}`,
    `modified: ${quoteScalar(entry.modified)}`,
    `mood: ${quoteScalar(entry.mood)}`,
    'tags:',
    ...entry.tags.map(tag => `  - ${quoteScalar(tag)}`),
    BOUNDARY,
    ''
  ]

  return `${frontmatter.join('\n')}${entry.content}`
}

export function parseJournalMarkdown(content: string, fallback: Partial<JournalEntryPayload> = {}): JournalEntryPayload {
  const parsed = parseFrontmatter(content)
  const now = new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
  const body = parsed.body.trimStart()
  const title = stringValue(parsed.raw['title']) ?? titleFromBody(body) ?? fallback.title ?? 'Imported Journal Entry'
  const date = stringValue(parsed.raw['date']) ?? fallback.date ?? 'Imported'
  const fullDate = stringValue(parsed.raw['fullDate']) ?? fallback.fullDate ?? date

  return {
    title,
    date,
    fullDate,
    preview: previewFromContent(body),
    content: body,
    created: stringValue(parsed.raw['created']) ?? fallback.created ?? now,
    modified: stringValue(parsed.raw['modified']) ?? fallback.modified ?? now,
    mood: stringValue(parsed.raw['mood']) ?? fallback.mood ?? '',
    tags: stringArrayValue(parsed.raw['tags']) ?? fallback.tags ?? [],
    archivedAt: null
  }
}

export function previewFromContent(content: string): string {
  return content.replace(/[#*_`\-[\]\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 32) || 'No content yet'
}

function parseFrontmatter(content: string): { body: string; raw: Record<string, RawFrontmatterValue> } {
  const withoutBom = content.replace(/^\uFEFF/, '')
  const lines = withoutBom.split(/\r?\n/)
  if (lines[0]?.trim() !== BOUNDARY) {
    return { body: content, raw: {} }
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === BOUNDARY)
  if (closingIndex === -1) {
    return { body: content, raw: {} }
  }

  return {
    body: lines.slice(closingIndex + 1).join('\n').replace(/^\n/, ''),
    raw: parseRawFrontmatter(lines.slice(1, closingIndex).join('\n'))
  }
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
      raw[key] = unquote(inlineValue)
      continue
    }

    const values: string[] = []
    let cursor = index + 1
    while (cursor < lines.length && !KEY_PATTERN.test(lines[cursor])) {
      const value = unquote(lines[cursor].trim().replace(/^-\s+/, ''))
      if (value) values.push(value)
      cursor += 1
    }

    raw[key] = values.length > 1 || key === 'tags' ? values : values[0] ?? ''
    index = cursor - 1
  }

  return raw
}

function stringValue(value: RawFrontmatterValue | undefined): string | undefined {
  if (Array.isArray(value) || value === undefined) return undefined
  return value.trim() || undefined
}

function stringArrayValue(value: RawFrontmatterValue | undefined): string[] | undefined {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return undefined
}

function quoteScalar(value: string): string {
  return JSON.stringify(value)
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function titleFromBody(content: string): string | null {
  const heading = content.match(/^#\s+(.+)$/m)
  return heading?.[1]?.trim() || null
}
