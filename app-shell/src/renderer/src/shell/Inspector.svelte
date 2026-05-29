<script lang="ts">
  import { activeModuleId } from '../store'
  import InspectorView from '../modules/documents/InspectorView.svelte'
</script>

<aside class="inspector">
  {#if $activeModuleId === 'shell.documents'}
    <InspectorView />
  {:else}
    <div class="empty">No inspector</div>
  {/if}
</aside>

<style>
  .inspector {
    grid-area: inspector;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-surface);
    border-left: var(--border-subtle);
    overflow-y: auto;
  }

  .empty {
    padding: var(--space-4);
    color: var(--color-fg-muted);
    font-size: var(--font-size-sm);
  }
</style>
