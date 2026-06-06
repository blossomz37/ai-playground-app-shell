import type { Doc } from '../module-contract'
import { ObservableSlice } from './observable'

export type TableFilterKind = 'all' | string
export type TableSortBy = 'title' | 'updatedAt' | 'createdAt' | 'kind'
export type TableKindFilterMode = 'all' | 'custom'
export type TableUpdatedRange = 'all' | 'today' | '7d' | '30d'

export interface TableViewState {
  documents: Doc[]
  filterKind: TableFilterKind
  kindFilterMode: TableKindFilterMode
  selectedKinds: string[]
  searchQuery: string
  wordCountMin?: number
  wordCountMax?: number
  updatedRange: TableUpdatedRange
  sortBy: TableSortBy
  selectedDocId: string | null
  filteredDocuments: Doc[]
  selectedDoc: Doc | null
  hasActiveFilters: boolean
  filterSummary: string
}

export interface TableViewPersistenceSnapshot {
  filterKind?: TableFilterKind
  kindFilterMode?: TableKindFilterMode
  selectedKinds?: string[]
  searchQuery?: string
  wordCountMin?: number
  wordCountMax?: number
  updatedRange?: TableUpdatedRange
  sortBy: TableSortBy
  selectedDocId: string | null
}

export class TableViewStateSlice extends ObservableSlice<TableViewState> {
  private documents: Doc[] = []
  private kindFilterMode: TableKindFilterMode = 'all'
  private selectedKinds: string[] = []
  private searchQuery = ''
  private wordCountMin: number | undefined
  private wordCountMax: number | undefined
  private updatedRange: TableUpdatedRange = 'all'
  private sortBy: TableSortBy = 'title'
  private selectedDocId: string | null = null

  getSnapshot(): TableViewState {
    const filteredDocuments = this.filteredDocuments()
    const filterKind = this.filterKind()
    return {
      documents: this.documents,
      filterKind,
      kindFilterMode: this.kindFilterMode,
      selectedKinds: [...this.selectedKinds],
      searchQuery: this.searchQuery,
      wordCountMin: this.wordCountMin,
      wordCountMax: this.wordCountMax,
      updatedRange: this.updatedRange,
      sortBy: this.sortBy,
      selectedDocId: this.selectedDocId,
      filteredDocuments,
      selectedDoc: this.documents.find(doc => doc.id === this.selectedDocId) ?? null,
      hasActiveFilters: this.hasActiveFilters(),
      filterSummary: `Showing ${filteredDocuments.length} of ${this.documents.length} documents`
    }
  }

  setDocuments(documents: Doc[]): void {
    this.documents = documents
    this.ensureVisibleSelection()
    this.emit()
  }

  setFilterKind(filterKind: TableFilterKind): void {
    if (filterKind === 'all') {
      this.kindFilterMode = 'all'
      this.selectedKinds = []
    } else {
      this.kindFilterMode = 'custom'
      this.selectedKinds = [filterKind]
    }
    this.ensureVisibleSelection()
    this.emit()
  }

  setSelectedKinds(kinds: string[]): void {
    const normalized = uniqueKinds(kinds)
    this.kindFilterMode = 'custom'
    this.selectedKinds = normalized
    this.ensureVisibleSelection()
    this.emit()
  }

  setAllKinds(): void {
    this.kindFilterMode = 'all'
    this.selectedKinds = []
    this.ensureVisibleSelection()
    this.emit()
  }

  setSearchQuery(searchQuery: string): void {
    this.searchQuery = searchQuery
    this.ensureVisibleSelection()
    this.emit()
  }

  setSortBy(sortBy: TableSortBy): void {
    this.sortBy = sortBy
    this.ensureVisibleSelection()
    this.emit()
  }

  setWordCountRange(min: number | undefined, max: number | undefined): void {
    const normalized = normalizeWordCountRange(min, max)
    this.wordCountMin = normalized.min
    this.wordCountMax = normalized.max
    this.ensureVisibleSelection()
    this.emit()
  }

  setUpdatedRange(updatedRange: TableUpdatedRange): void {
    this.updatedRange = isUpdatedRange(updatedRange) ? updatedRange : 'all'
    this.ensureVisibleSelection()
    this.emit()
  }

  resetFilters(): void {
    this.kindFilterMode = 'all'
    this.selectedKinds = []
    this.searchQuery = ''
    this.wordCountMin = undefined
    this.wordCountMax = undefined
    this.updatedRange = 'all'
    this.ensureVisibleSelection()
    this.emit()
  }

  selectDoc(id: string): void {
    this.selectedDocId = id
    this.emit()
  }

  ensureVisibleSelection(): void {
    const rows = this.filteredDocuments()
    if (this.selectedDocId && rows.some(row => row.id === this.selectedDocId)) return
    this.selectedDocId = rows[0]?.id ?? null
  }

  hydrate(snapshot: TableViewPersistenceSnapshot | undefined): void {
    if (!snapshot) {
      this.ensureVisibleSelection()
      this.emit()
      return
    }

    const migrated = migrateSnapshot(snapshot)
    this.kindFilterMode = migrated.kindFilterMode
    this.selectedKinds = migrated.selectedKinds
    this.searchQuery = snapshot.searchQuery ?? ''
    const normalizedRange = normalizeWordCountRange(snapshot.wordCountMin, snapshot.wordCountMax)
    this.wordCountMin = normalizedRange.min
    this.wordCountMax = normalizedRange.max
    this.updatedRange = isUpdatedRange(snapshot.updatedRange) ? snapshot.updatedRange : 'all'
    this.sortBy = snapshot.sortBy ?? 'title'
    this.selectedDocId = snapshot.selectedDocId
    this.ensureVisibleSelection()
    this.emit()
  }

  persistenceSnapshot(): TableViewPersistenceSnapshot {
    return {
      kindFilterMode: this.kindFilterMode,
      selectedKinds: [...this.selectedKinds],
      searchQuery: this.searchQuery,
      wordCountMin: this.wordCountMin,
      wordCountMax: this.wordCountMax,
      updatedRange: this.updatedRange,
      sortBy: this.sortBy,
      selectedDocId: this.selectedDocId
    }
  }

  private filteredDocuments(): Doc[] {
    const query = this.searchQuery.trim().toLowerCase()
    const kindFiltered = this.kindFilterMode === 'all'
      ? [...this.documents]
      : this.documents.filter(doc => this.selectedKinds.includes(doc.kind))

    const searchFiltered = query
      ? kindFiltered.filter(doc =>
          doc.title.toLowerCase().includes(query)
          || doc.content.toLowerCase().includes(query)
        )
      : kindFiltered

    const wordFiltered = searchFiltered.filter(doc => {
      const count = countWords(doc.content)
      if (this.wordCountMin !== undefined && count < this.wordCountMin) return false
      if (this.wordCountMax !== undefined && count > this.wordCountMax) return false
      return true
    })

    const dateFiltered = wordFiltered.filter(doc => documentMatchesUpdatedRange(doc, this.updatedRange))

    return dateFiltered.sort((a, b) => {
      if (this.sortBy === 'updatedAt') return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      if (this.sortBy === 'createdAt') return Date.parse(b.createdAt) - Date.parse(a.createdAt)
      if (this.sortBy === 'kind') return a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title)
      return a.title.localeCompare(b.title)
    })
  }

  private filterKind(): TableFilterKind {
    if (this.kindFilterMode === 'all') return 'all'
    return this.selectedKinds.length === 1 ? this.selectedKinds[0] : 'custom'
  }

  private hasActiveFilters(): boolean {
    return this.kindFilterMode !== 'all'
      || this.searchQuery.trim() !== ''
      || this.wordCountMin !== undefined
      || this.wordCountMax !== undefined
      || this.updatedRange !== 'all'
  }
}

function uniqueKinds(kinds: string[]): string[] {
  const out: string[] = []
  for (const kind of kinds) {
    const normalized = kind.trim()
    if (!normalized || out.includes(normalized)) continue
    out.push(normalized)
  }
  return out
}

function normalizeWordCountRange(
  min: number | undefined,
  max: number | undefined
): { min?: number; max?: number } {
  const normalizedMin = normalizeWordCount(min)
  const normalizedMax = normalizeWordCount(max)
  if (normalizedMin !== undefined && normalizedMax !== undefined && normalizedMin > normalizedMax) {
    return { min: normalizedMax, max: normalizedMin }
  }
  return { min: normalizedMin, max: normalizedMax }
}

function normalizeWordCount(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined
  return Math.max(0, Math.floor(value))
}

function isUpdatedRange(value: unknown): value is TableUpdatedRange {
  return value === 'all' || value === 'today' || value === '7d' || value === '30d'
}

function migrateSnapshot(snapshot: TableViewPersistenceSnapshot): {
  kindFilterMode: TableKindFilterMode
  selectedKinds: string[]
} {
  if (snapshot.kindFilterMode === 'custom') {
    return {
      kindFilterMode: 'custom',
      selectedKinds: uniqueKinds(snapshot.selectedKinds ?? [])
    }
  }

  if (snapshot.kindFilterMode === 'all') {
    return { kindFilterMode: 'all', selectedKinds: [] }
  }

  if (!snapshot.filterKind || snapshot.filterKind === 'all') {
    return { kindFilterMode: 'all', selectedKinds: [] }
  }

  return { kindFilterMode: 'custom', selectedKinds: [snapshot.filterKind] }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function documentMatchesUpdatedRange(doc: Doc, range: TableUpdatedRange): boolean {
  if (range === 'all') return true
  const updatedAt = Date.parse(doc.updatedAt)
  if (!Number.isFinite(updatedAt)) return false

  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  if (range === 'today') return updatedAt >= start.getTime()

  const days = range === '7d' ? 7 : 30
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return updatedAt >= cutoff
}
