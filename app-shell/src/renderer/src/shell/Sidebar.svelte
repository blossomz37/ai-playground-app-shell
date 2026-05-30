<script lang="ts">
  // Documents
  import DocsNavView from '../modules/documents/NavView.svelte'
  // Journal
  import JournalNavView from '../modules/journal/NavView.svelte'
  // Assets
  import AssetsNavView from '../modules/assets/NavView.svelte'
  // Workflow
  import WorkflowNavView from '../modules/workflow/NavView.svelte'
  // Table View
  import TableNavView from '../modules/tableview/NavView.svelte'
  // AI Chat
  import AIChatNavView from '../modules/aichat/NavView.svelte'
  // Web
  import WebNavView from '../modules/web/NavView.svelte'
  // Prompt Studio
  import PromptStudioNavView from '../modules/promptstudio/NavView.svelte'

  let { moduleId }: { moduleId: string | null } = $props()
</script>

<aside class="sidebar">
  {#if moduleId === 'shell.documents'}
    <DocsNavView />
  {:else if moduleId === 'shell.journal'}
    <JournalNavView />
  {:else if moduleId === 'shell.assets'}
    <AssetsNavView />
  {:else if moduleId === 'shell.workflow'}
    <WorkflowNavView />
  {:else if moduleId === 'shell.tableview'}
    <TableNavView />
  {:else if moduleId === 'shell.aichat'}
    <AIChatNavView />
  {:else if moduleId === 'shell.web'}
    <WebNavView />
  {:else if moduleId === 'shell.promptstudio'}
    <PromptStudioNavView />
  {:else}
    <div class="empty">Nothing selected</div>
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
