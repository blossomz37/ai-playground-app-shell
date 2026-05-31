<!-- Journal NavView — date-based entry list -->
<script lang="ts">
  import { journalEntries, selectJournalEntry, selectedJournalEntryId } from './state'
</script>

<div class="nav-view">
  <header class="nav-header">
    <span class="nav-title">Journal</span>
  </header>
  <div class="nav-list">
    {#each $journalEntries as entry (entry.id)}
      <button
        class="entry-item"
        class:active={$selectedJournalEntryId === entry.id}
        aria-pressed={$selectedJournalEntryId === entry.id}
        onclick={() => selectJournalEntry(entry.id)}
      >
        <span class="entry-date">{entry.date}</span>
        <span class="entry-title">{entry.title}</span>
        <span class="entry-preview">{entry.preview}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-header { display: flex; align-items: center; padding: var(--space-3); border-bottom: var(--border-subtle); flex-shrink: 0; }
  .nav-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); }
  .nav-list { flex: 1; overflow-y: auto; padding: var(--space-2); }
  .entry-item {
    display: flex; flex-direction: column; gap: 2px; width: 100%; padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md); text-align: left; color: var(--color-fg-secondary);
    transition: background 0.1s; cursor: pointer;
  }
  .entry-item:hover { background: var(--color-bg-overlay); }
  .entry-item.active { background: var(--color-accent-dim); color: var(--color-accent); }
  .entry-date { font-size: var(--font-size-xs); color: var(--color-fg-muted); font-weight: 500; }
  .entry-title { font-size: var(--font-size-sm); font-weight: 500; }
  .entry-preview { font-size: var(--font-size-xs); color: var(--color-fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
