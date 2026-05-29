<script lang="ts">
  import { activeModuleId, isDirty, editorContent, activeDoc, countWords } from '../store'
</script>

<footer class="status-bar">
  {#if $activeModuleId === 'shell.documents'}
    <span class="item">{$activeDoc?.title ?? '—'}</span>
    <span class="sep">·</span>
    <span class="item">{countWords($editorContent)} words</span>
    <span class="sep">·</span>
    <span class="item save-state" class:dirty={$isDirty}>
      {$isDirty ? '● unsaved' : '✓ saved'}
    </span>
  {:else}
    <span class="item muted">App Shell v0.1.0</span>
  {/if}
</footer>

<style>
  .status-bar {
    grid-area: statusbar;
    display: flex;
    align-items: center;
    padding: 0 var(--space-4);
    gap: var(--space-2);
    background: var(--color-bg-surface);
    border-top: var(--border-subtle);
    font-size: var(--font-size-xs);
    color: var(--color-fg-secondary);
    overflow: hidden;
  }

  .item { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sep  { color: var(--color-fg-muted); }
  .muted { color: var(--color-fg-muted); }

  .save-state        { color: var(--color-success); }
  .save-state.dirty  { color: var(--color-warn); }
</style>
