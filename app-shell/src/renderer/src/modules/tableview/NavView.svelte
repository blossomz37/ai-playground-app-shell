<!-- Table View NavView — filter/sort controls -->
<script lang="ts">
  let sortBy = $state('title')
  let filterKind = $state('all')
</script>

<div class="nav-view">
  <header class="nav-header"><span class="nav-title">Filters</span></header>
  <div class="controls">
    <div class="field">
      <label class="field-label">Kind</label>
      <select class="field-select" bind:value={filterKind}>
        <option value="all">All Types</option>
        <option value="chapter">Chapters</option>
        <option value="scene">Scenes</option>
        <option value="plan">Plans</option>
        <option value="folder">Folders</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label">Sort By</label>
      <select class="field-select" bind:value={sortBy}>
        <option value="title">Title</option>
        <option value="updatedAt">Last Modified</option>
        <option value="createdAt">Created</option>
        <option value="kind">Kind</option>
      </select>
    </div>
    <div class="stats">
      <span class="stat">12 documents</span>
    </div>
  </div>
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-header { display: flex; align-items: center; padding: var(--space-3); border-bottom: var(--border-subtle); flex-shrink: 0; }
  .nav-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); }
  .controls { padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-3); }
  .field { display: flex; flex-direction: column; gap: var(--space-1); }
  .field-label { font-size: var(--font-size-xs); color: var(--color-fg-muted); }
  .field-select { padding: var(--space-2); background: var(--color-bg-overlay); border: var(--border-subtle); border-radius: var(--radius-sm); color: var(--color-fg-primary); font-size: var(--font-size-sm); outline: none; }
  .field-select option { background: var(--color-bg-surface); }
  .stats { font-size: var(--font-size-xs); color: var(--color-fg-muted); padding-top: var(--space-2); border-top: var(--border-subtle); }
</style>
