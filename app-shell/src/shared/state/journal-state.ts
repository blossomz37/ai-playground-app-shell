import { ObservableSlice } from './observable'
import type { JournalEntry } from '../module-contract'
import { previewFromContent } from '../journal-markdown'

export interface JournalState {
  entries: JournalEntry[]
  archivedEntries: JournalEntry[]
  selectedEntryId: string
  selectedEntry: JournalEntry | null
}

export interface JournalPersistenceSnapshot {
  entries: JournalEntry[]
  selectedEntryId: string
}

const initialEntries: JournalEntry[] = [
  {
    id: '1',
    date: 'Today',
    fullDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    title: 'Morning thoughts',
    preview: 'Started the day with...',
    content: '## Morning Thoughts\n\nStarted the day reflecting on progress with the app shell project. The module system is coming together nicely.\n\n## Tasks\n\n- [x] Review module contract\n- [ ] Design journal schema\n- [ ] Build entry templates',
    created: '2026-05-29 08:15',
    modified: '2026-05-29 15:22',
    mood: 'Productive',
    tags: ['daily', 'reflection', 'project'],
    archivedAt: null
  },
  {
    id: '2',
    date: 'Yesterday',
    fullDate: 'Friday, May 29, 2026',
    title: 'Project notes',
    preview: 'Worked on the shell...',
    content: '## Project Notes\n\nWorked on the shell chrome and module routing. The important pattern is keeping shell primitives separate from module-specific behavior.\n\n## Follow-up\n\n- Keep modules inside the contract\n- Capture screenshots for visible changes',
    created: '2026-05-29 11:10',
    modified: '2026-05-29 17:48',
    mood: 'Focused',
    tags: ['project', 'shell'],
    archivedAt: null
  },
  {
    id: '3',
    date: 'May 27',
    fullDate: 'Wednesday, May 27, 2026',
    title: 'Reading log',
    preview: 'Finished chapter 12...',
    content: '## Reading Log\n\nFinished chapter 12 and noted the way the scene turns on withheld context instead of exposition.\n\n## Craft note\n\nSubtext lands better when the visible action stays simple.',
    created: '2026-05-27 21:04',
    modified: '2026-05-27 21:20',
    mood: 'Curious',
    tags: ['reading', 'craft'],
    archivedAt: null
  }
]

export class JournalStateSlice extends ObservableSlice<JournalState> {
  private entries = initialEntries
  private selectedEntryId = '1'

  getSnapshot(): JournalState {
    const activeEntries = this.activeEntries()
    return {
      entries: activeEntries,
      archivedEntries: this.archivedEntries(),
      selectedEntryId: this.selectedEntryId,
      selectedEntry: this.selectedEntry()
    }
  }

  selectEntry(id: string): void {
    if (!this.activeEntries().some(entry => entry.id === id)) return
    this.selectedEntryId = id
    this.emit()
  }

  createEntry(params: Partial<Pick<JournalEntry, 'title' | 'content' | 'mood' | 'tags'>> = {}): JournalEntry {
    const now = this.formatModifiedDate()
    const created = new Date()
    const entry: JournalEntry = {
      id: `journal-${Date.now()}`,
      date: 'Today',
      fullDate: created.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      title: params.title?.trim() || this.uniqueTitle('New Journal Entry'),
      preview: previewFromContent(params.content ?? ''),
      content: params.content ?? '',
      created: now,
      modified: now,
      mood: params.mood ?? '',
      tags: params.tags ?? [],
      archivedAt: null
    }
    this.entries = [entry, ...this.entries]
    this.selectedEntryId = entry.id
    this.emit()
    return entry
  }

  renameEntry(id: string, title: string): JournalEntry | null {
    const nextTitle = title.trim()
    if (!nextTitle) return null

    let renamed: JournalEntry | null = null
    const modified = this.formatModifiedDate()
    this.entries = this.entries.map(entry => {
      if (entry.id !== id) return entry
      renamed = {
        ...entry,
        title: nextTitle,
        modified
      }
      return renamed
    })

    if (renamed) this.emit()
    return renamed
  }

  updateSelectedContent(content: string): void {
    const id = this.selectedEntryId
    this.entries = this.entries.map(entry =>
      entry.id === id
        ? {
            ...entry,
            content,
            preview: previewFromContent(content),
            modified: this.formatModifiedDate()
          }
        : entry
    )
    this.emit()
  }

  importEntries(entries: JournalEntry[]): JournalEntry[] {
    if (entries.length === 0) return []

    const existingIds = new Set(this.entries.map(entry => entry.id))
    const imported = entries.map(entry => {
      let id = entry.id
      while (existingIds.has(id)) {
        id = `${entry.id}-${Date.now()}`
      }
      existingIds.add(id)
      return this.normalizeEntry({ ...entry, id, archivedAt: null })
    })

    this.entries = [...imported, ...this.entries]
    this.selectedEntryId = imported[0]?.id ?? this.selectedEntryId
    this.emit()
    return imported
  }

  archiveEntry(id: string): JournalEntry | null {
    const current = this.entries.find(entry => entry.id === id && !entry.archivedAt)
    if (!current) return null

    const archivedAt = new Date().toISOString()
    let archived: JournalEntry | null = null
    this.entries = this.entries.map(entry => {
      if (entry.id !== id) return entry
      archived = { ...entry, archivedAt, modified: this.formatModifiedDate() }
      return archived
    })

    if (this.selectedEntryId === id) {
      this.selectedEntryId = this.activeEntries().find(entry => entry.id !== id)?.id ?? ''
    }
    this.emit()
    return archived
  }

  restoreEntry(id: string): JournalEntry | null {
    let restored: JournalEntry | null = null
    this.entries = this.entries.map(entry => {
      if (entry.id !== id) return entry
      restored = { ...entry, archivedAt: null, modified: this.formatModifiedDate() }
      return restored
    })

    if (restored) {
      this.selectedEntryId = id
      this.emit()
    }
    return restored
  }

  entriesForExport(ids: string[]): JournalEntry[] {
    const idSet = new Set(ids)
    return this.entries.filter(entry => idSet.has(entry.id))
  }

  hydrate(snapshot: JournalPersistenceSnapshot | undefined): void {
    if (!snapshot) {
      this.emit()
      return
    }

    this.entries = snapshot.entries.length > 0 ? snapshot.entries.map(entry => this.normalizeEntry(entry)) : initialEntries
    const activeEntries = this.activeEntries()
    this.selectedEntryId = activeEntries.some(entry => entry.id === snapshot.selectedEntryId)
      ? snapshot.selectedEntryId
      : activeEntries[0]?.id ?? ''
    this.emit()
  }

  persistenceSnapshot(): JournalPersistenceSnapshot {
    return {
      entries: this.entries,
      selectedEntryId: this.selectedEntryId
    }
  }

  countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length
  }

  private selectedEntry(): JournalEntry | null {
    return this.activeEntries().find(entry => entry.id === this.selectedEntryId) ?? this.activeEntries()[0] ?? null
  }

  private activeEntries(): JournalEntry[] {
    return this.entries.filter(entry => !entry.archivedAt)
  }

  private archivedEntries(): JournalEntry[] {
    return this.entries.filter(entry => entry.archivedAt)
  }

  private normalizeEntry(entry: JournalEntry): JournalEntry {
    return {
      ...entry,
      preview: entry.preview || previewFromContent(entry.content),
      mood: entry.mood ?? '',
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      archivedAt: entry.archivedAt ?? null
    }
  }

  private uniqueTitle(baseTitle: string): string {
    const titles = new Set(this.entries.map(entry => entry.title.trim().toLowerCase()))
    if (!titles.has(baseTitle.toLowerCase())) return baseTitle

    let suffix = 2
    while (titles.has(`${baseTitle} ${suffix}`.toLowerCase())) {
      suffix += 1
    }
    return `${baseTitle} ${suffix}`
  }

  private formatModifiedDate(): string {
    return new Date().toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}
