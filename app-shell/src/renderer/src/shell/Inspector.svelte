<script lang="ts">
  import { loadModuleView } from './module-view-loaders'

  let props = $props<{ moduleId: string | null }>()
  let viewPromise = $derived(loadModuleView(props.moduleId, 'inspector'))
</script>

<aside class="inspector">
  {#await viewPromise}
    <div class="empty">Loading...</div>
  {:then View}
    {#if View}
      <View />
    {:else}
      <div class="empty">Nothing selected</div>
    {/if}
  {:catch}
    <div class="empty">Module inspector unavailable</div>
  {/await}
</aside>

<style>
  .inspector {
    grid-area: inspector;
    display: flex;
    flex-direction: column;
    background: var(--color-shell-inspector);
    border-left: var(--border-zone);
    box-shadow: inset 1px 0 0 color-mix(in srgb, var(--color-panel-glint) 48%, transparent);
    overflow-y: auto;
  }

  .empty {
    padding: var(--space-4);
    color: var(--color-fg-muted);
    font-size: var(--font-size-sm);
  }
</style>
