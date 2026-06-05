<!-- Table View NavView — filter/sort controls -->
<script lang="ts">
  import { documents } from '../../store'
  import { filteredTableDocuments, tableFilterKind, tableSortBy } from './state'
</script>

<div class="nav-view">
  <header class="nav-header"><span class="nav-title">Filters</span></header>
  <div class="controls">
    <div class="field">
      <label class="field-label" for="table-filter-kind">Kind</label>
      <select id="table-filter-kind" class="field-select" bind:value={$tableFilterKind}>
        <option value="all">All Types</option>
        <option value="chapter">Chapters</option>
        <option value="scene">Scenes</option>
        <option value="plan">Plans</option>
        <option value="folder">Folders</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label" for="table-sort-by">Sort By</label>
      <select id="table-sort-by" class="field-select" bind:value={$tableSortBy}>
        <option value="title">Title</option>
        <option value="updatedAt">Last Modified</option>
        <option value="createdAt">Created</option>
        <option value="kind">Kind</option>
      </select>
    </div>
    <div class="stats">
      <span class="stat">{$filteredTableDocuments.length} of {$documents.length} documents</span>
    </div>
  </div>
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-header { display: flex; align-items: center; padding: var(--space-3); border-bottom: var(--border-zone); flex-shrink: 0; }
  .nav-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); }
  .controls { padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-3); }
  .field { display: flex; flex-direction: column; gap: var(--space-1); }
  .field-label { font-size: var(--font-size-xs); color: var(--color-fg-muted); }
  .field-select { padding: var(--space-2); background: var(--color-bg-overlay); border: var(--border-subtle); border-radius: var(--radius-sm); color: var(--color-fg-primary); font-size: var(--font-size-sm); outline: none; }
  .field-select option { background: var(--color-bg-surface); }
  .stats { font-size: var(--font-size-xs); color: var(--color-fg-muted); padding-top: var(--space-2); border-top: var(--border-subtle); }
</style>
