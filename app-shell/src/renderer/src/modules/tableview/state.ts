import { readable } from 'svelte/store'
import {
  TableViewStateSlice,
  type TableFilterKind,
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
export const tableSearchQuery = writableTableField(
  state => state.searchQuery,
  value => tableViewState.setSearchQuery(value)
)
export const tableSortBy = writableTableField(
  state => state.sortBy,
  value => tableViewState.setSortBy(value as TableSortBy)
)
export const selectedTableDocId = fromTableViewState(state => state.selectedDocId)
export const filteredTableDocuments = fromTableViewState(state => state.filteredDocuments)
export const selectedTableDoc = fromTableViewState(state => state.selectedDoc)
export const tableHasActiveFilters = fromTableViewState(state => state.hasActiveFilters)

export function selectTableDoc(id: string): void {
  tableViewState.selectDoc(id)
}

export function ensureVisibleSelection(): void {
  tableViewState.ensureVisibleSelection()
}

export function resetTableFilters(): void {
  tableViewState.resetFilters()
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
