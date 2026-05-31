import type { Doc } from '../module-contract'
import { ObservableSlice } from './observable'

export type TableFilterKind = 'all' | string
export type TableSortBy = 'title' | 'updatedAt' | 'createdAt' | 'kind'

export interface TableViewState {
  documents: Doc[]
  filterKind: TableFilterKind
  sortBy: TableSortBy
  selectedDocId: string | null
  filteredDocuments: Doc[]
  selectedDoc: Doc | null
}

export interface TableViewPersistenceSnapshot {
  filterKind: TableFilterKind
  sortBy: TableSortBy
  selectedDocId: string | null
}

export class TableViewStateSlice extends ObservableSlice<TableViewState> {
  private documents: Doc[] = []
  private filterKind: TableFilterKind = 'all'
  private sortBy: TableSortBy = 'title'
  private selectedDocId: string | null = null

  getSnapshot(): TableViewState {
    const filteredDocuments = this.filteredDocuments()
    return {
      documents: this.documents,
      filterKind: this.filterKind,
      sortBy: this.sortBy,
      selectedDocId: this.selectedDocId,
      filteredDocuments,
      selectedDoc: this.documents.find(doc => doc.id === this.selectedDocId) ?? null
    }
  }

  setDocuments(documents: Doc[]): void {
    this.documents = documents
    this.ensureVisibleSelection()
    this.emit()
  }

  setFilterKind(filterKind: TableFilterKind): void {
    this.filterKind = filterKind
    this.ensureVisibleSelection()
    this.emit()
  }

  setSortBy(sortBy: TableSortBy): void {
    this.sortBy = sortBy
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

    this.filterKind = snapshot.filterKind
    this.sortBy = snapshot.sortBy
    this.selectedDocId = snapshot.selectedDocId
    this.ensureVisibleSelection()
    this.emit()
  }

  persistenceSnapshot(): TableViewPersistenceSnapshot {
    return {
      filterKind: this.filterKind,
      sortBy: this.sortBy,
      selectedDocId: this.selectedDocId
    }
  }

  private filteredDocuments(): Doc[] {
    const filtered = this.filterKind === 'all'
      ? [...this.documents]
      : this.documents.filter(doc => doc.kind === this.filterKind)

    return filtered.sort((a, b) => {
      if (this.sortBy === 'updatedAt') return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      if (this.sortBy === 'createdAt') return Date.parse(b.createdAt) - Date.parse(a.createdAt)
      if (this.sortBy === 'kind') return a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title)
      return a.title.localeCompare(b.title)
    })
  }
}
