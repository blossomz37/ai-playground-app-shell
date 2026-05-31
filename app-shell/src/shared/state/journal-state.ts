import { ObservableSlice } from './observable'

export interface JournalEntry {
  id: string
  date: string
  fullDate: string
  title: string
  preview: string
  content: string
  created: string
  modified: string
  mood: string
  tags: string[]
}

export interface JournalState {
  entries: JournalEntry[]
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
    tags: ['daily', 'reflection', 'project']
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
    tags: ['project', 'shell']
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
    tags: ['reading', 'craft']
  }
]

export class JournalStateSlice extends ObservableSlice<JournalState> {
  private entries = initialEntries
  private selectedEntryId = '1'

  getSnapshot(): JournalState {
    return {
      entries: this.entries,
      selectedEntryId: this.selectedEntryId,
      selectedEntry: this.selectedEntry()
    }
  }

  selectEntry(id: string): void {
    if (!this.entries.some(entry => entry.id === id)) return
    this.selectedEntryId = id
    this.emit()
  }

  updateSelectedContent(content: string): void {
    const id = this.selectedEntryId
    this.entries = this.entries.map(entry =>
      entry.id === id
        ? {
            ...entry,
            content,
            preview: content.replace(/[#*_`\-[\]\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 32) || entry.preview,
            modified: new Date().toLocaleString(undefined, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          }
        : entry
    )
    this.emit()
  }

  hydrate(snapshot: JournalPersistenceSnapshot | undefined): void {
    if (!snapshot) {
      this.emit()
      return
    }

    this.entries = snapshot.entries.length > 0 ? snapshot.entries : initialEntries
    this.selectedEntryId = this.entries.some(entry => entry.id === snapshot.selectedEntryId)
      ? snapshot.selectedEntryId
      : this.entries[0]?.id ?? ''
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
    return this.entries.find(entry => entry.id === this.selectedEntryId) ?? this.entries[0] ?? null
  }
}
