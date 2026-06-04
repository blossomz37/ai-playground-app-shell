<script lang="ts">
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

  let props = $props<{ moduleId: string | null }>()
</script>

<aside class="inspector">
  {#if props.moduleId === 'shell.documents'}
    <DocsInspectorView />
  {:else if props.moduleId === 'shell.journal'}
    <JournalInspectorView />
  {:else if props.moduleId === 'shell.assets'}
    <AssetsInspectorView />
  {:else if props.moduleId === 'shell.workflow'}
    <WorkflowInspectorView />
  {:else if props.moduleId === 'shell.tableview'}
    <TableInspectorView />
  {:else if props.moduleId === 'shell.aichat'}
    <AIChatInspectorView />
  {:else if props.moduleId === 'shell.web'}
    <WebInspectorView />
  {:else if props.moduleId === 'shell.promptstudio'}
    <PromptStudioInspectorView />
  {:else}
    <div class="empty">Nothing selected</div>
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
