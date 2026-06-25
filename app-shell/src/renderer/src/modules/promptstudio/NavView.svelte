<script lang="ts">
  import { onMount } from 'svelte'
  import AiContextPicker from '../../shell/AiContextPicker.svelte'
  import InlineRename from '../../shell/InlineRename.svelte'
  import {
    aiTemplates,
    archiveAiTemplate,
    archivedAiTemplates,
    createAiTemplate,
    deleteAiTemplate,
    duplicateAiTemplate,
    loadAiTemplates,
    refreshAiContext,
    renameAiTemplate,
    restoreAiTemplate,
    selectAiTemplate,
    selectedAiTemplateId
  } from '../../store/ai'
  import { addToast } from '../../store/toasts'

  let renamingTemplateId = $state<string | null>(null)
  let activeTab = $state<'templates' | 'archive' | 'context'>('templates')

  onMount(async () => {
    await Promise.all([loadAiTemplates(), refreshAiContext()])
  })

  async function createTemplate(): Promise<void> {
    const template = await createAiTemplate()
    renamingTemplateId = template.id
    activeTab = 'templates'
    addToast('info', 'New prompt template created.')
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

  async function duplicateTemplate(event: MouseEvent, id: string): Promise<void> {
    event.stopPropagation()
    await duplicateAiTemplate(id)
    activeTab = 'templates'
    addToast('info', 'Prompt template duplicated.')
  }

  async function archiveTemplate(event: MouseEvent, id: string): Promise<void> {
    event.stopPropagation()
    await archiveAiTemplate(id)
    addToast('info', 'Prompt template archived.')
  }

  async function restoreTemplate(event: MouseEvent, id: string): Promise<void> {
    event.stopPropagation()
    await restoreAiTemplate(id)
    activeTab = 'templates'
    addToast('info', 'Prompt template restored.')
  }

  async function deleteTemplate(event: MouseEvent, id: string, name: string): Promise<void> {
    event.stopPropagation()
    if (!window.confirm(`Delete "${name}" permanently?`)) return
    await deleteAiTemplate(id)
    addToast('info', 'Prompt template deleted.')
  }
</script>

<div class="nav-view">
  <header class="zone-header">
    <h2 class="zone-title">Prompts</h2>
    <button class="btn-icon" title="New Template" onclick={createTemplate}>
      <span class="icon">+</span>
    </button>
  </header>

  <div class="nav-tabs" role="tablist" aria-label="Prompt Studio navigation">
    <button type="button" role="tab" class:active={activeTab === 'templates'} onclick={() => activeTab = 'templates'}>Templates</button>
    <button type="button" role="tab" class:active={activeTab === 'archive'} onclick={() => activeTab = 'archive'}>Archive</button>
    <button type="button" role="tab" class:active={activeTab === 'context'} onclick={() => activeTab = 'context'}>Context</button>
  </div>

  {#if activeTab === 'templates'}
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
              <div class="template-meta">{template.isProtected ? 'Built-in action prompt' : template.tags.join(', ') || 'Prompt template'}</div>
            </button>
            <div class="row-actions">
              <button
                type="button"
                class="row-action"
                title="Rename"
                aria-label={`Rename ${template.name}`}
                onclick={(event) => startRename(event, template.id)}
              >
                Name
              </button>
              <button
                type="button"
                class="row-action"
                title="Duplicate"
                aria-label={`Duplicate ${template.name}`}
                onclick={(event) => void duplicateTemplate(event, template.id)}
              >
                Copy
              </button>
              {#if !template.isProtected}
                <button
                  type="button"
                  class="row-action"
                  title="Archive"
                  aria-label={`Archive ${template.name}`}
                  onclick={(event) => void archiveTemplate(event, template.id)}
                >
                  Arc
                </button>
                <button
                  type="button"
                  class="row-action danger"
                  title="Delete"
                  aria-label={`Delete ${template.name}`}
                  onclick={(event) => void deleteTemplate(event, template.id, template.name)}
                >
                  Del
                </button>
              {/if}
            </div>
          {/if}
        </div>
      {:else}
        <div class="template-empty">No templates</div>
      {/each}
    </div>
  {:else if activeTab === 'archive'}
    <div class="template-list">
      {#each $archivedAiTemplates as template (template.id)}
        <div class="template-item">
          <div class="template-open archived-template">
            <div class="template-title">{template.name}</div>
            <div class="template-meta">Archived {template.archivedAt ? new Date(template.archivedAt).toLocaleDateString() : ''}</div>
          </div>
          <div class="row-actions">
            <button
              type="button"
              class="row-action"
              title="Restore"
              aria-label={`Restore ${template.name}`}
              onclick={(event) => void restoreTemplate(event, template.id)}
            >
              Restore
            </button>
            <button
              type="button"
              class="row-action danger"
              title="Delete"
              aria-label={`Delete ${template.name}`}
              onclick={(event) => void deleteTemplate(event, template.id, template.name)}
            >
              Del
            </button>
          </div>
        </div>
      {:else}
        <div class="template-empty">No archived templates</div>
      {/each}
    </div>
  {:else}
    <div class="context-panel">
      <AiContextPicker />
    </div>
  {/if}
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

  .nav-tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-1);
    padding: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }

  .nav-tabs button {
    min-width: 0;
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: var(--font-size-sm);
    text-align: center;
  }

  .nav-tabs button:hover,
  .nav-tabs button.active {
    background: var(--color-bg-active);
    color: var(--color-fg-primary);
  }

  .template-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .template-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
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

  .archived-template {
    cursor: default;
  }

  .row-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 2px;
  }

  .row-action {
    min-width: 34px;
    height: 22px;
    padding: 0 5px;
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
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

  .row-action.danger:hover {
    color: var(--color-error, #cf222e);
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

  .context-panel {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-3);
  }
</style>
