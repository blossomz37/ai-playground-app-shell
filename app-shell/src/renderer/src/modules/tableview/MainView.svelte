<!-- Table View MainView — data table of documents -->
<script lang="ts">
  import {
    filteredTableDocuments,
    selectTableDoc,
    selectedTableDocId
  } from './state'

  const columns = ['Title', 'Kind', 'Updated', 'Words']

  function selectOnKeydown(event: KeyboardEvent, id: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectTableDoc(id)
    }
  }
</script>

<div class="main-view">
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
            role="button"
            tabindex="0"
            aria-pressed={$selectedTableDocId === doc.id}
            onclick={() => selectTableDoc(doc.id)}
            onkeydown={(event) => selectOnKeydown(event, doc.id)}
          >
            <td class="cell-title">{doc.title}</td>
            <td><span class="kind-badge">{doc.kind}</span></td>
            <td class="cell-date">{new Date(doc.updatedAt).toLocaleDateString()}</td>
            <td class="cell-num">{doc.content.trim().split(/\s+/).filter(Boolean).length}</td>
          </tr>
        {:else}
          <tr><td colspan="4" class="empty-cell">No documents</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .main-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
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
  .data-table tr:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
  .cell-title { font-weight: 500; color: var(--color-fg-primary); }
  .cell-date { color: var(--color-fg-muted); font-variant-numeric: tabular-nums; }
  .cell-num { text-align: right; font-variant-numeric: tabular-nums; color: var(--color-fg-muted); }
  .kind-badge { font-size: var(--font-size-xs); color: var(--color-accent); background: var(--color-accent-dim); padding: 1px 6px; border-radius: var(--radius-sm); }
  .empty-cell { text-align: center; color: var(--color-fg-muted); padding: var(--space-6) !important; }
</style>
