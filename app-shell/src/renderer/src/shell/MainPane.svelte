<script lang="ts">
  import { activeModuleId } from '../store'
  import MainView from '../modules/documents/MainView.svelte'
</script>

<main class="main-pane">
  {#if $activeModuleId === 'shell.documents'}
    <MainView />
  {:else}
    <div class="empty">
      <p>Select a module from the activity rail.</p>
    </div>
  {/if}
</main>

<style>
  .main-pane {
    grid-area: main;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-base);
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
