<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import InlineRename from '../../shell/InlineRename.svelte'
  import MarkdownContent from '../../shell/MarkdownContent.svelte'
  import AiContextPicker from '../../shell/AiContextPicker.svelte'
  import type { AiPreview } from '@shared/ai'
  import { aiBusy, invokeAi, previewAi, loadAiTemplates, refreshAiContext, renameAiTemplate, selectedAiTemplate } from '../../store/ai'
  import { addToast } from '../../store/toasts'

  const templatePlaceholder = 'Enter prompt template... Use {{variable}} for slots.'
  const textPlaceholder = 'Value for {{text}}...'

  let promptText = $state('Please summarize the included context in 3 useful bullet points.\n\n{{text}}')
  let variableText = $state('')
  let outputText = $state('')
  let preview = $state<AiPreview | null>(null)
  let renamingTemplate = $state(false)
  let activeTemplate = $derived($selectedAiTemplate)
  let templateName = $derived(activeTemplate?.name ?? 'No template selected')
  let hydratedTemplateId: string | null = null
  let templateUnsubscribe: (() => void) | null = null

  onMount(async () => {
    templateUnsubscribe = selectedAiTemplate.subscribe((template) => {
      if (template && template.id !== hydratedTemplateId) {
        promptText = template.body
        hydratedTemplateId = template.id
      }
    })
    await Promise.all([loadAiTemplates(), refreshAiContext()])
  })

  onDestroy(() => {
    templateUnsubscribe?.()
  })

  function requestParams() {
    return {
      moduleId: 'shell.promptstudio',
      originType: 'template' as const,
      originId: activeTemplate?.id ?? templateName,
      prompt: promptText,
      variables: { text: variableText }
    }
  }

  async function runTemplate() {
    preview = null
    const result = await invokeAi(requestParams())
    outputText = result.run.error ?? result.run.outputText
  }

  async function previewTemplate() {
    preview = await previewAi(requestParams())
  }

  async function commitRename(name: string): Promise<void> {
    if (!activeTemplate) return
    if (!name) {
      addToast('warn', 'Template name cannot be blank.')
      renamingTemplate = false
      return
    }
    await renameAiTemplate(activeTemplate.id, name)
    renamingTemplate = false
  }
</script>

<div class="main-view">
  <header class="zone-header template-header">
    <div class="title-block">
      {#if renamingTemplate && activeTemplate}
        <InlineRename
          value={activeTemplate.name}
          ariaLabel="Rename prompt template"
          onCommit={commitRename}
          onCancel={() => renamingTemplate = false}
        />
      {:else}
        <button type="button" class="template-title-button" onclick={() => renamingTemplate = true}>
          {templateName}
        </button>
      {/if}
    </div>
    <div class="actions">
      <button class="btn" onclick={previewTemplate} disabled={$aiBusy}>
        Preview Prompt
      </button>
      <button class="btn primary" onclick={runTemplate} disabled={$aiBusy}>
        {$aiBusy ? 'Running...' : 'Run Template'}
      </button>
    </div>
  </header>

  <div class="template-workspace">
    <section class="template-section prompt-section">
      <div class="section-title">Prompt Template</div>
      <textarea class="prompt-editor" bind:value={promptText} placeholder={templatePlaceholder}></textarea>
    </section>

    <section class="template-section variables-section">
      <div class="section-title">Variables</div>
      <div class="variable-row">
        <label for="var-text" class="var-name">text</label>
        <textarea id="var-text" class="var-input" bind:value={variableText} placeholder={textPlaceholder}></textarea>
      </div>
    </section>

    <section class="template-section context-section">
      <AiContextPicker />
    </section>

    {#if preview}
      <section class="template-section preview-section">
        <div class="section-title preview-title">
          <span>Prompt Preview</span>
          <span class="preview-meta">{preview.providerId} · {preview.model} · ~{preview.tokenEstimate} tok · not sent</span>
        </div>
        <pre class="preview-box">{preview.renderedPrompt}</pre>
      </section>
    {/if}

    <section class="template-section output-section">
      <div class="section-title">Output</div>
      <div class="output-box">
        {#if outputText}
          <div class="output-markdown">
            <MarkdownContent content={outputText} />
          </div>
        {:else}
          <span class="placeholder-text">Run template to see output...</span>
        {/if}
      </div>
    </section>
  </div>
</div>

<style>
  .main-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .template-header {
    justify-content: space-between;
    gap: var(--space-4);
    padding: 0 var(--space-5);
  }

  .title-block {
    min-width: 0;
  }

  .template-title-button {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
    font-size: var(--font-size-md);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
  }

  .btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .btn.primary {
    background: var(--color-accent-dim);
    border-color: var(--color-accent);
    color: var(--color-fg-primary);
  }

  .btn.primary:hover {
    background: var(--color-accent);
    color: var(--color-bg-base);
  }

  .section-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .actions {
    display: flex;
    gap: var(--space-2);
  }

  .template-workspace {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .context-section {
    flex: 0 0 auto;
  }

  .preview-section {
    flex: 0 0 auto;
    gap: var(--space-2);
  }

  .preview-title {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .preview-meta {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-accent);
    text-transform: none;
    letter-spacing: 0;
  }

  .preview-box {
    margin: 0;
    max-height: 240px;
    overflow-y: auto;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-base);
    color: var(--color-fg-secondary);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .template-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    border-bottom: var(--border-subtle);
  }

  .prompt-section {
    flex: 1 1 auto;
    min-height: 220px;
  }

  .variables-section {
    flex: 0 0 auto;
    background: color-mix(in srgb, var(--color-bg-surface) 35%, transparent);
  }

  .output-section {
    flex: 0 0 112px;
    border-bottom: none;
  }

  .prompt-editor {
    flex: 1;
    min-height: 0;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    line-height: 1.65;
    resize: none;
  }

  .prompt-editor:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .variable-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
  }

  .var-name {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    background: var(--color-bg-active);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    min-width: 80px;
    text-align: right;
    color: var(--color-fg-primary);
  }

  .var-input {
    flex: 1;
    min-height: 58px;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-base);
    color: var(--color-fg-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    resize: vertical;
  }

  .var-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .output-box {
    flex: 1;
    overflow-y: auto;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
    border: 1px dashed var(--color-border);
  }

  .output-markdown {
    margin: 0;
    width: 100%;
    padding: var(--space-3);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    line-height: 1.5;
  }

  .placeholder-text {
    margin: auto;
    color: var(--color-fg-muted);
    font-style: italic;
  }
</style>
