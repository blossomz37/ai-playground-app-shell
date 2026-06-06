import type { DocumentKindOption } from './module-contract'

export const UNCATEGORIZED_KIND_VALUE = '__uncategorized__'
export const UNCATEGORIZED_KIND_LABEL = 'Uncategorized'
export const STRUCTURAL_FOLDER_KIND_VALUE = '__folder__'
export const STRUCTURAL_FOLDER_KIND_LABEL = 'Folder'

export const DEFAULT_DOCUMENT_KIND_OPTIONS: DocumentKindOption[] = [
  { id: 'chapter', label: 'Chapter' },
  { id: 'scene', label: 'Scene' },
  { id: 'plan', label: 'Plan' },
  { id: 'note', label: 'Note' },
  { id: 'research', label: 'Research' },
  { id: 'character', label: 'Character' },
  { id: 'setting', label: 'Setting' },
  { id: 'outline', label: 'Outline' }
]

export function documentKindValue(kind: string | null): string {
  return kind ?? UNCATEGORIZED_KIND_VALUE
}

export function documentKindFromValue(value: string): string | null {
  return value === UNCATEGORIZED_KIND_VALUE ? null : value
}

export function labelForDocumentKind(kind: string | null, options: DocumentKindOption[]): string {
  if (kind === null) return UNCATEGORIZED_KIND_LABEL
  return options.find(option => option.id === kind)?.label ?? titleCaseKind(kind)
}

export function normalizeDocumentKindOptions(value: unknown): DocumentKindOption[] {
  if (!Array.isArray(value)) return DEFAULT_DOCUMENT_KIND_OPTIONS

  const options: DocumentKindOption[] = []
  const seen = new Set<string>()
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const id = 'id' in item ? String(item.id).trim() : ''
    const label = 'label' in item ? String(item.label).trim() : ''
    if (!id || !label || seen.has(id) || id === UNCATEGORIZED_KIND_VALUE || id === 'folder') continue
    options.push({ id, label })
    seen.add(id)
  }

  return options.length > 0 ? options : DEFAULT_DOCUMENT_KIND_OPTIONS
}

export function slugifyDocumentKindLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'kind'
}

function titleCaseKind(kind: string): string {
  return kind
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || kind
}
