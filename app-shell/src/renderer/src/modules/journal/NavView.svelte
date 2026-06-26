<!-- Journal NavView — date-based entry list -->
<script lang="ts">
  import InlineRename from '../../shell/InlineRename.svelte'
  import { addToast } from '../../store/toasts'
  import {
    archivedJournalEntries,
    archiveJournalEntry,
    createJournalEntry,
    exportJournalEntry,
    importJournalEntries,
    journalEntries,
    renameJournalEntry,
    restoreJournalEntry,
    selectJournalEntry,
    selectedJournalEntryId
  } from './state'
  import type { JournalEntry } from './state'

  let renamingEntryId = $state<string | null>(null)
  let archivedOpen = $state(true)
  let filterQuery = $state('')
  let normalizedFilter = $derived(filterQuery.trim().toLowerCase())
  let visibleEntries = $derived(
    normalizedFilter ? $journalEntries.filter(entry => entryMatches(entry, normalizedFilter)) : $journalEntries
  )
  let visibleArchivedEntries = $derived(
    normalizedFilter ? $archivedJournalEntries.filter(entry => entryMatches(entry, normalizedFilter)) : $archivedJournalEntries
  )

  function entryMatches(entry: JournalEntry, query: string): boolean {
    return [
      entry.date,
      entry.title,
      entry.preview,
      entry.content,
      ...entry.tags
    ].some(value => value.toLowerCase().includes(query))
  }

  function startRename(event: MouseEvent, id: string): void {
    event.stopPropagation()
    selectJournalEntry(id)
    renamingEntryId = id
  }

  function cancelRename(): void {
    renamingEntryId = null
  }

  function commitRename(id: string, title: string): void {
    if (!title) {
      addToast('warn', 'Journal title cannot be blank.')
      cancelRename()
      return
    }
    renameJournalEntry(id, title)
    selectJournalEntry(id)
    cancelRename()
  }

  function createEntry(): void {
    const entry = createJournalEntry()
    addToast('info', `Created ${entry.title}.`)
  }

  async function importEntries(): Promise<void> {
    try {
      const entries = await importJournalEntries()
      if (entries.length > 0) {
        addToast('info', `Imported ${entries.length} journal entr${entries.length === 1 ? 'y' : 'ies'}.`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Journal import failed.'
      if (!message.toLowerCase().includes('cancelled')) addToast('warn', message)
    }
  }

  async function exportEntry(event: MouseEvent, id: string): Promise<void> {
    event.stopPropagation()
    try {
      const result = await exportJournalEntry(id)
      if (result) {
        addToast('info', `Exported ${result.filesWritten.length} journal entr${result.filesWritten.length === 1 ? 'y' : 'ies'}.`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Journal export failed.'
      if (!message.toLowerCase().includes('cancelled')) addToast('warn', message)
    }
  }

  function archiveEntry(event: MouseEvent, id: string): void {
    event.stopPropagation()
    const archived = archiveJournalEntry(id)
    if (archived) addToast('info', `Archived ${archived.title}.`)
  }

  function restoreEntry(id: string): void {
    const restored = restoreJournalEntry(id)
    if (restored) addToast('info', `Restored ${restored.title}.`)
  }
</script>

<div class="nav-view">
  <header class="zone-header nav-header">
    <span class="zone-title nav-title">Journal</span>
    <div class="nav-actions">
      <button type="button" class="nav-icon-btn" title="New entry" aria-label="New journal entry" onclick={createEntry}>＋</button>
      <button type="button" class="nav-icon-btn" title="Import" aria-label="Import journal entries" onclick={() => void importEntries()}>⇧</button>
    </div>
  </header>
  <div class="nav-filter">
    <input
      bind:value={filterQuery}
      data-capture-nav-search
      type="search"
      class="filter-input"
      placeholder="Filter journal"
      aria-label="Filter journal entries"
      autocomplete="off"
    />
  </div>
  <div class="nav-list">
    {#each visibleEntries as entry (entry.id)}
      <div
        class="entry-item"
        class:active={$selectedJournalEntryId === entry.id}
      >
        {#if renamingEntryId === entry.id}
          <InlineRename
            value={entry.title}
            ariaLabel="Rename journal entry"
            onCommit={(title) => commitRename(entry.id, title)}
            onCancel={cancelRename}
          />
        {:else}
          <button
            type="button"
            class="entry-open"
            aria-pressed={$selectedJournalEntryId === entry.id}
            onclick={() => selectJournalEntry(entry.id)}
          >
            <span class="entry-date">{entry.date}</span>
            <span class="entry-title">{entry.title}</span>
            <span class="entry-preview">{entry.preview}</span>
          </button>
          <button
            type="button"
            class="row-action"
            title="Rename"
            aria-label={`Rename ${entry.title}`}
            onclick={(event) => startRename(event, entry.id)}
          >
            ✎
          </button>
          <button
            type="button"
            class="row-action"
            title="Export"
            aria-label={`Export ${entry.title}`}
            onclick={(event) => void exportEntry(event, entry.id)}
          >
            ⇩
          </button>
          <button
            type="button"
            class="row-action"
            title="Archive"
            aria-label={`Archive ${entry.title}`}
            onclick={(event) => archiveEntry(event, entry.id)}
          >
            ⧉
          </button>
        {/if}
      </div>
    {:else}
      <div class="list-empty">No journal entries match.</div>
    {/each}
  </div>
  {#if $archivedJournalEntries.length > 0}
    <section class="archived-section" aria-label="Archived journal entries">
      <button
        type="button"
        class="archived-header"
        onclick={() => archivedOpen = !archivedOpen}
        aria-expanded={archivedOpen}
      >
        <span>Archived</span>
        <span class="archived-count">{visibleArchivedEntries.length}</span>
      </button>
      {#if archivedOpen}
        <div class="archived-list">
          {#each visibleArchivedEntries as entry (entry.id)}
            <div class="archived-item">
              <span class="archived-copy">
                <span class="entry-date">{entry.date}</span>
                <span class="entry-title">{entry.title}</span>
              </span>
              <button
                type="button"
                class="row-action restore-action"
                title="Restore"
                aria-label={`Restore ${entry.title}`}
                onclick={() => restoreEntry(entry.id)}
              >
                ↩
              </button>
            </div>
          {:else}
            <div class="list-empty compact">No archived entries match.</div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-header { justify-content: space-between; }
  .nav-actions { display: flex; gap: 2px; }
  .nav-icon-btn {
    width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center;
    border: none; border-radius: var(--radius-sm); background: transparent; color: var(--color-fg-muted);
    cursor: pointer; font-size: 14px; line-height: 1;
  }
  .nav-icon-btn:hover, .nav-icon-btn:focus-visible { color: var(--color-fg-primary); background: var(--color-hover); }
  .nav-filter { flex: 0 0 auto; padding: var(--space-2) var(--space-2) 0; }
  .filter-input { width: 100%; height: 28px; padding: 0 var(--space-2); border: var(--border-subtle); border-radius: var(--radius-sm); background: var(--color-bg-base); color: var(--color-fg-primary); font-size: var(--font-size-xs); }
  .filter-input::placeholder { color: var(--color-fg-muted); }
  .filter-input:focus { outline: 2px solid var(--color-focus-ring); outline-offset: 1px; }
  .nav-list { flex: 1; overflow-y: auto; padding: var(--space-2); }
  .list-empty { padding: var(--space-3) var(--space-2); color: var(--color-fg-muted); font-size: var(--font-size-sm); }
  .list-empty.compact { padding: var(--space-2); font-size: var(--font-size-xs); }
  .entry-item {
    display: grid; grid-template-columns: minmax(0, 1fr) repeat(3, 24px); align-items: center; gap: var(--space-1); width: 100%; padding: var(--space-1);
    border-radius: var(--radius-md); text-align: left; color: var(--color-fg-secondary);
    transition: background 0.1s;
  }
  .entry-item:hover { background: var(--color-bg-overlay); }
  .entry-item.active { background: var(--color-accent-dim); color: var(--color-accent); }
  .entry-open { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: var(--space-1) var(--space-2); text-align: left; color: inherit; cursor: pointer; }
  .row-action { width: 22px; height: 22px; border-radius: var(--radius-sm); color: var(--color-fg-muted); opacity: 0; }
  .entry-item:hover .row-action, .entry-item.active .row-action, .archived-item:hover .row-action, .row-action:focus-visible { opacity: 1; }
  .row-action:hover { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .entry-date { font-size: var(--font-size-xs); color: var(--color-fg-muted); font-weight: 500; }
  .entry-title { font-size: var(--font-size-sm); font-weight: 500; }
  .entry-preview { font-size: var(--font-size-xs); color: var(--color-fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .archived-section { flex: 0 0 auto; border-top: 1px solid color-mix(in srgb, var(--accent-nav) 18%, var(--color-border)); padding: var(--space-2); }
  .archived-header {
    width: 100%; min-height: 28px; display: flex; align-items: center; justify-content: space-between;
    border: none; border-radius: var(--radius-sm); background: transparent;
    color: color-mix(in srgb, var(--accent-nav) 58%, var(--color-fg-muted));
    cursor: pointer; font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0;
  }
  .archived-header:hover, .archived-header:focus-visible { background: var(--color-hover); color: var(--color-fg-primary); }
  .archived-count { color: var(--color-fg-muted); font-weight: 600; }
  .archived-list { max-height: 172px; overflow-y: auto; padding-top: var(--space-1); }
  .archived-item {
    display: grid; grid-template-columns: minmax(0, 1fr) 24px; align-items: center; gap: var(--space-1);
    min-height: 34px; padding: var(--space-1); border-radius: var(--radius-md); color: var(--color-fg-muted);
  }
  .archived-item:hover { background: var(--color-bg-overlay); }
  .archived-copy { min-width: 0; display: flex; flex-direction: column; gap: 1px; padding: 0 var(--space-2); }
  .restore-action { opacity: 1; }
  .nav-icon-btn:focus-visible, .archived-header:focus-visible, .row-action:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 1px; }
</style>
