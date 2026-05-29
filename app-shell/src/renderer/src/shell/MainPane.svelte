<script lang="ts">
  import { activeModuleId } from '../store'
  // Documents
  import DocsMainView from '../modules/documents/MainView.svelte'
  // Journal
  import JournalMainView from '../modules/journal/MainView.svelte'
  // Assets
  import AssetsMainView from '../modules/assets/MainView.svelte'
  // Workflow
  import WorkflowMainView from '../modules/workflow/MainView.svelte'
  // Table View
  import TableMainView from '../modules/tableview/MainView.svelte'
  // AI Chat
  import AIChatMainView from '../modules/aichat/MainView.svelte'
  // Web
  import WebMainView from '../modules/web/MainView.svelte'
</script>

<main class="main-pane">
  {#if $activeModuleId === 'shell.documents'}
    <DocsMainView />
  {:else if $activeModuleId === 'shell.journal'}
    <JournalMainView />
  {:else if $activeModuleId === 'shell.assets'}
    <AssetsMainView />
  {:else if $activeModuleId === 'shell.workflow'}
    <WorkflowMainView />
  {:else if $activeModuleId === 'shell.tableview'}
    <TableMainView />
  {:else if $activeModuleId === 'shell.aichat'}
    <AIChatMainView />
  {:else if $activeModuleId === 'shell.web'}
    <WebMainView />
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
