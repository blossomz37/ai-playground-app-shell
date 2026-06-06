import { readable } from 'svelte/store'
import {
  JournalStateSlice,
  type JournalPersistenceSnapshot,
  type JournalState
} from '@shared/state/journal-state'
import type { JournalEntry } from '@shared/module-contract'
import { workspaceId } from '../../store'
import { getModuleState } from '../module-state-registry'
import { connectSettingsBackedPersistence } from '../settings-backed-persistence'

export type { JournalEntry }

const journalState = getModuleState<JournalStateSlice>('shell.journal', 'journal')

interface JournalCaptureLifecycleParams {
  importFilePaths: string[]
  exportDir: string
}

function fromJournalState<T>(selector: (state: JournalState) => T) {
  return readable(selector(journalState.getSnapshot()), (set) =>
    journalState.subscribe((state) => set(selector(state)))
  )
}

export const journalEntries = fromJournalState(state => state.entries)
export const archivedJournalEntries = fromJournalState(state => state.archivedEntries)
export const selectedJournalEntryId = fromJournalState(state => state.selectedEntryId)
export const selectedJournalEntry = fromJournalState(state => state.selectedEntry)

export function selectJournalEntry(id: string): void {
  journalState.selectEntry(id)
}

export function createJournalEntry(): JournalEntry {
  return journalState.createEntry()
}

export function renameJournalEntry(id: string, title: string): void {
  journalState.renameEntry(id, title)
}

export function updateJournalEntryMetadata(id: string, patch: Partial<Pick<JournalEntry, 'title' | 'mood' | 'tags'>>): void {
  journalState.updateEntryMetadata(id, patch)
}

export function updateSelectedJournalContent(content: string): void {
  journalState.updateSelectedContent(content)
}

export async function importJournalEntries(): Promise<JournalEntry[]> {
  const candidates = await window.shell.journal.pickImportFiles()
  return journalState.importEntries(candidates.map(candidate => candidate.entry))
}

export async function exportJournalEntry(id: string) {
  const entries = journalState.entriesForExport([id])
  if (entries.length === 0) return null
  return window.shell.journal.exportEntries(entries)
}

export function archiveJournalEntry(id: string): JournalEntry | null {
  return journalState.archiveEntry(id)
}

export function restoreJournalEntry(id: string): JournalEntry | null {
  return journalState.restoreEntry(id)
}

export function countJournalWords(text: string): number {
  return journalState.countWords(text)
}

async function runJournalCaptureLifecycleSmoke(params: JournalCaptureLifecycleParams) {
  const previousSnapshot = journalState.persistenceSnapshot()
  const candidates = await window.shell.journal.pickImportFiles(params.importFilePaths)
  const imported = journalState.importEntries(candidates.map(candidate => candidate.entry))
  const exportResult = await window.shell.journal.exportEntries(imported.slice(0, 2), {
    targetDir: params.exportDir
  })

  if (imported[0]) journalState.archiveEntry(imported[0].id)
  const afterArchive = journalState.getSnapshot()
  const hiddenAfterArchive = imported[0] ? !afterArchive.entries.some(entry => entry.id === imported[0].id) : false
  const archivedAfterArchive = imported[0] ? afterArchive.archivedEntries.some(entry => entry.id === imported[0].id) : false
  const restored = imported[0] ? journalState.restoreEntry(imported[0].id) : null
  const afterRestore = journalState.getSnapshot()
  const visibleAfterRestore = imported[0] ? afterRestore.entries.some(entry => entry.id === imported[0].id) : false
  const archivedAfterRestore = imported[0] ? afterRestore.archivedEntries.some(entry => entry.id === imported[0].id) : true

  if (imported[1]) {
    journalState.archiveEntry(imported[1].id)
  }

  return {
    previousSnapshot,
    importedCount: imported.length,
    importedTitles: imported.map(entry => entry.title),
    firstImported: imported[0] ?? null,
    defaultedImported: imported[2] ?? null,
    exportResult,
    hiddenAfterArchive,
    archivedAfterArchive,
    restored: Boolean(restored),
    visibleAfterRestore,
    archivedAfterRestore,
    screenshotArchivedId: imported[1]?.id ?? null
  }
}

if (typeof window !== 'undefined') {
  const captureWindow = window as typeof window & {
    __journalCaptureLifecycleSmoke?: (params: JournalCaptureLifecycleParams) => Promise<unknown>
    __journalCaptureRestoreSnapshot?: (snapshot: JournalPersistenceSnapshot) => void
  }
  captureWindow.__journalCaptureLifecycleSmoke = runJournalCaptureLifecycleSmoke
  captureWindow.__journalCaptureRestoreSnapshot = (snapshot) => {
    journalState.hydrate(snapshot)
  }
}

function persistenceKey(wsId: string): string {
  return `modules.journal.${wsId}.state`
}

connectSettingsBackedPersistence({
  label: 'shell.journal',
  workspaceId,
  slice: journalState,
  settingsKey: persistenceKey
})
