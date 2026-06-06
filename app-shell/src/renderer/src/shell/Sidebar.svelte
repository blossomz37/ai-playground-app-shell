<script lang="ts">
  import WorkspaceSwitcher from './WorkspaceSwitcher.svelte'
  import { loadModuleView } from './module-view-loaders'

  let props = $props<{ moduleId: string | null }>()
  let viewPromise = $derived(loadModuleView(props.moduleId, 'navigation'))
</script>

<aside class="sidebar">
  {#if props.moduleId === 'shell.tableview'}
    <WorkspaceSwitcher mode="sidebar" />
  {:else}
    <div class="module-navigation">
      {#await viewPromise}
        <div class="empty">Loading...</div>
      {:then View}
        {#if View}
          <View />
        {:else}
          <div class="empty">Nothing selected</div>
        {/if}
      {:catch}
        <div class="empty">Module navigation unavailable</div>
      {/await}
    </div>
  {/if}
</aside>

<style>
  .sidebar {
    grid-area: sidebar;
    display: flex;
    flex-direction: column;
    background: var(--color-shell-sidebar);
    border-right: var(--border-zone);
    box-shadow: inset -1px 0 0 color-mix(in srgb, var(--color-panel-glint) 44%, transparent);
    overflow: hidden;
  }

  .module-navigation {
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .empty {
    padding: var(--space-4);
    color: var(--color-fg-muted);
    font-size: var(--font-size-sm);
  }
</style>
