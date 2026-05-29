<!-- Journal InspectorView — entry metadata -->
<script lang="ts">
  const meta = {
    created: '2026-05-29 08:15',
    modified: '2026-05-29 15:22',
    wordCount: 47,
    mood: '☀️ Productive'
  }
</script>

<div class="inspector-view">
  <section class="section">
    <h3 class="section-title">Entry Details</h3>
    <div class="meta-grid">
      <span class="meta-label">Created</span><span class="meta-value">{meta.created}</span>
      <span class="meta-label">Modified</span><span class="meta-value">{meta.modified}</span>
      <span class="meta-label">Words</span><span class="meta-value">{meta.wordCount}</span>
      <span class="meta-label">Mood</span><span class="meta-value">{meta.mood}</span>
    </div>
  </section>
  <section class="section">
    <h3 class="section-title">Tags</h3>
    <div class="tags">
      <span class="tag">daily</span>
      <span class="tag">reflection</span>
      <span class="tag">project</span>
    </div>
  </section>
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
