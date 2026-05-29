<script lang="ts">
  import { activeModuleId } from '../store'
  import NavView from '../modules/documents/NavView.svelte'
</script>

<aside class="sidebar">
  {#if $activeModuleId === 'shell.documents'}
    <NavView />
  {:else}
    <div class="empty">No module selected</div>
  {/if}
</aside>

<style>
  .sidebar {
    grid-area: sidebar;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-surface);
    border-right: var(--border-subtle);
    overflow: hidden;
  }

  .empty {
    padding: var(--space-4);
    color: var(--color-fg-muted);
    font-size: var(--font-size-sm);
  }
</style>
