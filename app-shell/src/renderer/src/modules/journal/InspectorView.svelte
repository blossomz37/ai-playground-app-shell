<!-- Journal InspectorView — entry metadata -->
<script lang="ts">
  import { countJournalWords, selectedJournalEntry } from './state'

  let entry = $derived($selectedJournalEntry)
</script>

<div class="inspector-view">
  {#if entry}
    <section class="section">
      <h3 class="section-title">Entry Details</h3>
      <div class="meta-grid">
        <span class="meta-label">Title</span><span class="meta-value">{entry.title}</span>
        <span class="meta-label">Created</span><span class="meta-value">{entry.created}</span>
        <span class="meta-label">Modified</span><span class="meta-value">{entry.modified}</span>
        <span class="meta-label">Words</span><span class="meta-value">{countJournalWords(entry.content)}</span>
        <span class="meta-label">Mood</span><span class="meta-value">{entry.mood}</span>
      </div>
    </section>
    <section class="section">
      <h3 class="section-title">Tags</h3>
      <div class="tags">
        {#each entry.tags as tag (tag)}
          <span class="tag">{tag}</span>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .inspector-view { padding: var(--space-4); }
  .section { margin-bottom: var(--space-5); }
  .section-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); margin-bottom: var(--space-3); }
  .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--space-1) var(--space-3); font-size: var(--font-size-sm); }
  .meta-label { color: var(--color-fg-muted); }
  .meta-value { color: var(--color-fg-secondary); }
  .tags { display: flex; flex-wrap: wrap; gap: var(--space-1); }
  .tag { font-size: var(--font-size-xs); color: var(--color-accent); background: var(--color-accent-dim); padding: 2px 8px; border-radius: var(--radius-sm); }
</style>
