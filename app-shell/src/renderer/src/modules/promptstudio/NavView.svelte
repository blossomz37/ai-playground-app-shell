<script lang="ts">
  import { onMount } from 'svelte'
  import { aiTemplates, loadAiTemplates } from '../../store/ai'
  import { addToast } from '../../store/toasts'

  let activeTemplateId = $state<string | null>(null)

  onMount(async () => {
    await loadAiTemplates()
    activeTemplateId = $aiTemplates[0]?.id ?? null
  })

  async function createTemplate(): Promise<void> {
    await window.shell.commands.execute('promptstudio.new')
    addToast('info', 'New prompt template requested')
  }
</script>

<div class="nav-view">
  <header>
    <h2>Templates</h2>
    <button class="btn-icon" title="New Template" onclick={createTemplate}>
      <span class="icon">➕</span>
    </button>
  </header>

  <div class="template-list">
    {#each $aiTemplates as template (template.id)}
      <button
        class="template-item"
        class:active={activeTemplateId === template.id}
        onclick={() => (activeTemplateId = template.id)}
      >
        <div class="template-title">{template.name}</div>
        <div class="template-meta">{template.tags.join(', ') || 'Prompt template'}</div>
      </button>
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
    padding: var(--space-4);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: var(--border-subtle);
  }

  h2 {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
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
    display: block;
    width: 100%;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    cursor: pointer;
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
