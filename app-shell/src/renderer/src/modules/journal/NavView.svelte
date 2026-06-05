<!-- Journal NavView — date-based entry list -->
<script lang="ts">
  import InlineRename from '../../shell/InlineRename.svelte'
  import { addToast } from '../../store/toasts'
  import { journalEntries, renameJournalEntry, selectJournalEntry, selectedJournalEntryId } from './state'

  let renamingEntryId = $state<string | null>(null)

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
</script>

<div class="nav-view">
  <header class="zone-header nav-header"><span class="zone-title nav-title">Journal</span></header>
  <div class="nav-list">
    {#each $journalEntries as entry (entry.id)}
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
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-header { justify-content: space-between; }
  .nav-list { flex: 1; overflow-y: auto; padding: var(--space-2); }
  .entry-item {
    display: grid; grid-template-columns: minmax(0, 1fr) 24px; align-items: center; gap: var(--space-1); width: 100%; padding: var(--space-1);
    border-radius: var(--radius-md); text-align: left; color: var(--color-fg-secondary);
    transition: background 0.1s;
  }
  .entry-item:hover { background: var(--color-bg-overlay); }
  .entry-item.active { background: var(--color-accent-dim); color: var(--color-accent); }
  .entry-open { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: var(--space-1) var(--space-2); text-align: left; color: inherit; cursor: pointer; }
  .row-action { width: 22px; height: 22px; border-radius: var(--radius-sm); color: var(--color-fg-muted); opacity: 0; }
  .entry-item:hover .row-action, .entry-item.active .row-action, .row-action:focus-visible { opacity: 1; }
  .row-action:hover { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .entry-date { font-size: var(--font-size-xs); color: var(--color-fg-muted); font-weight: 500; }
  .entry-title { font-size: var(--font-size-sm); font-weight: 500; }
  .entry-preview { font-size: var(--font-size-xs); color: var(--color-fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
