<!-- Journal MainView — today's entry editor -->
<script lang="ts">
  import { selectedJournalEntry, updateSelectedJournalContent } from './state'

  let entry = $derived($selectedJournalEntry)
</script>

<div class="main-view">
  {#if entry}
    <header class="entry-header">
      <h1 class="entry-date">{entry.fullDate}</h1>
      <span class="entry-badge">{entry.date}</span>
    </header>
    <div class="entry-content">
      <textarea
        class="entry-editor"
        value={entry.content}
        spellcheck="true"
        placeholder="Write your thoughts..."
        oninput={(event) => updateSelectedJournalContent(event.currentTarget.value)}
      ></textarea>
    </div>
  {/if}
</div>

<style>
  .main-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .entry-header {
    display: flex; align-items: baseline; gap: var(--space-3);
    padding: var(--space-5) var(--space-6) var(--space-3); border-bottom: var(--border-zone); flex-shrink: 0;
  }
  .entry-date { font-size: var(--font-size-xl); font-weight: 600; color: var(--color-fg-primary); }
  .entry-badge {
    font-size: var(--font-size-xs); color: var(--color-accent); background: var(--color-accent-dim);
    padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 500;
  }
  .entry-content { flex: 1; overflow: hidden; display: flex; }
  .entry-editor {
    flex: 1; padding: var(--space-5) var(--space-6); background: transparent; border: none;
    color: var(--color-fg-primary); font-family: var(--font-serif); font-size: var(--font-size-lg);
    line-height: var(--line-height); resize: none; outline: none; max-width: 72ch;
  }
</style>
