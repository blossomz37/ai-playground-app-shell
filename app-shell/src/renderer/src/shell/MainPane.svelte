<script lang="ts">
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
  // Prompt Studio
  import PromptStudioMainView from '../modules/promptstudio/MainView.svelte'

  let props = $props<{ moduleId: string | null }>()
</script>

<main class="main-pane">
  {#if props.moduleId === 'shell.documents'}
    <DocsMainView />
  {:else if props.moduleId === 'shell.journal'}
    <JournalMainView />
  {:else if props.moduleId === 'shell.assets'}
    <AssetsMainView />
  {:else if props.moduleId === 'shell.workflow'}
    <WorkflowMainView />
  {:else if props.moduleId === 'shell.tableview'}
    <TableMainView />
  {:else if props.moduleId === 'shell.aichat'}
    <AIChatMainView />
  {:else if props.moduleId === 'shell.web'}
    <WebMainView />
  {:else if props.moduleId === 'shell.promptstudio'}
    <PromptStudioMainView />
  {:else}
    <div class="empty">
      <p>Nothing selected</p>
    </div>
  {/if}
</main>

<style>
  .main-pane {
    grid-area: main;
    display: flex;
    flex-direction: column;
    min-height: 0;
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
