import { readable } from 'svelte/store'
import {
  JournalStateSlice,
  type JournalEntry,
  type JournalPersistenceSnapshot,
  type JournalState
} from '@shared/state/journal-state'
import { workspaceId } from '../../store'
import { getModuleState } from '../module-state-registry'

export type { JournalEntry }

const journalState = getModuleState<JournalStateSlice>('shell.journal', 'journal')
let activeWorkspaceId = ''
let persistenceReady = false

function fromJournalState<T>(selector: (state: JournalState) => T) {
  return readable(selector(journalState.getSnapshot()), (set) =>
    journalState.subscribe((state) => set(selector(state)))
  )
}

export const journalEntries = fromJournalState(state => state.entries)
export const selectedJournalEntryId = fromJournalState(state => state.selectedEntryId)
export const selectedJournalEntry = fromJournalState(state => state.selectedEntry)

export function selectJournalEntry(id: string): void {
  journalState.selectEntry(id)
}

export function renameJournalEntry(id: string, title: string): void {
  journalState.renameEntry(id, title)
}

export function updateSelectedJournalContent(content: string): void {
  journalState.updateSelectedContent(content)
}

export function countJournalWords(text: string): number {
  return journalState.countWords(text)
}

function persistenceKey(wsId: string): string {
  return `modules.journal.${wsId}.state`
}

async function loadJournalPersistence(wsId: string): Promise<void> {
  activeWorkspaceId = wsId
  persistenceReady = false
  const snapshot = await window.shell.settings.get(persistenceKey(wsId)) as JournalPersistenceSnapshot | undefined
  if (activeWorkspaceId !== wsId) return
  persistenceReady = true
  journalState.hydrate(snapshot)
}

workspaceId.subscribe((wsId) => {
  void loadJournalPersistence(wsId)
})

journalState.subscribe(() => {
  if (!persistenceReady || !activeWorkspaceId) return
  void window.shell.settings.set(persistenceKey(activeWorkspaceId), journalState.persistenceSnapshot())
})
