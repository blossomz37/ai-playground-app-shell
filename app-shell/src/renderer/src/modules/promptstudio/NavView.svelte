<script lang="ts">
  import { onMount } from 'svelte'
  import InlineRename from '../../shell/InlineRename.svelte'
  import { aiTemplates, loadAiTemplates, renameAiTemplate, selectAiTemplate, selectedAiTemplateId } from '../../store/ai'
  import { addToast } from '../../store/toasts'

  let renamingTemplateId = $state<string | null>(null)

  onMount(async () => {
    await loadAiTemplates()
  })

  async function createTemplate(): Promise<void> {
    await window.shell.commands.execute('promptstudio.new')
    addToast('info', 'New prompt template requested')
  }

  function startRename(event: MouseEvent, id: string): void {
    event.stopPropagation()
    selectAiTemplate(id)
    renamingTemplateId = id
  }

  function cancelRename(): void {
    renamingTemplateId = null
  }

  async function commitRename(id: string, name: string): Promise<void> {
    if (!name) {
      addToast('warn', 'Template name cannot be blank.')
      cancelRename()
      return
    }
    await renameAiTemplate(id, name)
    selectAiTemplate(id)
    cancelRename()
  }
</script>

<div class="nav-view">
  <header class="zone-header">
    <h2 class="zone-title">Templates</h2>
    <button class="btn-icon" title="New Template" onclick={createTemplate}>
      <span class="icon">➕</span>
    </button>
  </header>

  <div class="template-list">
    {#each $aiTemplates as template (template.id)}
      <div
        class="template-item"
        class:active={$selectedAiTemplateId === template.id}
      >
        {#if renamingTemplateId === template.id}
          <InlineRename
            value={template.name}
            ariaLabel="Rename prompt template"
            onCommit={(name) => commitRename(template.id, name)}
            onCancel={cancelRename}
          />
        {:else}
          <button type="button" class="template-open" onclick={() => selectAiTemplate(template.id)}>
            <div class="template-title">{template.name}</div>
            <div class="template-meta">{template.tags.join(', ') || 'Prompt template'}</div>
          </button>
          <button
            type="button"
            class="row-action"
            title="Rename"
            aria-label={`Rename ${template.name}`}
            onclick={(event) => startRename(event, template.id)}
          >
            ✎
          </button>
        {/if}
      </div>
    {:else}
      <div class="template-empty">No templates</div>
    {/each}
  </div>
</div>

<style>
  .nav-view {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  header {
    justify-content: space-between;
  }

  h2 {
    margin: 0;
  }

  .btn-icon {
    background: transparent;
    border: none;
    color: var(--color-fg-muted);
    cursor: pointer;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
  }

  .btn-icon:hover {
    background: var(--color-bg-hover);
    color: var(--color-fg-default);
  }

  .template-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .template-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 24px;
    align-items: center;
    gap: var(--space-1);
    width: 100%;
    padding: var(--space-1);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-1);
    color: var(--color-fg-secondary);
    text-align: left;
  }

  .template-item:hover {
    background: var(--color-bg-hover);
  }

  .template-item.active {
    background: var(--color-bg-active);
  }

  .template-open {
    min-width: 0;
    padding: var(--space-2);
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .row-action {
    width: 22px;
    height: 22px;
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    opacity: 0;
  }

  .template-item:hover .row-action,
  .template-item.active .row-action,
  .row-action:focus-visible {
    opacity: 1;
  }

  .row-action:hover {
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
  }

  .template-title {
    font-size: var(--font-size-sm);
    font-weight: 500;
    margin-bottom: var(--space-1);
  }

  .template-meta {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
  }

  .template-empty {
    padding: var(--space-3);
    color: var(--color-fg-muted);
    font-size: var(--font-size-sm);
  }
</style>
