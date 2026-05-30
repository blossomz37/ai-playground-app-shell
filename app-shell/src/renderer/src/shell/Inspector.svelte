<script lang="ts">
  import { activeModuleId } from '../store'
  // Documents
  import DocsInspectorView from '../modules/documents/InspectorView.svelte'
  // Journal
  import JournalInspectorView from '../modules/journal/InspectorView.svelte'
  // Assets
  import AssetsInspectorView from '../modules/assets/InspectorView.svelte'
  // Workflow
  import WorkflowInspectorView from '../modules/workflow/InspectorView.svelte'
  // Table View
  import TableInspectorView from '../modules/tableview/InspectorView.svelte'
  // AI Chat
  import AIChatInspectorView from '../modules/aichat/InspectorView.svelte'
  // Web
  import WebInspectorView from '../modules/web/InspectorView.svelte'
  // Prompt Studio
  import PromptStudioInspectorView from '../modules/promptstudio/InspectorView.svelte'
</script>

<aside class="inspector">
  {#if $activeModuleId === 'shell.documents'}
    <DocsInspectorView />
  {:else if $activeModuleId === 'shell.journal'}
    <JournalInspectorView />
  {:else if $activeModuleId === 'shell.assets'}
    <AssetsInspectorView />
  {:else if $activeModuleId === 'shell.workflow'}
    <WorkflowInspectorView />
  {:else if $activeModuleId === 'shell.tableview'}
    <TableInspectorView />
  {:else if $activeModuleId === 'shell.aichat'}
    <AIChatInspectorView />
  {:else if $activeModuleId === 'shell.web'}
    <WebInspectorView />
  {:else if $activeModuleId === 'shell.promptstudio'}
    <PromptStudioInspectorView />
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
