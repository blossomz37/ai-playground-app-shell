<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import InlineRename from '../../shell/InlineRename.svelte'
  import MarkdownContent from '../../shell/MarkdownContent.svelte'
  import type { AiPreview } from '@shared/ai'
  import { activeDoc } from '../../store'
  import {
    aiRunSettingsForSurface,
    aiBusy,
    createAiProposalFromInvocation,
    extractPromptVariables,
    invokeAi,
    loadAiProviders,
    previewAi,
    loadAiTemplates,
    PROMPT_VARIABLE_REFERENCE,
    refreshAiContext,
    renameAiTemplate,
    saveAiTemplateDetails,
    selectAiSurfaceModel,
    selectAiSurfaceTemperature,
    selectedAiTemplate
  } from '../../store/ai'
  import { addToast } from '../../store/toasts'

  const templatePlaceholder = 'Enter prompt template... Use {{variable}} for slots.'
  const managedVariableKeys = new Set(PROMPT_VARIABLE_REFERENCE
    .map(variable => variable.key)
    .filter(key => key !== 'text')
  )

  let promptText = $state('Please summarize the included context in 3 useful bullet points.\n\n{{text}}')
  let variableValues = $state<Record<string, string>>({ text: '' })
  let tagText = $state('')
  let outputText = $state('')
  let preview = $state<AiPreview | null>(null)
  let renamingTemplate = $state(false)
  const runSettings = aiRunSettingsForSurface('shell.promptstudio')
  let activeTemplate = $derived($selectedAiTemplate)
  let templateName = $derived(activeTemplate?.name ?? 'No template selected')
  let variableNames = $derived(extractPromptVariables(promptText))
  let editableVariableNames = $derived(variableNames.filter(name => !managedVariableKeys.has(name)))
  let normalizedTags = $derived(tagsFromText(tagText))
  let promptDirty = $derived(Boolean(activeTemplate && (
    promptText !== activeTemplate.body
    || normalizedTags.join(',') !== activeTemplate.tags.join(',')
    || $runSettings.model !== activeTemplate.defaultModel
    || $runSettings.temperature !== activeTemplate.defaultTemperature
  )))
  let hydratedTemplateId: string | null = null
  let templateUnsubscribe: (() => void) | null = null

  onMount(async () => {
    await loadAiProviders()
    templateUnsubscribe = selectedAiTemplate.subscribe((template) => {
      if (template && template.id !== hydratedTemplateId) {
        promptText = template.body
        tagText = template.tags.join(', ')
        variableValues = valuesForVariables(editableVariablesFromBody(template.body), variableValues)
        if (template.defaultModel) selectAiSurfaceModel('shell.promptstudio', template.defaultModel)
        selectAiSurfaceTemperature('shell.promptstudio', template.defaultTemperature)
        hydratedTemplateId = template.id
      }
    })
    await Promise.all([loadAiTemplates(), refreshAiContext()])
  })

  onDestroy(() => {
    templateUnsubscribe?.()
  })

  function requestParams() {
    const variables = Object.fromEntries(
      editableVariableNames.map(name => [name, variableValues[name] ?? ''])
    )
    return {
      moduleId: 'shell.promptstudio',
      originType: 'template' as const,
      originId: activeTemplate?.id ?? templateName,
      prompt: promptText,
      variables,
      providerId: $runSettings.providerId,
      model: $runSettings.model,
      temperature: $runSettings.temperature
    }
  }

  function tagsFromText(value: string): string[] {
    return Array.from(new Set(value
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(Boolean)
    ))
  }

  function valuesForVariables(names: string[], current: Record<string, string>): Record<string, string> {
    return Object.fromEntries(names.map(name => [name, current[name] ?? '']))
  }

  function editableVariablesFromBody(body: string): string[] {
    return extractPromptVariables(body).filter(name => !managedVariableKeys.has(name))
  }

  function setVariable(name: string, value: string): void {
    variableValues = { ...variableValues, [name]: value }
  }

  function insertVariable(key: string): void {
    const token = `{{${key}}}`
    promptText = promptText.trimEnd()
      ? `${promptText.trimEnd()}\n\n${token}`
      : token
    variableValues = valuesForVariables(editableVariablesFromBody(promptText), variableValues)
  }

  function variableToken(key: string): string {
    return `{{${key}}}`
  }

  async function rememberTemplateSettings(): Promise<void> {
    if (!activeTemplate) return
    await saveAiTemplateDetails(activeTemplate, {
      body: promptText,
      tags: normalizedTags,
      defaultModel: $runSettings.model,
      defaultTemperature: $runSettings.temperature
    })
  }

  async function runTemplate() {
    try {
      preview = null
      await rememberTemplateSettings()
      const result = await invokeAi(requestParams())
      outputText = result.run.error ?? result.run.outputText
    } catch (error) {
      addToast('warn', error instanceof Error ? error.message : 'Prompt template could not run.')
    }
  }

  async function previewTemplate() {
    try {
      await rememberTemplateSettings()
      preview = await previewAi(requestParams())
    } catch (error) {
      addToast('warn', error instanceof Error ? error.message : 'Prompt preview could not be created.')
    }
  }

  async function createDocumentProposal(): Promise<void> {
    if (!$activeDoc) {
      addToast('warn', 'Select a document before creating a proposal.')
      return
    }
    try {
      preview = null
      await rememberTemplateSettings()
      const proposal = await createAiProposalFromInvocation({
        targetDocumentId: $activeDoc.id,
        proposalType: 'append-note',
        sourceText: '',
        runParams: requestParams()
      })
      addToast('info', `Proposal saved for ${$activeDoc.title}.`)
      outputText = proposal.proposedText
    } catch (error) {
      addToast('warn', error instanceof Error ? error.message : 'Document proposal could not be created.')
    }
  }

  async function saveTemplate(): Promise<void> {
    if (!activeTemplate) return
    await rememberTemplateSettings()
    addToast('info', 'Prompt template saved.')
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
      {#if activeTemplate?.isProtected}
        <span class="protected-badge">Built-in action</span>
      {/if}
    </div>
    <div class="actions">
      <button class="btn" onclick={saveTemplate} disabled={!activeTemplate || !promptDirty}>
        Save
      </button>
      <button class="btn" onclick={previewTemplate} disabled={$aiBusy}>
        Preview Prompt
      </button>
      <button class="btn primary" onclick={runTemplate} disabled={$aiBusy}>
        {$aiBusy ? 'Running...' : 'Run Template'}
      </button>
      <button class="btn" onclick={createDocumentProposal} disabled={$aiBusy || !$activeDoc}>
        Save as Proposal
      </button>
    </div>
  </header>

  <div class="template-workspace">
    <section class="template-section prompt-section">
      <div class="section-heading">
        <div class="section-title">Prompt Template</div>
        <label class="tag-field">
          <span>Tags</span>
          <input
            value={tagText}
            oninput={(event) => tagText = event.currentTarget.value}
            placeholder="draft, revision"
          />
        </label>
      </div>
      <textarea class="prompt-editor" bind:value={promptText} placeholder={templatePlaceholder}></textarea>
    </section>

    <section class="template-section variables-section">
      <div class="section-heading">
        <div class="section-title">Variables</div>
        <div class="reference-row" aria-label="Prompt variable reference">
          {#each PROMPT_VARIABLE_REFERENCE as variable (variable.key)}
            <button
              type="button"
              class="reference-chip"
              title={variable.label}
              onclick={() => insertVariable(variable.key)}
            >
              {variableToken(variable.key)}
            </button>
          {/each}
        </div>
      </div>
      {#each editableVariableNames as variableName (variableName)}
        <div class="variable-row">
          <label for={`var-${variableName}`} class="var-name">{variableName}</label>
          <textarea
            id={`var-${variableName}`}
            class="var-input"
            value={variableValues[variableName] ?? ''}
            oninput={(event) => setVariable(variableName, event.currentTarget.value)}
            placeholder={`Value for {{${variableName}}}...`}
          ></textarea>
        </div>
      {:else}
        <div class="variable-empty">No editable variables detected. Context reference chips are filled automatically.</div>
      {/each}
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
    display: flex;
    align-items: center;
    gap: var(--space-2);
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

  .protected-badge {
    flex-shrink: 0;
    padding: 2px var(--space-2);
    border: 1px solid color-mix(in srgb, var(--color-accent) 28%, var(--color-border));
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
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

  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .tag-field {
    min-width: 220px;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tag-field input {
    width: 180px;
    min-width: 0;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-base);
    color: var(--color-fg-primary);
    font-size: var(--font-size-xs);
    letter-spacing: 0;
    text-transform: none;
  }

  .tag-field input:focus {
    outline: none;
    border-color: var(--color-accent);
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

  .reference-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-1);
  }

  .reference-chip {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-base);
    color: var(--color-fg-secondary);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    cursor: pointer;
  }

  .reference-chip:hover {
    border-color: var(--color-accent);
    color: var(--color-fg-primary);
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

  .variable-empty {
    padding: var(--space-2) var(--space-3);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: var(--font-size-sm);
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
