import type { Doc } from '../module-contract'
import { ObservableSlice } from './observable'
import { documentKindValue, STRUCTURAL_FOLDER_KIND_VALUE } from '../document-kinds'

export type TableFilterKind = 'all' | string
export type TableSortBy = 'title' | 'updatedAt' | 'createdAt' | 'kind' | 'wordCount' | 'targetWordCount'
export type TableSortDirection = 'asc' | 'desc'
export type TableKindFilterMode = 'all' | 'custom'
export type TableSearchMode = 'text' | 'regex'
export type TableUpdatedRange = 'all' | 'today' | '7d' | '30d'

export interface TableFolderOption {
  id: string
  title: string
  path: string
  depth: number
}

export interface TableViewState {
  documents: Doc[]
  filterKind: TableFilterKind
  kindFilterMode: TableKindFilterMode
  selectedKinds: string[]
  folderFilterId: string | null
  folderOptions: TableFolderOption[]
  searchQuery: string
  searchMode: TableSearchMode
  wordCountMin?: number
  wordCountMax?: number
  updatedRange: TableUpdatedRange
  sortBy: TableSortBy
  sortDirection: TableSortDirection
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
  folderFilterId?: string | null
  searchQuery?: string
  searchMode?: TableSearchMode
  wordCountMin?: number
  wordCountMax?: number
  updatedRange?: TableUpdatedRange
  sortBy?: TableSortBy
  sortDirection?: TableSortDirection
  selectedDocId: string | null
}

export class TableViewStateSlice extends ObservableSlice<TableViewState> {
  private documents: Doc[] = []
  private kindFilterMode: TableKindFilterMode = 'all'
  private selectedKinds: string[] = []
  private folderFilterId: string | null = null
  private searchQuery = ''
  private searchMode: TableSearchMode = 'text'
  private wordCountMin: number | undefined
  private wordCountMax: number | undefined
  private updatedRange: TableUpdatedRange = 'all'
  private sortBy: TableSortBy = 'title'
  private sortDirection: TableSortDirection = defaultSortDirection('title')
  private selectedDocId: string | null = null
  private selectedDocIds = new Set<string>()
  private lastSelectedDocId: string | null = null

  getSnapshot(): TableViewState {
    const filteredDocuments = this.filteredDocuments()
    const filterKind = this.filterKind()
    const selectedDocs = this.documents.filter(doc => this.selectedDocIds.has(doc.id))
    const visibleSelectedCount = filteredDocuments.filter(doc => this.selectedDocIds.has(doc.id)).length
    const folderOptions = buildFolderOptions(this.documents)
    return {
      documents: this.documents,
      filterKind,
      kindFilterMode: this.kindFilterMode,
      selectedKinds: [...this.selectedKinds],
      folderFilterId: this.folderFilterId,
      folderOptions,
      searchQuery: this.searchQuery,
      searchMode: this.searchMode,
      wordCountMin: this.wordCountMin,
      wordCountMax: this.wordCountMax,
      updatedRange: this.updatedRange,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
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
    if (this.folderFilterId && !this.documents.some(doc => doc.id === this.folderFilterId && doc.nodeType === 'folder')) {
      this.folderFilterId = null
    }
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

  setSearchMode(searchMode: TableSearchMode): void {
    this.searchMode = isSearchMode(searchMode) ? searchMode : 'text'
    this.ensureVisibleSelection()
    this.pruneSelectionToFiltered()
    this.emit()
  }

  setFolderFilter(folderFilterId: string | null): void {
    this.folderFilterId = folderFilterId && this.documents.some(doc => doc.id === folderFilterId && doc.nodeType === 'folder')
      ? folderFilterId
      : null
    this.ensureVisibleSelection()
    this.pruneSelectionToFiltered()
    this.emit()
  }

  setSortBy(sortBy: TableSortBy): void {
    const normalized = isSortBy(sortBy) ? sortBy : 'title'
    if (this.sortBy !== normalized) {
      this.sortBy = normalized
      this.sortDirection = defaultSortDirection(normalized)
    }
    this.ensureVisibleSelection()
    this.pruneSelectionToFiltered()
    this.emit()
  }

  setSortDirection(sortDirection: TableSortDirection): void {
    this.sortDirection = isSortDirection(sortDirection) ? sortDirection : defaultSortDirection(this.sortBy)
    this.ensureVisibleSelection()
    this.pruneSelectionToFiltered()
    this.emit()
  }

  toggleSortBy(sortBy: TableSortBy): void {
    const normalized = isSortBy(sortBy) ? sortBy : 'title'
    if (this.sortBy === normalized) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'
    } else {
      this.sortBy = normalized
      this.sortDirection = defaultSortDirection(normalized)
    }
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
    this.folderFilterId = null
    this.searchQuery = ''
    this.searchMode = 'text'
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
    this.folderFilterId = typeof snapshot.folderFilterId === 'string' ? snapshot.folderFilterId : null
    this.searchQuery = snapshot.searchQuery ?? ''
    this.searchMode = isSearchMode(snapshot.searchMode) ? snapshot.searchMode : 'text'
    const normalizedRange = normalizeWordCountRange(snapshot.wordCountMin, snapshot.wordCountMax)
    this.wordCountMin = normalizedRange.min
    this.wordCountMax = normalizedRange.max
    this.updatedRange = isUpdatedRange(snapshot.updatedRange) ? snapshot.updatedRange : 'all'
    this.sortBy = isSortBy(snapshot.sortBy) ? snapshot.sortBy : 'title'
    this.sortDirection = isSortDirection(snapshot.sortDirection)
      ? snapshot.sortDirection
      : defaultSortDirection(this.sortBy)
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
      folderFilterId: this.folderFilterId,
      searchQuery: this.searchQuery,
      searchMode: this.searchMode,
      wordCountMin: this.wordCountMin,
      wordCountMax: this.wordCountMax,
      updatedRange: this.updatedRange,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
      selectedDocId: this.selectedDocId
    }
  }

  private filteredDocuments(): Doc[] {
    const query = this.searchQuery.trim()
    const folderFiltered = this.folderFilteredDocuments()
    const kindFiltered = this.kindFilterMode === 'all'
      ? folderFiltered
      : folderFiltered.filter(doc => this.selectedKinds.includes(tableKindValue(doc)))

    const searchFiltered = this.searchFilteredDocuments(kindFiltered, query)

    const wordFiltered = searchFiltered.filter(doc => {
      const count = countWords(doc.content)
      if (this.wordCountMin !== undefined && count < this.wordCountMin) return false
      if (this.wordCountMax !== undefined && count > this.wordCountMax) return false
      return true
    })

    const dateFiltered = wordFiltered.filter(doc => documentMatchesUpdatedRange(doc, this.updatedRange))

    return dateFiltered.sort((a, b) => compareDocumentsBySort(a, b, this.sortBy, this.sortDirection))
  }

  private filterKind(): TableFilterKind {
    if (this.kindFilterMode === 'all') return 'all'
    return this.selectedKinds.length === 1 ? this.selectedKinds[0] : 'custom'
  }

  private hasActiveFilters(): boolean {
    return this.kindFilterMode !== 'all'
      || this.folderFilterId !== null
      || this.searchQuery.trim() !== ''
      || this.wordCountMin !== undefined
      || this.wordCountMax !== undefined
      || this.updatedRange !== 'all'
  }

  private searchFilteredDocuments(documents: Doc[], query: string): Doc[] {
    if (!query) return documents

    if (this.searchMode === 'regex') {
      let matcher: RegExp
      try {
        matcher = new RegExp(query, 'i')
      } catch {
        return []
      }
      return documents.filter(doc => matcher.test(`${doc.title}\n${doc.content}`))
    }

    const normalizedQuery = query.toLowerCase()
    return documents.filter(doc =>
      doc.title.toLowerCase().includes(normalizedQuery)
      || doc.content.toLowerCase().includes(normalizedQuery)
    )
  }

  private folderFilteredDocuments(): Doc[] {
    const folderFilterId = this.folderFilterId
    if (!folderFilterId) return [...this.documents]

    const docsById = new Map(this.documents.map(doc => [doc.id, doc]))
    return this.documents.filter(doc => isInFolderSubtree(doc, folderFilterId, docsById))
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

function isSortBy(value: unknown): value is TableSortBy {
  return value === 'title'
    || value === 'updatedAt'
    || value === 'createdAt'
    || value === 'kind'
    || value === 'wordCount'
    || value === 'targetWordCount'
}

function isSortDirection(value: unknown): value is TableSortDirection {
  return value === 'asc' || value === 'desc'
}

function defaultSortDirection(sortBy: TableSortBy): TableSortDirection {
  return sortBy === 'updatedAt' || sortBy === 'createdAt' ? 'desc' : 'asc'
}

function isSearchMode(value: unknown): value is TableSearchMode {
  return value === 'text' || value === 'regex'
}

function isInFolderSubtree(doc: Doc, folderId: string, docsById: Map<string, Doc>): boolean {
  if (doc.id === folderId) return true
  let parentId = doc.parentId
  const seen = new Set<string>()
  while (parentId) {
    if (parentId === folderId) return true
    if (seen.has(parentId)) return false
    seen.add(parentId)
    parentId = docsById.get(parentId)?.parentId ?? null
  }
  return false
}

function buildFolderOptions(documents: Doc[]): TableFolderOption[] {
  const docsById = new Map(documents.map(doc => [doc.id, doc]))
  return documents
    .filter(doc => doc.nodeType === 'folder')
    .map(doc => {
      const segments = folderPathSegments(doc, docsById)
      return {
        id: doc.id,
        title: doc.title,
        path: segments.join('/'),
        depth: Math.max(0, segments.length - 1)
      }
    })
    .sort((left, right) => left.path.localeCompare(right.path) || left.id.localeCompare(right.id))
}

function folderPathSegments(doc: Doc, docsById: Map<string, Doc>): string[] {
  const segments = [doc.title]
  let parentId = doc.parentId
  const seen = new Set<string>([doc.id])
  while (parentId) {
    if (seen.has(parentId)) break
    seen.add(parentId)
    const parent = docsById.get(parentId)
    if (!parent) break
    segments.unshift(parent.title)
    parentId = parent.parentId
  }
  return segments
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

function compareDocumentsBySort(
  left: Doc,
  right: Doc,
  sortBy: TableSortBy,
  direction: TableSortDirection
): number {
  const core = compareDocumentSortValue(left, right, sortBy, direction)
  if (core !== 0) return core
  return compareDocumentTie(left, right)
}

function compareDocumentSortValue(
  left: Doc,
  right: Doc,
  sortBy: TableSortBy,
  direction: TableSortDirection
): number {
  if (sortBy === 'updatedAt') return compareDirected(Date.parse(left.updatedAt), Date.parse(right.updatedAt), direction)
  if (sortBy === 'createdAt') return compareDirected(Date.parse(left.createdAt), Date.parse(right.createdAt), direction)
  if (sortBy === 'kind') return compareDirected(compareDocumentKind(left, right), 0, direction)
  if (sortBy === 'wordCount') return compareDirected(countWords(left.content), countWords(right.content), direction)
  if (sortBy === 'targetWordCount') {
    const leftTarget = targetWordCount(left.metadataJson)
    const rightTarget = targetWordCount(right.metadataJson)
    if (leftTarget === null && rightTarget !== null) return 1
    if (leftTarget !== null && rightTarget === null) return -1
    if (leftTarget === null && rightTarget === null) return 0
    return compareDirected(leftTarget!, rightTarget!, direction)
  }
  return compareDirected(left.title.localeCompare(right.title), 0, direction)
}

function compareDirected(left: number, right: number, direction: TableSortDirection): number {
  const compared = Number.isFinite(left) && Number.isFinite(right)
    ? left - right
    : Number.isFinite(left)
      ? -1
      : Number.isFinite(right)
        ? 1
        : 0
  return direction === 'asc' ? compared : -compared
}

function compareDocumentTie(left: Doc, right: Doc): number {
  return left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
}

function targetWordCount(metadataJson: string | null): number | null {
  if (!metadataJson) return null
  try {
    const metadata = JSON.parse(metadataJson) as { targetWordCount?: unknown }
    return typeof metadata.targetWordCount === 'number' && Number.isFinite(metadata.targetWordCount)
      ? metadata.targetWordCount
      : null
  } catch {
    return null
  }
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
