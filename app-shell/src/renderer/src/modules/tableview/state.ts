import { derived, get, writable } from 'svelte/store'
import { documents } from '../../store'

export const tableFilterKind = writable('all')
export const tableSortBy = writable('title')
export const selectedTableDocId = writable<string | null>(null)

export const filteredTableDocuments = derived(
  [documents, tableFilterKind, tableSortBy],
  ([$documents, $filterKind, $sortBy]) => {
    const filtered = $filterKind === 'all'
      ? [...$documents]
      : $documents.filter(doc => doc.kind === $filterKind)

    return filtered.sort((a, b) => {
      if ($sortBy === 'updatedAt') return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      if ($sortBy === 'createdAt') return Date.parse(b.createdAt) - Date.parse(a.createdAt)
      if ($sortBy === 'kind') return a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title)
      return a.title.localeCompare(b.title)
    })
  }
)

export const selectedTableDoc = derived(
  [documents, selectedTableDocId],
  ([$documents, $id]) => $documents.find(doc => doc.id === $id) ?? null
)

export function selectTableDoc(id: string): void {
  selectedTableDocId.set(id)
}

export function ensureVisibleSelection(): void {
  const rows = get(filteredTableDocuments)
  const selected = get(selectedTableDocId)
  if (selected && rows.some(row => row.id === selected)) return
  selectedTableDocId.set(rows[0]?.id ?? null)
}
