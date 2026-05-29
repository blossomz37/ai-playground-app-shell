<script lang="ts">
  import { activeModuleId } from '../store'
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
</script>

<aside class="sidebar">
  {#if $activeModuleId === 'shell.documents'}
    <DocsNavView />
  {:else if $activeModuleId === 'shell.journal'}
    <JournalNavView />
  {:else if $activeModuleId === 'shell.assets'}
    <AssetsNavView />
  {:else if $activeModuleId === 'shell.workflow'}
    <WorkflowNavView />
  {:else if $activeModuleId === 'shell.tableview'}
    <TableNavView />
  {:else if $activeModuleId === 'shell.aichat'}
    <AIChatNavView />
  {:else if $activeModuleId === 'shell.web'}
    <WebNavView />
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
