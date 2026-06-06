<script lang="ts">
  import { loadModuleView } from './module-view-loaders'

  let props = $props<{ moduleId: string | null }>()
  let viewPromise = $derived(loadModuleView(props.moduleId, 'main'))
</script>

<main class="main-pane">
  {#await viewPromise}
    <div class="empty">Loading...</div>
  {:then View}
    {#if View}
      <View />
    {:else}
      <div class="empty">Nothing selected</div>
    {/if}
  {:catch}
    <div class="empty">Module view unavailable</div>
  {/await}
</main>

<style>
  .main-pane {
    grid-area: main;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--color-shell-main);
    overflow: hidden;
  }

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-fg-muted);
    font-size: var(--font-size-md);
  }
</style>
