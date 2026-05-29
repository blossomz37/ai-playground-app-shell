<!-- Table View MainView — data table of documents -->
<script lang="ts">
  import { documents } from '../../store'

  const columns = ['Title', 'Kind', 'Updated', 'Words']
</script>

<div class="main-view">
  <div class="table-wrapper">
    <table class="data-table">
      <thead>
        <tr>
          {#each columns as col}
            <th>{col}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each $documents as doc (doc.id)}
          <tr>
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
  .cell-title { font-weight: 500; color: var(--color-fg-primary); }
  .cell-date { color: var(--color-fg-muted); font-variant-numeric: tabular-nums; }
  .cell-num { text-align: right; font-variant-numeric: tabular-nums; color: var(--color-fg-muted); }
  .kind-badge { font-size: var(--font-size-xs); color: var(--color-accent); background: var(--color-accent-dim); padding: 1px 6px; border-radius: var(--radius-sm); }
  .empty-cell { text-align: center; color: var(--color-fg-muted); padding: var(--space-6) !important; }
</style>
