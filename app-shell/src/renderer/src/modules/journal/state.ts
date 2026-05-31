import { derived, get, writable } from 'svelte/store'

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

export const journalEntries = writable<JournalEntry[]>([
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
])

export const selectedJournalEntryId = writable('1')

export const selectedJournalEntry = derived(
  [journalEntries, selectedJournalEntryId],
  ([$entries, $id]) => $entries.find(entry => entry.id === $id) ?? $entries[0] ?? null
)

export function selectJournalEntry(id: string): void {
  selectedJournalEntryId.set(id)
}

export function updateSelectedJournalContent(content: string): void {
  const id = get(selectedJournalEntryId)
  journalEntries.update(entries => entries.map(entry =>
    entry.id === id
      ? {
          ...entry,
          content,
          preview: content.replace(/[#*_`\-\[\]\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 32) || entry.preview,
          modified: new Date().toLocaleString(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      : entry
  ))
}

export function countJournalWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
