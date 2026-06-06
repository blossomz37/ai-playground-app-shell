<!-- Journal InspectorView — entry metadata -->
<script lang="ts">
  import { countJournalWords, selectedJournalEntry, updateJournalEntryMetadata } from './state'

  let entry = $derived($selectedJournalEntry)

  function tagsFromInput(value: string): string[] {
    return value.split(',').map(tag => tag.trim()).filter(Boolean)
  }

  function saveTitle(value: string): void {
    if (!entry) return
    const title = value.trim()
    if (!title || title === entry.title) return
    updateJournalEntryMetadata(entry.id, { title })
  }

  function saveMood(value: string): void {
    if (!entry) return
    const mood = value.trim()
    if (mood === entry.mood) return
    updateJournalEntryMetadata(entry.id, { mood })
  }

  function saveTags(value: string): void {
    if (!entry) return
    const tags = tagsFromInput(value)
    if (tags.join('|') === entry.tags.join('|')) return
    updateJournalEntryMetadata(entry.id, { tags })
  }
</script>

<div class="inspector-view">
  {#if entry}
    <section class="section">
      <h3 class="section-title">Entry Details</h3>
      <div class="meta-grid">
        <label class="meta-label" for="journal-title">Title</label>
        <input
          id="journal-title"
          class="field"
          aria-label="Journal title"
          value={entry.title}
          onblur={(event) => saveTitle(event.currentTarget.value)}
        />
        <span class="meta-label">Created</span><span class="meta-value">{entry.created}</span>
        <span class="meta-label">Modified</span><span class="meta-value">{entry.modified}</span>
        <span class="meta-label">Words</span><span class="meta-value">{countJournalWords(entry.content)}</span>
        <label class="meta-label" for="journal-mood">Mood</label>
        <input
          id="journal-mood"
          class="field"
          aria-label="Journal mood"
          value={entry.mood}
          onblur={(event) => saveMood(event.currentTarget.value)}
          placeholder="Focused"
        />
      </div>
    </section>
    <section class="section">
      <h3 class="section-title">Tags</h3>
      <input
        class="field"
        aria-label="Journal tags"
        value={entry.tags.join(', ')}
        onblur={(event) => saveTags(event.currentTarget.value)}
        placeholder="project, shell"
      />
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
  .field {
    min-width: 0;
    width: 100%;
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
    font: inherit;
    font-size: var(--font-size-sm);
    padding: var(--space-1) var(--space-2);
  }
  .field:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 1px; }
</style>
