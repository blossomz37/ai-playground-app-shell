import { readable } from 'svelte/store'
import {
  TableViewStateSlice,
  type TableFilterKind,
  type TableViewPersistenceSnapshot,
  type TableSortBy,
  type TableViewState
} from '@shared/state/tableview-state'
import { documents, workspaceId } from '../../store'
import { getModuleState } from '../module-state-registry'

const tableViewState = getModuleState<TableViewStateSlice>('shell.tableview', 'tableview')
let activeWorkspaceId = ''
let persistenceReady = false

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
export const tableSortBy = writableTableField(
  state => state.sortBy,
  value => tableViewState.setSortBy(value as TableSortBy)
)
export const selectedTableDocId = fromTableViewState(state => state.selectedDocId)
export const filteredTableDocuments = fromTableViewState(state => state.filteredDocuments)
export const selectedTableDoc = fromTableViewState(state => state.selectedDoc)

export function selectTableDoc(id: string): void {
  tableViewState.selectDoc(id)
}

export function ensureVisibleSelection(): void {
  tableViewState.ensureVisibleSelection()
}

function persistenceKey(wsId: string): string {
  return `modules.tableview.${wsId}.state`
}

async function loadTablePersistence(wsId: string): Promise<void> {
  activeWorkspaceId = wsId
  persistenceReady = false
  const snapshot = await window.shell.settings.get(persistenceKey(wsId)) as TableViewPersistenceSnapshot | undefined
  if (activeWorkspaceId !== wsId) return
  persistenceReady = true
  tableViewState.hydrate(snapshot)
}

workspaceId.subscribe((wsId) => {
  void loadTablePersistence(wsId)
})

tableViewState.subscribe(() => {
  if (!persistenceReady || !activeWorkspaceId) return
  void window.shell.settings.set(persistenceKey(activeWorkspaceId), tableViewState.persistenceSnapshot())
})
