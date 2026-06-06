import type { Doc } from '../module-contract'
import { ObservableSlice } from './observable'
import { documentKindValue, STRUCTURAL_FOLDER_KIND_VALUE } from '../document-kinds'

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
  selectedDocIds: string[]
  selectedFileIds: string[]
  selectedFolderIds: string[]
  visibleSelectedCount: number
  allVisibleSelected: boolean
  someVisibleSelected: boolean
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
  private selectedDocIds = new Set<string>()
  private lastSelectedDocId: string | null = null

  getSnapshot(): TableViewState {
    const filteredDocuments = this.filteredDocuments()
    const filterKind = this.filterKind()
    const selectedDocs = this.documents.filter(doc => this.selectedDocIds.has(doc.id))
    const visibleSelectedCount = filteredDocuments.filter(doc => this.selectedDocIds.has(doc.id)).length
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
      selectedDocIds: selectedDocs.map(doc => doc.id),
      selectedFileIds: selectedDocs.filter(doc => doc.nodeType === 'document').map(doc => doc.id),
      selectedFolderIds: selectedDocs.filter(doc => doc.nodeType === 'folder').map(doc => doc.id),
      visibleSelectedCount,
      allVisibleSelected: filteredDocuments.length > 0 && visibleSelectedCount === filteredDocuments.length,
      someVisibleSelected: visibleSelectedCount > 0,
      filteredDocuments,
      selectedDoc: this.documents.find(doc => doc.id === this.selectedDocId) ?? null,
      hasActiveFilters: this.hasActiveFilters(),
      filterSummary: `Showing ${filteredDocuments.length} of ${this.documents.length} documents`
    }
  }

  setDocuments(documents: Doc[]): void {
    this.documents = documents
    this.ensureVisibleSelection()
    this.pruneSelectionToFiltered()
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
    this.pruneSelectionToFiltered()
    this.emit()
  }

  setSelectedKinds(kinds: string[]): void {
    const normalized = uniqueKinds(kinds)
    this.kindFilterMode = 'custom'
    this.selectedKinds = normalized
    this.ensureVisibleSelection()
    this.pruneSelectionToFiltered()
    this.emit()
  }

  setAllKinds(): void {
    this.kindFilterMode = 'all'
    this.selectedKinds = []
    this.ensureVisibleSelection()
    this.pruneSelectionToFiltered()
    this.emit()
  }

  setSearchQuery(searchQuery: string): void {
    this.searchQuery = searchQuery
    this.ensureVisibleSelection()
    this.pruneSelectionToFiltered()
    this.emit()
  }

  setSortBy(sortBy: TableSortBy): void {
    this.sortBy = sortBy
    this.ensureVisibleSelection()
    this.pruneSelectionToFiltered()
    this.emit()
  }

  setWordCountRange(min: number | undefined, max: number | undefined): void {
    const normalized = normalizeWordCountRange(min, max)
    this.wordCountMin = normalized.min
    this.wordCountMax = normalized.max
    this.ensureVisibleSelection()
    this.pruneSelectionToFiltered()
    this.emit()
  }

  setUpdatedRange(updatedRange: TableUpdatedRange): void {
    this.updatedRange = isUpdatedRange(updatedRange) ? updatedRange : 'all'
    this.ensureVisibleSelection()
    this.pruneSelectionToFiltered()
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
    this.pruneSelectionToFiltered()
    this.emit()
  }

  selectDoc(id: string): void {
    this.selectedDocId = id
    this.emit()
  }

  toggleDocSelection(id: string, range = false): void {
    const rows = this.filteredDocuments()
    if (!rows.some(row => row.id === id)) return

    if (range && this.lastSelectedDocId) {
      const start = rows.findIndex(row => row.id === this.lastSelectedDocId)
      const end = rows.findIndex(row => row.id === id)
      if (start !== -1 && end !== -1) {
        const [from, to] = start < end ? [start, end] : [end, start]
        for (const row of rows.slice(from, to + 1)) {
          this.selectedDocIds.add(row.id)
        }
        this.selectedDocId = id
        this.lastSelectedDocId = id
        this.emit()
        return
      }
    }

    if (this.selectedDocIds.has(id)) {
      this.selectedDocIds.delete(id)
    } else {
      this.selectedDocIds.add(id)
    }
    this.selectedDocId = id
    this.lastSelectedDocId = id
    this.emit()
  }

  toggleVisibleSelection(): void {
    const rows = this.filteredDocuments()
    const allSelected = rows.length > 0 && rows.every(row => this.selectedDocIds.has(row.id))
    if (allSelected) {
      for (const row of rows) {
        this.selectedDocIds.delete(row.id)
      }
    } else {
      for (const row of rows) {
        this.selectedDocIds.add(row.id)
      }
    }
    this.lastSelectedDocId = rows.at(-1)?.id ?? this.lastSelectedDocId
    this.emit()
  }

  clearSelection(): void {
    this.selectedDocIds.clear()
    this.lastSelectedDocId = null
    this.emit()
  }

  ensureVisibleSelection(): void {
    const rows = this.filteredDocuments()
    if (this.selectedDocId && rows.some(row => row.id === this.selectedDocId)) return
    this.selectedDocId = rows[0]?.id ?? null
  }

  pruneSelectionToFiltered(): void {
    const visibleIds = new Set(this.filteredDocuments().map(doc => doc.id))
    for (const id of this.selectedDocIds) {
      if (!visibleIds.has(id)) {
        this.selectedDocIds.delete(id)
      }
    }
    if (this.lastSelectedDocId && !this.selectedDocIds.has(this.lastSelectedDocId)) {
      this.lastSelectedDocId = null
    }
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
    this.selectedDocIds.clear()
    this.lastSelectedDocId = null
    this.ensureVisibleSelection()
    this.pruneSelectionToFiltered()
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
      : this.documents.filter(doc => this.selectedKinds.includes(tableKindValue(doc)))

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
      if (this.sortBy === 'kind') return compareDocumentKind(a, b) || a.title.localeCompare(b.title)
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

function compareDocumentKind(left: Doc, right: Doc): number {
  if (left.nodeType === 'folder' && right.nodeType !== 'folder') return -1
  if (left.nodeType !== 'folder' && right.nodeType === 'folder') return 1
  if (left.kind === null && right.kind !== null) return -1
  if (left.kind !== null && right.kind === null) return 1
  return (left.kind ?? '').localeCompare(right.kind ?? '')
}

function tableKindValue(doc: Doc): string {
  return doc.nodeType === 'folder' ? STRUCTURAL_FOLDER_KIND_VALUE : documentKindValue(doc.kind)
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
