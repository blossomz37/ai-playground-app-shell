<script lang="ts">
  // Documents
  import DocsNavView from '../modules/documents/NavView.svelte'
  // Journal
  import JournalNavView from '../modules/journal/NavView.svelte'
  // Assets
  import AssetsNavView from '../modules/assets/NavView.svelte'
  // Workflow
  import WorkflowNavView from '../modules/workflow/NavView.svelte'
  // AI Chat
  import AIChatNavView from '../modules/aichat/NavView.svelte'
  // Web
  import WebNavView from '../modules/web/NavView.svelte'
  // Prompt Studio
  import PromptStudioNavView from '../modules/promptstudio/NavView.svelte'
  import WorkspaceSwitcher from './WorkspaceSwitcher.svelte'

  let props = $props<{ moduleId: string | null }>()
</script>

<aside class="sidebar">
  {#if props.moduleId === 'shell.tableview'}
    <WorkspaceSwitcher mode="sidebar" />
  {:else}
    <div class="module-navigation">
      {#if props.moduleId === 'shell.documents'}
        <DocsNavView />
      {:else if props.moduleId === 'shell.journal'}
        <JournalNavView />
      {:else if props.moduleId === 'shell.assets'}
        <AssetsNavView />
      {:else if props.moduleId === 'shell.workflow'}
        <WorkflowNavView />
      {:else if props.moduleId === 'shell.aichat'}
        <AIChatNavView />
      {:else if props.moduleId === 'shell.web'}
        <WebNavView />
      {:else if props.moduleId === 'shell.promptstudio'}
        <PromptStudioNavView />
      {:else}
        <div class="empty">Nothing selected</div>
      {/if}
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
