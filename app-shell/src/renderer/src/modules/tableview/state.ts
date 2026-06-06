import { readable } from 'svelte/store'
import {
  TableViewStateSlice,
  type TableFilterKind,
  type TableFolderOption,
  type TableSearchMode,
  type TableUpdatedRange,
  type TableSortBy,
  type TableViewState
} from '@shared/state/tableview-state'
import { documents, workspaceId } from '../../store'
import { getModuleState } from '../module-state-registry'
import { connectSettingsBackedPersistence } from '../settings-backed-persistence'

const tableViewState = getModuleState<TableViewStateSlice>('shell.tableview', 'tableview')

documents.subscribe((docs) => {
  tableViewState.setDocuments(docs)
})

function fromTableViewState<T>(selector: (state: TableViewState) => T) {
  return readable(selector(tableViewState.getSnapshot()), (set) =>
    tableViewState.subscribe((state) => set(selector(state)))
  )
}

function writableTableField<T>(
  selector: (state: TableViewState) => T,
  setValue: (value: T) => void
) {
  return {
    subscribe: fromTableViewState(selector).subscribe,
    set: setValue
  }
}

export const tableFilterKind = writableTableField(
  state => state.filterKind,
  value => tableViewState.setFilterKind(value as TableFilterKind)
)
export const tableKindFilterMode = fromTableViewState(state => state.kindFilterMode)
export const tableSelectedKinds = writableTableField(
  state => state.selectedKinds,
  value => tableViewState.setSelectedKinds(value)
)
export const tableSearchQuery = writableTableField(
  state => state.searchQuery,
  value => tableViewState.setSearchQuery(value)
)
export const tableSearchMode = writableTableField(
  state => state.searchMode,
  value => tableViewState.setSearchMode(value as TableSearchMode)
)
export const tableFolderFilterId = writableTableField(
  state => state.folderFilterId,
  value => tableViewState.setFolderFilter(value)
)
export const tableFolderOptions = fromTableViewState<TableFolderOption[]>(state => state.folderOptions)
export const tableWordCountMin = writableTableField(
  state => state.wordCountMin,
  value => tableViewState.setWordCountRange(value, tableViewState.getSnapshot().wordCountMax)
)
export const tableWordCountMax = writableTableField(
  state => state.wordCountMax,
  value => tableViewState.setWordCountRange(tableViewState.getSnapshot().wordCountMin, value)
)
export const tableUpdatedRange = writableTableField(
  state => state.updatedRange,
  value => tableViewState.setUpdatedRange(value as TableUpdatedRange)
)
export const tableSortBy = writableTableField(
  state => state.sortBy,
  value => tableViewState.setSortBy(value as TableSortBy)
)
export const selectedTableDocId = fromTableViewState(state => state.selectedDocId)
export const selectedTableDocIds = fromTableViewState(state => state.selectedDocIds)
export const selectedTableFileIds = fromTableViewState(state => state.selectedFileIds)
export const selectedTableFolderIds = fromTableViewState(state => state.selectedFolderIds)
export const tableVisibleSelectedCount = fromTableViewState(state => state.visibleSelectedCount)
export const tableAllVisibleSelected = fromTableViewState(state => state.allVisibleSelected)
export const tableSomeVisibleSelected = fromTableViewState(state => state.someVisibleSelected)
export const tableDocuments = fromTableViewState(state => state.documents)
export const filteredTableDocuments = fromTableViewState(state => state.filteredDocuments)
export const selectedTableDoc = fromTableViewState(state => state.selectedDoc)
export const tableHasActiveFilters = fromTableViewState(state => state.hasActiveFilters)
export const tableFilterSummary = fromTableViewState(state => state.filterSummary)
export const tableDocumentCount = fromTableViewState(state => state.documents.length)

export function selectTableDoc(id: string): void {
  tableViewState.selectDoc(id)
}

export function toggleTableDocSelection(id: string, range = false): void {
  tableViewState.toggleDocSelection(id, range)
}

export function toggleTableVisibleSelection(): void {
  tableViewState.toggleVisibleSelection()
}

export function clearTableSelection(): void {
  tableViewState.clearSelection()
}

export function ensureVisibleSelection(): void {
  tableViewState.ensureVisibleSelection()
}

export function resetTableFilters(): void {
  tableViewState.resetFilters()
}

export function setTableAllKinds(): void {
  tableViewState.setAllKinds()
}

export function setTableSelectedKinds(kinds: string[]): void {
  tableViewState.setSelectedKinds(kinds)
}

export function setTableWordCountRange(min: number | undefined, max: number | undefined): void {
  tableViewState.setWordCountRange(min, max)
}

export function setTableUpdatedRange(range: TableUpdatedRange): void {
  tableViewState.setUpdatedRange(range)
}

function persistenceKey(wsId: string): string {
  return `modules.tableview.${wsId}.state`
}

connectSettingsBackedPersistence({
  label: 'shell.tableview',
  workspaceId,
  slice: tableViewState,
  settingsKey: persistenceKey
})
