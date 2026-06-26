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
    exportAiTemplatesJson,
    importAiTemplatesFromJson,
    loadAiTemplates,
    refreshAiContext,
    renameAiTemplate,
    restoreAiTemplate,
    selectAiTemplate,
    selectedAiTemplateId
  } from '../../store/ai'
  import { addToast } from '../../store/toasts'
  import type { AiPromptTemplate } from '@shared/ai'

  let renamingTemplateId = $state<string | null>(null)
  let activeTab = $state<'templates' | 'archive' | 'context'>('templates')
  let tagFilter = $state('all')
  let filterQuery = $state('')
  let normalizedFilter = $derived(filterQuery.trim().toLowerCase())
  let templateTags = $derived(Array.from(new Set($aiTemplates.flatMap(template => template.tags))).sort())
  let visibleTemplates = $derived(
    $aiTemplates.filter(template =>
      (tagFilter === 'all' || template.tags.includes(tagFilter)) &&
      (!normalizedFilter || templateMatches(template, normalizedFilter))
    )
  )
  let visibleArchivedTemplates = $derived(
    normalizedFilter
      ? $archivedAiTemplates.filter(template => templateMatches(template, normalizedFilter))
      : $archivedAiTemplates
  )

  onMount(async () => {
    await Promise.all([loadAiTemplates(), refreshAiContext()])
  })

  async function createTemplate(): Promise<void> {
    const template = await createAiTemplate()
    renamingTemplateId = template.id
    activeTab = 'templates'
    addToast('info', 'New prompt template created.')
  }

  function templateMatches(template: AiPromptTemplate, query: string): boolean {
    return [
      template.name,
      template.description,
      template.body,
      template.defaultModel,
      ...template.tags
    ].some(value => value.toLowerCase().includes(query))
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

  function exportTemplates(): void {
    const blob = new Blob([exportAiTemplatesJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `app-shell-prompt-templates-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    addToast('info', 'Prompt templates exported.')
  }

  function openImportPicker(): void {
    document.getElementById('prompt-template-import')?.click()
  }

  async function importTemplates(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    try {
      const count = await importAiTemplatesFromJson(await file.text())
      activeTab = 'templates'
      tagFilter = 'all'
      addToast('info', `${count} prompt template${count === 1 ? '' : 's'} imported.`)
    } catch (error) {
      addToast('warn', error instanceof Error ? error.message : 'Prompt templates could not be imported.')
    }
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
    <div class="library-tools">
      <input
        bind:value={filterQuery}
        data-capture-nav-search
        type="search"
        class="filter-input"
        placeholder="Filter prompts"
        aria-label="Filter prompt templates"
        autocomplete="off"
      />
      <select
        aria-label="Filter prompt templates by tag"
        value={tagFilter}
        onchange={(event) => tagFilter = event.currentTarget.value}
      >
        <option value="all">All tags</option>
        {#each templateTags as tag (tag)}
          <option value={tag}>{tag}</option>
        {/each}
      </select>
      <button type="button" class="tool-btn" onclick={exportTemplates}>Export</button>
      <button type="button" class="tool-btn" onclick={openImportPicker}>Import</button>
      <input
        id="prompt-template-import"
        type="file"
        accept="application/json,.json"
        class="file-input"
        onchange={(event) => void importTemplates(event)}
      />
    </div>
    <div class="template-list">
      {#each visibleTemplates as template (template.id)}
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
              <div class="template-meta">
                {#if template.isProtected}
                  <span class="meta-chip">Built-in</span>
                {:else if template.tags.length > 0}
                  <span class="meta-chip">{template.tags[0]}</span>
                  {#if template.tags.length > 1}
                    <span class="meta-count">+{template.tags.length - 1}</span>
                  {/if}
                {:else}
                  <span>Prompt template</span>
                {/if}
              </div>
            </button>
            <div class="row-actions">
              <button
                type="button"
                class="row-action"
                title="Rename"
                aria-label={`Rename ${template.name}`}
                onclick={(event) => startRename(event, template.id)}
              >
                Rename
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
        <div class="template-empty">No templates match.</div>
      {/each}
    </div>
  {:else if activeTab === 'archive'}
    <div class="archive-tools">
      <input
        bind:value={filterQuery}
        data-capture-nav-search
        type="search"
        class="filter-input"
        placeholder="Filter archived prompts"
        aria-label="Filter archived prompt templates"
        autocomplete="off"
      />
    </div>
    <div class="template-list">
      {#each visibleArchivedTemplates as template (template.id)}
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
        <div class="template-empty">No archived templates match.</div>
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

  .library-tools {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: var(--space-1);
    padding: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }

  .archive-tools {
    padding: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }

  .filter-input,
  .library-tools select,
  .tool-btn {
    min-width: 0;
    height: 28px;
    padding: 0 var(--space-2);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-base);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
  }

  .tool-btn {
    cursor: pointer;
  }

  .filter-input {
    width: 100%;
    grid-column: 1 / -1;
  }

  .filter-input::placeholder {
    color: var(--color-fg-muted);
  }

  .filter-input:focus,
  .library-tools select:focus,
  .tool-btn:focus-visible {
    outline: none;
    border-color: var(--color-accent);
  }

  .tool-btn:hover {
    color: var(--color-fg-primary);
    border-color: var(--color-accent);
  }

  .file-input {
    display: none;
  }

  .template-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, auto);
    align-items: center;
    gap: var(--space-1);
    width: 100%;
    min-height: 48px;
    padding: 2px var(--space-1);
    border-radius: var(--radius-sm);
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
    padding: 5px var(--space-2);
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .archived-template {
    cursor: default;
  }

  .row-actions {
    display: flex;
    flex-wrap: nowrap;
    justify-content: flex-end;
    gap: 2px;
    max-width: 78px;
    overflow: hidden;
  }

  .row-action {
    min-width: 22px;
    height: 22px;
    padding: 0 4px;
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    opacity: 0;
    overflow: hidden;
    text-overflow: clip;
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
    min-width: 0;
    font-size: var(--font-size-sm);
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .template-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    margin-top: 2px;
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta-chip {
    min-width: 0;
    max-width: 118px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta-count {
    flex-shrink: 0;
    color: color-mix(in srgb, var(--color-fg-muted) 82%, var(--color-accent));
    font-weight: 700;
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
