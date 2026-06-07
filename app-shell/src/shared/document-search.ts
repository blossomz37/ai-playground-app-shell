export type DocumentSearchMode = 'word' | 'regex'
export type DocumentSearchScope = 'document' | 'project'

export interface DocumentSearchMatch {
  start: number
  end: number
  text: string
}

export interface DocumentSearchResult {
  matches: DocumentSearchMatch[]
  error: string | null
}

export interface PersistedDocumentSearchState {
  query: string
  replacement: string
  mode: DocumentSearchMode
  scope: DocumentSearchScope
}

const WORD_BOUNDARY_SOURCE = '[A-Za-z0-9_]'

export function defaultDocumentSearchState(): PersistedDocumentSearchState {
  return {
    query: '',
    replacement: '',
    mode: 'word',
    scope: 'document'
  }
}

export function normalizeDocumentSearchState(value: unknown): PersistedDocumentSearchState {
  const defaults = defaultDocumentSearchState()
  if (!value || typeof value !== 'object') return defaults

  const input = value as Partial<Record<keyof PersistedDocumentSearchState, unknown>>
  return {
    query: typeof input.query === 'string' ? input.query : defaults.query,
    replacement: typeof input.replacement === 'string' ? input.replacement : defaults.replacement,
    mode: input.mode === 'regex' ? 'regex' : 'word',
    scope: input.scope === 'project' ? 'project' : 'document'
  }
}

export function findDocumentMatches(
  text: string,
  query: string,
  mode: DocumentSearchMode,
  limit = Number.POSITIVE_INFINITY
): DocumentSearchResult {
  const trimmed = query.trim()
  if (!trimmed) return { matches: [], error: null }

  const regex = buildSearchRegex(trimmed, mode)
  if (regex instanceof Error) return { matches: [], error: regex.message }

  const matches: DocumentSearchMatch[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0]
    })

    if (matches.length >= limit) break
    if (match[0].length === 0) regex.lastIndex += 1
  }

  return { matches, error: null }
}

export function replaceDocumentMatches(
  text: string,
  query: string,
  mode: DocumentSearchMode,
  replacement: string,
  matches: DocumentSearchMatch[]
): string {
  if (matches.length === 0) return text

  let next = text
  for (const match of [...matches].sort((left, right) => right.start - left.start)) {
    const replacementText = replacementForDocumentMatch(match.text, query, mode, replacement)
    next = `${next.slice(0, match.start)}${replacementText}${next.slice(match.end)}`
  }
  return next
}

export function replacementForDocumentMatch(
  text: string,
  query: string,
  mode: DocumentSearchMode,
  replacement: string
): string {
  if (mode === 'word') return replacement

  const regex = buildSearchRegex(query.trim(), mode, false)
  if (regex instanceof Error) return replacement
  return text.replace(regex, replacement)
}

function buildSearchRegex(query: string, mode: DocumentSearchMode, global = true): RegExp | Error {
  const flags = global ? 'gi' : 'i'
  if (mode === 'word') {
    return new RegExp(`(?<!${WORD_BOUNDARY_SOURCE})${escapeRegExp(query)}(?!${WORD_BOUNDARY_SOURCE})`, flags)
  }

  try {
    return new RegExp(query, flags)
  } catch (error) {
    return new Error(error instanceof Error ? error.message : 'Invalid regular expression.')
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
