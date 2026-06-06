<!-- Table View MainView — data table of documents -->
<script lang="ts">
  import { XIcon } from 'phosphor-svelte'

  import {
    filteredTableDocuments,
    resetTableFilters,
    selectTableDoc,
    selectedTableDocId,
    tableFilterKind,
    tableHasActiveFilters,
    tableSearchQuery,
    tableSortBy
  } from './state'
  import {
    activeModuleId,
    selectDoc
  } from '../../store'

  const columns = ['Title', 'Kind', 'Updated', 'Words']
  const kindOptions = [
    { value: 'all', label: 'All' },
    { value: 'chapter', label: 'Chapters' },
    { value: 'scene', label: 'Scenes' },
    { value: 'plan', label: 'Plans' },
    { value: 'folder', label: 'Folders' }
  ]

  async function openDocument(event: MouseEvent, id: string): Promise<void> {
    event.stopPropagation()
    selectTableDoc(id)
    activeModuleId.set('shell.documents')
    await window.shell.modules.activate('shell.documents')
    await selectDoc(id)
  }
</script>

<div class="main-view">
  <header class="table-toolbar" aria-label="Table filters">
    <div class="search-field">
      <label class="sr-only" for="table-search">Search documents</label>
      <input
        id="table-search"
        class="search-input"
        type="search"
        placeholder="Search"
        bind:value={$tableSearchQuery}
        data-capture-table-search
      />
    </div>
    <label class="toolbar-field" for="table-kind-filter">
      <span class="sr-only">Kind</span>
      <select id="table-kind-filter" bind:value={$tableFilterKind} data-capture-table-kind>
        {#each kindOptions as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </label>
    <label class="toolbar-field" for="table-sort">
      <span class="sr-only">Sort</span>
      <select id="table-sort" bind:value={$tableSortBy}>
        <option value="title">Title</option>
        <option value="updatedAt">Modified</option>
        <option value="createdAt">Created</option>
        <option value="kind">Kind</option>
      </select>
    </label>
    <button
      class="reset-btn"
      type="button"
      disabled={!$tableHasActiveFilters}
      aria-label="Reset table filters"
      title="Reset filters"
      onclick={resetTableFilters}
    >
      <XIcon size={14} weight="bold" aria-hidden="true" />
    </button>
  </header>
  <div class="table-wrapper">
    <table class="data-table">
      <thead>
        <tr>
          {#each columns as col (col)}
            <th>{col}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each $filteredTableDocuments as doc (doc.id)}
            <tr
              class:active={$selectedTableDocId === doc.id}
              onclick={() => selectTableDoc(doc.id)}
            >
              <td class="cell-title">
                <button
                  class="doc-link"
                  type="button"
                  aria-label={`Open ${doc.title} in Documents`}
                  onclick={(event) => openDocument(event, doc.id)}
                  onkeydown={(event) => event.stopPropagation()}
                  onfocus={() => selectTableDoc(doc.id)}
                >
                  {doc.title}
                </button>
              </td>
              <td><span class="kind-badge">{doc.kind}</span></td>
              <td class="cell-date">{new Date(doc.updatedAt).toLocaleDateString()}</td>
              <td class="cell-num">{doc.content.trim().split(/\s+/).filter(Boolean).length}</td>
            </tr>
        {:else}
          <tr>
            <td colspan="4" class="empty-cell">
              {$tableHasActiveFilters ? 'No documents match the current filters.' : 'No documents'}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .main-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .table-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 46px;
    padding: var(--space-2);
    border-bottom: var(--border-subtle);
    background: var(--color-bg-surface);
  }
  .search-field { flex: 1 1 130px; min-width: 0; }
  .search-input,
  .toolbar-field select {
    width: 100%;
    height: 30px;
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
    font: inherit;
    font-size: var(--font-size-sm);
    outline: none;
  }
  .search-input { padding: 0 var(--space-3); }
  .toolbar-field {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
  }
  .toolbar-field select {
    width: 94px;
    padding: 0 var(--space-2);
    font-weight: 500;
  }
  .search-input:focus-visible,
  .toolbar-field select:focus-visible,
  .reset-btn:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 1px;
  }
  .reset-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 30px;
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    background: var(--color-bg-overlay);
  }
  .reset-btn:hover:not(:disabled) { background: var(--color-bg-active); color: var(--color-fg-primary); }
  .reset-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .table-wrapper { flex: 1; overflow: auto; padding: var(--space-4); }
  .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
  .data-table th {
    text-align: left; padding: var(--space-2) var(--space-3); font-size: var(--font-size-xs); font-weight: 600;
    letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-fg-muted); border-bottom: var(--border-subtle);
    position: sticky; top: 0; background: var(--color-bg-base);
  }
  .data-table td { padding: var(--space-2) var(--space-3); color: var(--color-fg-secondary); border-bottom: 1px solid rgba(69, 71, 90, 0.3); }
  .data-table tr:hover td { background: var(--color-bg-overlay); }
  .data-table tr { cursor: pointer; }
  .data-table tr.active td { background: var(--color-accent-dim); }
  .cell-title { font-weight: 500; color: var(--color-fg-primary); }
  .doc-link {
    display: inline-flex;
    max-width: 100%;
    color: var(--color-fg-primary);
    font: inherit;
    font-weight: inherit;
    text-align: left;
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, var(--accent-nav) 45%, transparent);
    text-underline-offset: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .doc-link:hover,
  .doc-link:focus-visible {
    color: var(--accent-nav);
    text-decoration-color: currentColor;
  }
  .doc-link:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
  .cell-date { color: var(--color-fg-muted); font-variant-numeric: tabular-nums; }
  .cell-num { text-align: right; font-variant-numeric: tabular-nums; color: var(--color-fg-muted); }
  .kind-badge { font-size: var(--font-size-xs); color: var(--color-accent); background: var(--color-accent-dim); padding: 1px 6px; border-radius: var(--radius-sm); }
  .empty-cell { text-align: center; color: var(--color-fg-muted); padding: var(--space-6) !important; }
</style>
