<script lang="ts">
  import { onMount } from 'svelte'
  import type { DocumentAnnotation, DocumentAnnotationStatus, DocumentAnnotationTarget, DocumentSourceMetadata, DocVersion } from '@shared/module-contract'
  import type { AiProposal, AiProposalType } from '@shared/ai'
  import type { DocumentsAiPromptAction } from '@shared/ai-writing-prompts'
  import { documentKindFromValue, documentKindValue, labelForDocumentKind, UNCATEGORIZED_KIND_LABEL, UNCATEGORIZED_KIND_VALUE } from '@shared/document-kinds'
  import {
    activeDoc, annotations, versions, editorContent, countWords, updateDoc, documents, documentKindOptions,
    updateDocMetadata, restoreDocVersion, updateAnnotation, resolveAnnotation, reopenAnnotation, deleteAnnotation
  } from '../../store'
  import AiContextPicker from '../../shell/AiContextPicker.svelte'
  import {
    aiProposals,
    aiProviders,
    aiRunSettingsForSurface,
    aiSecretNames,
    loadAiProviders,
    modelOptionsForProvider,
    selectAiSurfaceModel,
    selectAiSurfaceProvider,
    selectAiSurfaceTemperature
  } from '../../store/ai'
  import { addToast } from '../../store/toasts'
  import {
    documentsAiCancelAvailable,
    documentsAiPreview,
    documentsAiPreviewBusy,
    documentsAiPreviewLabel,
    documentsAiProposalBusy,
    documentsAiUserInput,
    documentsAiWritingContext
  } from './documentsAiPanelState'
  import { buildLineDiff } from './lineDiff'

  type SourceField = { label: string; value: string; title?: string }
  type DocumentMetadata = DocumentSourceMetadata & { targetWordCount?: unknown }
  type AnnotationFilter = DocumentAnnotationStatus
  type InspectorSectionId = 'ai' | 'annotations' | 'versions' | 'metadata'
  type ProposalSourceStatus = { label: string; tone: 'ok' | 'warn' | 'neutral' }

  let annotationFilter = $state<AnnotationFilter>('active')
  let collapsedSections = $state<Record<InspectorSectionId, boolean>>({
    ai: false,
    annotations: true,
    versions: true,
    metadata: true
  })
  let editingAnnotationId = $state<string | null>(null)
  let editingAnnotationNote = $state('')
  let selectedVersionDiffId = $state<string | null>(null)
  const documentsRunSettings = aiRunSettingsForSurface('shell.documents')
  let activeAiProvider = $derived($aiProviders.find(provider => provider.providerId === $documentsRunSettings.providerId) ?? $aiProviders[0])
  let aiModelOptions = $derived(modelOptionsForProvider(activeAiProvider, $documentsRunSettings.model))
  let aiProviderReady = $derived(!activeAiProvider?.secretName || $aiSecretNames.includes(activeAiProvider.secretName))

  onMount(() => {
    void loadAiProviders()
  })

  function sectionOpen(id: InspectorSectionId): boolean {
    return !collapsedSections[id]
  }

  function toggleSection(id: InspectorSectionId): void {
    collapsedSections = { ...collapsedSections, [id]: !collapsedSections[id] }
  }

  function fmt(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  async function onKindChange(event: Event): Promise<void> {
    const doc = $activeDoc
    if (!doc) return

    if (doc.nodeType === 'folder') return

    const kind = documentKindFromValue((event.currentTarget as HTMLSelectElement).value)
    if (kind === doc.kind) return
    await updateDoc(doc.id, { kind })
  }

  async function onTitleChange(event: Event): Promise<void> {
    const doc = $activeDoc
    if (!doc) return

    const title = (event.currentTarget as HTMLInputElement).value.trim()
    if (!title || title === doc.title) return
    await updateDoc(doc.id, { title })
  }

  async function onIconChange(event: Event): Promise<void> {
    const doc = $activeDoc
    if (!doc) return

    const icon = (event.currentTarget as HTMLInputElement).value.trim()
    if (icon === (doc.icon ?? '')) return
    await updateDoc(doc.id, { icon: icon === '' ? null : icon })
  }

  function parseDocumentMetadata(metadataJson: string | null | undefined): DocumentMetadata | null {
    if (!metadataJson) return null
    try {
      const parsed = JSON.parse(metadataJson) as DocumentMetadata
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  }

  function field(label: string, value: unknown, title?: string): SourceField | null {
    if (value === undefined || value === null || value === '') return null
    return { label, value: String(value), title: title ?? String(value) }
  }

  function compact<T>(items: Array<T | null>): T[] {
    return items.filter((item): item is T => item !== null)
  }

  let documentMetadata = $derived(parseDocumentMetadata($activeDoc?.metadataJson))
  let targetWords = $derived(
    typeof documentMetadata?.targetWordCount === 'number' && Number.isFinite(documentMetadata.targetWordCount)
      ? Math.max(0, Math.floor(documentMetadata.targetWordCount))
      : null
  )
  let hasSourceMetadata = $derived(Boolean(documentMetadata && (
    documentMetadata.file ||
    documentMetadata.description ||
    documentMetadata.status ||
    documentMetadata.version ||
    documentMetadata.created ||
    documentMetadata.modified ||
    documentMetadata.author ||
    documentMetadata.word_count !== undefined ||
    (Array.isArray(documentMetadata.related) && documentMetadata.related.length > 0)
  )))
  let sourceFields = $derived(compact([
    field('Source file', documentMetadata?.file ?? $activeDoc?.sourcePath, $activeDoc?.sourcePath ?? documentMetadata?.file),
    field('Description', documentMetadata?.description),
    field('Status', documentMetadata?.status),
    field('Version', documentMetadata?.version),
    field('Source created', documentMetadata?.created),
    field('Source modified', documentMetadata?.modified),
    field('Author', documentMetadata?.author),
    field('Imported words', documentMetadata?.word_count),
    hasSourceMetadata ? field('Current words', countWords($editorContent)) : null
  ]))

  let docKindSelectOptions = $derived.by(() => {
    const current = $activeDoc?.kind ?? null
    const options = [
      { value: UNCATEGORIZED_KIND_VALUE, label: UNCATEGORIZED_KIND_LABEL },
      ...$documentKindOptions.map(option => ({ value: option.id, label: option.label }))
    ]
    if (current !== null && !options.some(option => option.value === current)) {
      options.push({ value: current, label: labelForDocumentKind(current, $documentKindOptions) })
    }
    for (const doc of $documents) {
      if (doc.kind !== null && !options.some(option => option.value === doc.kind)) {
        options.push({ value: doc.kind, label: labelForDocumentKind(doc.kind, $documentKindOptions) })
      }
    }
    return options
  })

  async function onTargetWordsChange(event: Event): Promise<void> {
    const doc = $activeDoc
    if (!doc || doc.nodeType === 'folder') return

    const value = (event.currentTarget as HTMLInputElement).value.trim()
    const targetWordCount = value === '' ? null : Number(value)
    if (targetWordCount !== null && !Number.isFinite(targetWordCount)) return
    if (targetWordCount === targetWords) return
    await updateDocMetadata(doc.id, { targetWordCount })
  }

  function parseAnnotationTarget(annotation: DocumentAnnotation): DocumentAnnotationTarget | null {
    try {
      const target = JSON.parse(annotation.targetJson) as Partial<DocumentAnnotationTarget>
      if (typeof target.exact === 'string') return target as DocumentAnnotationTarget
    } catch {
      return null
    }
    return null
  }

  let filteredAnnotations = $derived(
    $annotations.filter(annotation => annotation.status === annotationFilter && annotation.deletedAt === null)
  )
  let selectedVersionDiff = $derived($versions.find(version => version.id === selectedVersionDiffId) ?? null)
  let versionDiffRows = $derived(selectedVersionDiff ? buildLineDiff($editorContent, selectedVersionDiff.content) : [])
  let versionDiffChangedCount = $derived(versionDiffRows.filter(row => row.changed).length)
  let activePendingProposals = $derived($aiProposals.filter(proposal => proposal.status === 'pending'))
  let writingContextWords = $derived($documentsAiWritingContext?.selectedWordCount ?? 0)
  let selectedTextExcerpt = $derived(excerpt($documentsAiWritingContext?.writingVariables.selectedText ?? ''))
  let beforeExcerpt = $derived(excerpt($documentsAiWritingContext?.writingVariables.before ?? ''))
  let afterExcerpt = $derived(excerpt($documentsAiWritingContext?.writingVariables.after ?? ''))

  function excerpt(value: string, max = 180): string {
    const cleaned = value.replace(/\s+/g, ' ').trim()
    if (!cleaned) return 'No text captured.'
    return cleaned.length > max ? `${cleaned.slice(0, max - 3)}...` : cleaned
  }

  function exactMatchCount(content: string, needle: string): number {
    if (!needle) return 0
    let count = 0
    let index = content.indexOf(needle)
    while (index >= 0) {
      count += 1
      index = content.indexOf(needle, index + needle.length)
    }
    return count
  }

  function proposalSourceStatus(proposalType: AiProposalType, sourceText: string): ProposalSourceStatus {
    const source = sourceText.trim()
    if (!source) {
      return { label: 'No source snapshot', tone: 'neutral' }
    }

    if (proposalType === 'replacement') {
      const matches = exactMatchCount($editorContent, sourceText)
      if (matches === 1) return { label: 'Source verified', tone: 'ok' }
      if (matches > 1) return { label: 'Multiple source matches', tone: 'warn' }
      return { label: 'Source changed', tone: 'warn' }
    }

    return $editorContent === sourceText
      ? { label: 'Source snapshot unchanged', tone: 'ok' }
      : { label: 'Document changed since proposal', tone: 'neutral' }
  }

  function canApplyProposal(proposal: AiProposal): boolean {
    return proposal.status === 'pending'
      && proposal.proposalType === 'replacement'
      && proposal.sourceText.trim().length > 0
      && exactMatchCount($editorContent, proposal.sourceText) === 1
  }

  function dispatchAiPanelAction(detail: {
    type: 'preview' | 'run' | 'send-preview' | 'close-preview' | 'reject' | 'apply' | 'cancel'
    action?: DocumentsAiPromptAction
    proposal?: AiProposal
    proposalId?: string
  }): void {
    window.dispatchEvent(new CustomEvent('documents:ai-panel-action', { detail }))
  }

  async function copyProposalText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      addToast('info', 'Proposal copied.')
    } catch {
      addToast('warn', 'Proposal could not be copied.')
    }
  }

  function annotationExcerpt(annotation: DocumentAnnotation): string {
    const target = parseAnnotationTarget(annotation)
    return target?.exact || 'Original text unavailable'
  }

  function jumpToAnnotation(annotation: DocumentAnnotation): void {
    window.dispatchEvent(new CustomEvent('documents:jump-to-annotation', { detail: annotation.id }))
  }

  function startEditAnnotation(annotation: DocumentAnnotation): void {
    editingAnnotationId = annotation.id
    editingAnnotationNote = annotation.note
  }

  function cancelEditAnnotation(): void {
    editingAnnotationId = null
    editingAnnotationNote = ''
  }

  async function saveEditAnnotation(annotation: DocumentAnnotation): Promise<void> {
    const note = editingAnnotationNote.trim()
    if (!note) {
      addToast('warn', 'Comment note cannot be blank.')
      return
    }
    if (note !== annotation.note.trim()) {
      await updateAnnotation(annotation.id, { note })
      addToast('info', 'Comment updated.')
    }
    cancelEditAnnotation()
  }

  async function onResolveAnnotation(annotation: DocumentAnnotation): Promise<void> {
    await resolveAnnotation(annotation.id)
  }

  async function onReopenAnnotation(annotation: DocumentAnnotation): Promise<void> {
    await reopenAnnotation(annotation.id)
  }

  async function onDeleteAnnotation(annotation: DocumentAnnotation): Promise<void> {
    if (!window.confirm('Delete this annotation?')) return
    await deleteAnnotation(annotation.id)
  }

  async function restoreVersionAsCopy(version: DocVersion): Promise<void> {
    const title = window.prompt('Restored copy name', `${$activeDoc?.title ?? 'Document'} Restored`)
    if (title === null) return
    const restored = await restoreDocVersion(version.id, { mode: 'copy', title })
    addToast('info', `Restored ${restored.title}.`)
  }

  async function replaceCurrentWithVersion(version: DocVersion): Promise<void> {
    if (!window.confirm('Replace the current document with this snapshot? A safety snapshot will be created first.')) return
    await restoreDocVersion(version.id, { mode: 'replace' })
    addToast('info', 'Document replaced from snapshot.')
  }

  function toggleVersionDiff(version: DocVersion): void {
    selectedVersionDiffId = selectedVersionDiffId === version.id ? null : version.id
  }
</script>

<div class="inspector-view">
  {#if $activeDoc}
    <section class="section">
      <button
        type="button"
        class="section-header section-toggle"
        aria-expanded={sectionOpen('ai')}
        aria-controls="documents-inspector-ai"
        onclick={() => toggleSection('ai')}
      >
        <span class="section-title">AI</span>
        <span class="section-meta">{activePendingProposals.length}</span>
        <span class="section-chevron" aria-hidden="true">{sectionOpen('ai') ? '^' : 'v'}</span>
      </button>
      {#if sectionOpen('ai')}
        <div id="documents-inspector-ai" class="section-body ai-panel">
          <label class="ai-input-label" for="documents-ai-user-input">Instruction</label>
          <input
            id="documents-ai-user-input"
            class="ai-user-input"
            type="text"
            bind:value={$documentsAiUserInput}
            placeholder="Optional direction for this AI request"
            data-capture-documents-ai-user-input
          />

          <div class="ai-action-grid" aria-label="AI writing actions">
            <button
              type="button"
              class="ai-action-btn"
              disabled={$documentsAiProposalBusy || $documentsAiPreviewBusy || writingContextWords === 0}
              onclick={() => dispatchAiPanelAction({ type: 'run', action: 'rewrite-selection' })}
            >Rewrite</button>
            <button
              type="button"
              class="ai-action-btn"
              disabled={$documentsAiProposalBusy || $documentsAiPreviewBusy}
              onclick={() => dispatchAiPanelAction({ type: 'run', action: 'continue-from-cursor' })}
            >Continue</button>
            <button
              type="button"
              class="ai-action-btn"
              disabled={$documentsAiProposalBusy || $documentsAiPreviewBusy}
              onclick={() => dispatchAiPanelAction({ type: 'run', action: 'summarize-active-document' })}
            >Summary</button>
          </div>

          <details class="ai-disclosure">
            <summary>
              <span>Model for document AI</span>
              <span>{activeAiProvider?.providerName ?? 'AI'} / {$documentsRunSettings.model}</span>
            </summary>
            <div class="ai-model-grid">
              <label>
                <span>Provider</span>
                <select
                  class="ai-select"
                  value={$documentsRunSettings.providerId}
                  onchange={(event) => void selectAiSurfaceProvider('shell.documents', event.currentTarget.value)}
                >
                  {#each $aiProviders as provider (provider.providerId)}
                    <option value={provider.providerId}>{provider.providerName}</option>
                  {/each}
                </select>
              </label>
              <label>
                <span>Model</span>
                <select
                  class="ai-select"
                  value={$documentsRunSettings.model}
                  onchange={(event) => selectAiSurfaceModel('shell.documents', event.currentTarget.value)}
                >
                  {#each aiModelOptions as model (model)}
                    <option value={model}>{model}</option>
                  {/each}
                </select>
              </label>
              <label>
                <span>Temperature {$documentsRunSettings.temperature.toFixed(1)}</span>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={$documentsRunSettings.temperature}
                  oninput={(event) => selectAiSurfaceTemperature('shell.documents', Number(event.currentTarget.value))}
                />
              </label>
              <div class="ai-provider-status" class:ready={aiProviderReady} class:error={!aiProviderReady}>
                {$documentsRunSettings.providerId === 'mock-local' ? 'Mock mode' : aiProviderReady ? 'Live ready' : `Missing ${activeAiProvider?.secretName ?? 'secret'}`}
              </div>
            </div>
          </details>

          <details class="ai-disclosure">
            <summary>
              <span>Preview prompt before sending</span>
              <span>Advanced</span>
            </summary>
            <div class="ai-action-grid" aria-label="AI preview actions">
              <button
                type="button"
                class="ai-action-btn ghost"
                disabled={$documentsAiProposalBusy || $documentsAiPreviewBusy || writingContextWords === 0}
                onclick={() => dispatchAiPanelAction({ type: 'preview', action: 'rewrite-selection' })}
              >Preview rewrite</button>
              <button
                type="button"
                class="ai-action-btn ghost"
                disabled={$documentsAiProposalBusy || $documentsAiPreviewBusy}
                onclick={() => dispatchAiPanelAction({ type: 'preview', action: 'continue-from-cursor' })}
              >Preview continue</button>
              <button
                type="button"
                class="ai-action-btn ghost"
                disabled={$documentsAiProposalBusy || $documentsAiPreviewBusy}
                onclick={() => dispatchAiPanelAction({ type: 'preview', action: 'summarize-active-document' })}
              >Preview summary</button>
            </div>
          </details>

          <details class="ai-disclosure">
            <summary>
              <span>Review shared context</span>
              <span>Context</span>
            </summary>
            <AiContextPicker />
          </details>

          {#if $documentsAiCancelAvailable}
            <div class="ai-inline-actions">
              <button
                type="button"
                class="ai-action-btn danger"
                data-capture-documents-ai-cancel
                onclick={() => dispatchAiPanelAction({ type: 'cancel' })}
              >Cancel run</button>
            </div>
          {/if}

          {#if $documentsAiPreview}
            <div class="ai-inline-actions">
              <button
                type="button"
                class="ai-action-btn"
                disabled={$documentsAiProposalBusy || $documentsAiPreviewBusy}
                onclick={() => dispatchAiPanelAction({ type: 'send-preview' })}
              >Send preview</button>
              <button type="button" class="ai-action-btn ghost" onclick={() => dispatchAiPanelAction({ type: 'close-preview' })}>Close</button>
            </div>
          {/if}

          {#if activePendingProposals.length > 0}
            <div class="proposal-panel" data-capture-documents-ai-proposals>
              <div class="proposal-heading">
                <span>Pending proposals</span>
                <span>{activePendingProposals.length}</span>
              </div>
              <div class="proposal-list">
                {#each activePendingProposals as proposal (proposal.id)}
                  {@const sourceStatus = proposalSourceStatus(proposal.proposalType, proposal.sourceText)}
                  <article class="proposal-row">
                    <header>
                      <span>{proposal.proposalType}</span>
                      <span class="source-status" class:ok={sourceStatus.tone === 'ok'} class:warn={sourceStatus.tone === 'warn'}>
                        {sourceStatus.label}
                      </span>
                    </header>
                    <time datetime={proposal.createdAt}>{fmt(proposal.createdAt)}</time>
                    <pre>{proposal.proposedText}</pre>
                    <div class="proposal-actions">
                      {#if canApplyProposal(proposal)}
                        <button
                          type="button"
                          class="ai-action-btn"
                          disabled={$documentsAiProposalBusy}
                          onclick={() => dispatchAiPanelAction({ type: 'apply', proposal })}
                        >Apply</button>
                      {/if}
                      <button type="button" class="ai-action-btn" onclick={() => void copyProposalText(proposal.proposedText)}>Copy</button>
                      <button
                        type="button"
                        class="ai-action-btn ghost"
                        disabled={$documentsAiProposalBusy}
                        onclick={() => dispatchAiPanelAction({ type: 'reject', proposalId: proposal.id })}
                      >Reject</button>
                    </div>
                  </article>
                {/each}
              </div>
            </div>
          {/if}

          {#if $documentsAiPreview}
            <div class="ai-preview-result" data-capture-documents-ai-preview>
              <div class="preview-heading">
                <span>{$documentsAiPreviewLabel}</span>
                <span>{$documentsAiPreview.providerId} / {$documentsAiPreview.model} / ~{$documentsAiPreview.tokenEstimate} tok / not sent</span>
              </div>
              <details class="ai-disclosure">
                <summary>
                  <span>Captured variables and rendered prompt</span>
                  <span>Audit</span>
                </summary>
                <div class="variable-preview-grid" aria-label="Captured AI variables">
                  <div>
                    <span>selected_text</span>
                    <p>{selectedTextExcerpt}</p>
                  </div>
                  <div>
                    <span>before</span>
                    <p>{beforeExcerpt}</p>
                  </div>
                  <div>
                    <span>after</span>
                    <p>{afterExcerpt}</p>
                  </div>
                  <div>
                    <span>selected_documents</span>
                    <p>{$documentsAiPreview.includedTitles.length > 0 ? $documentsAiPreview.includedTitles.join(', ') : 'No context documents included.'}</p>
                  </div>
                </div>
                <pre class="rendered-prompt">{$documentsAiPreview.renderedPrompt}</pre>
              </details>
            </div>
          {/if}
        </div>
      {/if}
    </section>

    <section class="section">
      <button
        type="button"
        class="section-header section-toggle"
        aria-expanded={sectionOpen('annotations')}
        aria-controls="documents-inspector-annotations"
        onclick={() => toggleSection('annotations')}
      >
        <span class="section-title">Annotations</span>
        <span class="section-meta">{$annotations.filter(annotation => annotation.deletedAt === null).length}</span>
        <span class="section-chevron" aria-hidden="true">{sectionOpen('annotations') ? '^' : 'v'}</span>
      </button>
      {#if sectionOpen('annotations')}
        <div id="documents-inspector-annotations">
          <div class="annotation-tabs" role="tablist" aria-label="Annotation filters">
            <button type="button" class:active={annotationFilter === 'active'} onclick={() => (annotationFilter = 'active')}>Active</button>
            <button type="button" class:active={annotationFilter === 'resolved'} onclick={() => (annotationFilter = 'resolved')}>Resolved</button>
            <button type="button" class:active={annotationFilter === 'orphaned'} onclick={() => (annotationFilter = 'orphaned')}>Orphaned</button>
          </div>
          <div class="section-body">
            {#if filteredAnnotations.length === 0}
              <p class="empty-text">No {annotationFilter} annotations.</p>
            {:else}
              <ul class="annotation-list" aria-label="Annotations">
                {#each filteredAnnotations as annotation (annotation.id)}
                  <li class="annotation-item" class:orphaned={annotation.status === 'orphaned'}>
                    <button
                      type="button"
                      class="annotation-target"
                      disabled={annotation.status === 'orphaned'}
                      onclick={() => jumpToAnnotation(annotation)}
                    >
                      {annotationExcerpt(annotation)}
                    </button>
                    {#if editingAnnotationId === annotation.id}
                      <label class="annotation-edit-label" for={`annotation-note-${annotation.id}`}>Comment note</label>
                      <textarea
                        id={`annotation-note-${annotation.id}`}
                        class="annotation-note-input"
                        bind:value={editingAnnotationNote}
                        rows="4"
                        onkeydown={(event) => {
                          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                            event.preventDefault()
                            void saveEditAnnotation(annotation)
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault()
                            cancelEditAnnotation()
                          }
                        }}
                      ></textarea>
                    {:else}
                      <p class="annotation-note">{annotation.note}</p>
                    {/if}
                    <div class="annotation-actions">
                      {#if editingAnnotationId === annotation.id}
                        <button type="button" class="mini-btn" onclick={() => void saveEditAnnotation(annotation)}>Save</button>
                        <button type="button" class="mini-btn" onclick={cancelEditAnnotation}>Cancel</button>
                      {:else}
                        <button type="button" class="mini-btn" onclick={() => startEditAnnotation(annotation)}>Edit</button>
                        {#if annotation.status === 'resolved'}
                          <button type="button" class="mini-btn" onclick={() => void onReopenAnnotation(annotation)}>Reopen</button>
                        {:else}
                          <button type="button" class="mini-btn" onclick={() => void onResolveAnnotation(annotation)}>Resolve</button>
                        {/if}
                        <button type="button" class="mini-btn danger" onclick={() => void onDeleteAnnotation(annotation)}>Delete</button>
                      {/if}
                    </div>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </div>
      {/if}
    </section>

    <section class="section">
      <button
        type="button"
        class="section-header section-toggle"
        aria-expanded={sectionOpen('versions')}
        aria-controls="documents-inspector-versions"
        onclick={() => toggleSection('versions')}
      >
        <span class="section-title">Version History</span>
        <span class="section-meta">{$versions.length}</span>
        <span class="section-chevron" aria-hidden="true">{sectionOpen('versions') ? '^' : 'v'}</span>
      </button>
      {#if sectionOpen('versions')}
        <div id="documents-inspector-versions" class="section-body">
          {#if $versions.length === 0}
            <p class="empty-text">No snapshots yet. Earlier saved text will appear here after this document changes.</p>
          {:else}
            <ul class="version-list" aria-label="Version history">
              {#each $versions as v (v.id)}
                <li class="version-item">
                  <span class="v-date">{fmt(v.createdAt)}</span>
                  {#if v.label}<span class="v-label">{v.label}</span>{/if}
                  <div class="version-actions">
                    <button
                      type="button"
                      class="mini-btn"
                      class:active={selectedVersionDiffId === v.id}
                      data-capture-version-diff
                      onclick={() => toggleVersionDiff(v)}
                    >
                      {selectedVersionDiffId === v.id ? 'Hide Diff' : 'Diff'}
                    </button>
                    <button type="button" class="mini-btn" onclick={() => void restoreVersionAsCopy(v)}>Copy</button>
                    <button type="button" class="mini-btn danger" onclick={() => void replaceCurrentWithVersion(v)}>Replace</button>
                  </div>
                  {#if selectedVersionDiffId === v.id}
                    <div class="version-diff" aria-label="Version snapshot diff" data-capture-version-diff-panel>
                      <header class="version-diff-summary">
                        <span>{versionDiffChangedCount === 0 ? 'No changed lines' : `${versionDiffChangedCount} changed line${versionDiffChangedCount === 1 ? '' : 's'}`}</span>
                        <button type="button" class="mini-btn" onclick={() => (selectedVersionDiffId = null)}>Close</button>
                      </header>
                      <div class="version-diff-header">
                        <span>Current</span>
                        <span>Snapshot</span>
                      </div>
                      <div class="version-diff-rows">
                        {#each versionDiffRows as row (row.index)}
                          <div class="version-diff-row" class:changed={row.changed}>
                            <pre>{row.left || ' '}</pre>
                            <pre>{row.right || ' '}</pre>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    </section>

    <section class="section">
      <button
        type="button"
        class="section-header section-toggle"
        aria-expanded={sectionOpen('metadata')}
        aria-controls="documents-inspector-metadata"
        onclick={() => toggleSection('metadata')}
      >
        <span class="section-title">Metadata</span>
        <span class="section-chevron" aria-hidden="true">{sectionOpen('metadata') ? '^' : 'v'}</span>
      </button>
      {#if sectionOpen('metadata')}
      <div id="documents-inspector-metadata" class="section-body">
        <div class="field">
          <label class="label" for="document-title">Title</label>
          <input
            id="document-title"
            class="text-input"
            type="text"
            value={$activeDoc.title}
            onchange={onTitleChange}
          />
        </div>
        <div class="field">
          <span class="label">Type</span>
          <span class="value">{$activeDoc.nodeType === 'folder' ? 'Folder' : 'Document'}</span>
        </div>
        {#if $activeDoc.nodeType === 'document'}
          <div class="field">
            <label class="label" for="document-kind">Kind</label>
            <select id="document-kind" class="kind-select" value={documentKindValue($activeDoc.kind)} onchange={onKindChange}>
              {#each docKindSelectOptions as option (option.value)}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>
        {:else}
          <div class="field">
            <span class="label">Kind</span>
            <span class="value">Not applicable</span>
          </div>
        {/if}
        <div class="field">
          <label class="label" for="document-icon">Icon</label>
          <input
            id="document-icon"
            class="icon-input"
            type="text"
            maxlength="8"
            value={$activeDoc.icon ?? ''}
            placeholder={$activeDoc.nodeType === 'folder' ? '📁' : '📄'}
            onchange={onIconChange}
          />
        </div>
        <div class="field">
          <span class="label">Words</span>
          <span class="value">{countWords($editorContent)}</span>
        </div>
        {#if $activeDoc.nodeType === 'document'}
          <div class="field">
            <label class="label" for="document-target-words">Target words</label>
            <input
              id="document-target-words"
              class="number-input"
              type="number"
              min="0"
              step="1"
              value={targetWords ?? ''}
              placeholder="None"
              onchange={onTargetWordsChange}
              onkeydown={(event) => {
                if (event.key === 'Enter') void onTargetWordsChange(event)
              }}
            />
          </div>
        {/if}
        <div class="field">
          <span class="label">Format</span>
          <span class="value">{$activeDoc.contentFormat}</span>
        </div>
        <div class="field">
          <span class="label">Created</span>
          <span class="value">{fmt($activeDoc.createdAt)}</span>
        </div>
        <div class="field">
          <span class="label">Updated</span>
          <span class="value">{fmt($activeDoc.updatedAt)}</span>
        </div>

        {#if hasSourceMetadata}
          <div class="metadata-subheader">
            <span class="section-title">Source Metadata</span>
            <span class="readonly-badge">Read-only</span>
          </div>
          {#each sourceFields as item (item.label)}
            <div class="field">
              <span class="label">{item.label}</span>
              <span class="value" title={item.title}>{item.value}</span>
            </div>
          {/each}
          {#if documentMetadata?.related && documentMetadata.related.length > 0}
            <div class="field stacked">
              <span class="label">Related</span>
              <ul class="related-list" aria-label="Related source paths">
                {#each documentMetadata.related as relatedPath (relatedPath)}
                  <li title={relatedPath}>{relatedPath}</li>
                {/each}
              </ul>
            </div>
          {/if}
        {/if}
      </div>
      {/if}
    </section>
  {:else}
    <div class="empty inspector-empty">
      <h3>No document selected</h3>
      <p>Open a chapter or scene to review AI actions, annotations, version history, and metadata here.</p>
      <p class="empty-hint">On narrow windows, use the inspector button in the toolbar to bring this panel back.</p>
    </div>
  {/if}
</div>

<style>
  .inspector-view {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .section {
    border-bottom: 1px solid color-mix(in srgb, var(--accent-inspector) 18%, var(--color-border));
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    width: 100%;
    min-height: 36px;
    padding: var(--space-3) var(--space-4);
    text-align: left;
    color: inherit;
  }

  .section-toggle {
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .section-toggle:hover {
    background: color-mix(in srgb, var(--accent-inspector) 8%, transparent);
  }

  .section-toggle:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: -2px;
  }

  .section-title {
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--accent-inspector) 62%, var(--color-fg-muted));
    margin: 0;
  }

  .section-meta {
    margin-left: auto;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .section-chevron {
    color: var(--color-fg-muted);
    font-size: var(--font-size-sm);
    line-height: 1;
  }

  .readonly-badge {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
  }

  .section-body {
    padding: var(--space-2) var(--space-4) var(--space-4);
  }

  .field {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-3);
    padding: 4px 0;
    font-size: var(--font-size-sm);
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 36%, transparent);
  }

  .field:last-child {
    border-bottom: none;
  }

  .field.stacked {
    display: grid;
    justify-content: stretch;
    align-items: start;
    gap: var(--space-2);
  }

  .metadata-subheader {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-4) 0 var(--space-2);
  }

  .label {
    color: var(--color-fg-muted);
    flex-shrink: 0;
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
  }

  .value {
    color: var(--color-fg-secondary);
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .related-list {
    list-style: none;
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .related-list li {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    text-align: right;
  }

  .kind-select,
  .text-input,
  .icon-input,
  .number-input {
    min-width: 110px;
    max-width: 150px;
    padding: 2px var(--space-2);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 24%, var(--color-border));
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-shell-main) 48%, transparent);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-sm);
    text-align: right;
  }

  .icon-input {
    width: 110px;
  }

  .number-input {
    width: 110px;
  }

  .text-input {
    width: 150px;
  }

  .kind-select:focus-visible,
  .text-input:focus-visible,
  .icon-input:focus-visible,
  .number-input:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
  }

  .kind-select option {
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
  }

  .ai-panel {
    display: grid;
    gap: var(--space-2);
  }

  .ai-input-label {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
  }

  .ai-user-input {
    width: 100%;
    height: 28px;
    min-width: 0;
    padding: 0 var(--space-2);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 24%, var(--color-border));
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-shell-main) 54%, transparent);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-sm);
  }

  .ai-user-input:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
  }

  .ai-action-grid,
  .ai-inline-actions,
  .proposal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .ai-disclosure {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-2);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 14%, var(--color-border));
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-shell-main) 34%, transparent);
  }

  .ai-disclosure summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    color: var(--color-fg-secondary);
    cursor: pointer;
    font-size: var(--font-size-xs);
    font-weight: 700;
    list-style: none;
  }

  .ai-disclosure summary::-webkit-details-marker {
    display: none;
  }

  .ai-disclosure summary span:last-child {
    color: color-mix(in srgb, var(--accent-inspector) 58%, var(--color-fg-muted));
    text-transform: uppercase;
  }

  .ai-model-grid {
    display: grid;
    gap: var(--space-2);
  }

  .ai-model-grid label {
    display: grid;
    gap: var(--space-1);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .ai-select {
    width: 100%;
    min-width: 0;
    height: 28px;
    padding: 0 var(--space-2);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-base);
    color: var(--color-fg-primary);
    font-size: var(--font-size-xs);
  }

  .ai-select:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
  }

  .ai-provider-status {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .ai-provider-status.ready {
    color: var(--color-success);
  }

  .ai-provider-status.error {
    color: var(--color-danger);
  }

  .ai-action-btn {
    min-height: 26px;
    padding: 0 var(--space-2);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 24%, var(--color-border));
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--accent-inspector) 12%, transparent);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .ai-action-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent-inspector) 18%, transparent);
    color: var(--color-fg-primary);
  }

  .ai-action-btn.ghost {
    background: transparent;
  }

  .ai-action-btn.danger {
    color: color-mix(in srgb, #e06c75 72%, var(--color-fg-secondary));
    border-color: color-mix(in srgb, #e06c75 36%, var(--color-border));
  }

  .ai-action-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .proposal-panel,
  .proposal-list,
  .proposal-row,
  .ai-preview-result {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .proposal-heading,
  .proposal-row header,
  .preview-heading {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    min-width: 0;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
  }

  .proposal-list {
    max-height: 280px;
    overflow: auto;
  }

  .proposal-row {
    padding: var(--space-2) var(--space-3);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 18%, var(--color-border));
    border-left: 3px solid var(--accent-inspector);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-shell-main) 40%, transparent);
  }

  .proposal-row time {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }

  .source-status {
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-fg-muted) 12%, transparent);
    color: var(--color-fg-muted);
    white-space: nowrap;
  }

  .source-status.ok {
    background: color-mix(in srgb, #22c55e 16%, transparent);
    color: color-mix(in srgb, #22c55e 70%, var(--color-fg-primary));
  }

  .source-status.warn {
    background: color-mix(in srgb, #f7c948 18%, transparent);
    color: color-mix(in srgb, #f7c948 68%, var(--color-fg-primary));
  }

  .proposal-row pre,
  .rendered-prompt {
    margin: 0;
    overflow: auto;
    color: var(--color-fg-secondary);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    line-height: 1.45;
    white-space: pre-wrap;
  }

  .proposal-row pre {
    max-height: 140px;
  }

  .ai-preview-result {
    max-height: 420px;
    overflow: auto;
  }

  .variable-preview-grid {
    display: grid;
    gap: var(--space-2);
  }

  .variable-preview-grid div {
    min-width: 0;
    padding: var(--space-2);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 16%, var(--color-border));
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-panel-glint) 22%, transparent);
  }

  .variable-preview-grid span {
    color: color-mix(in srgb, var(--accent-inspector) 70%, var(--color-fg-muted));
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .variable-preview-grid p {
    min-width: 0;
    max-height: 70px;
    margin: 3px 0 0;
    overflow: hidden;
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    line-height: 1.35;
  }

  .rendered-prompt {
    max-height: 220px;
    padding: var(--space-3);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 16%, var(--color-border));
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-shell-main) 82%, black);
  }

  .empty-text {
    font-size: var(--font-size-sm);
    color: var(--color-fg-muted);
    line-height: 1.55;
  }

  .version-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .version-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-2) var(--space-3);
    background: color-mix(in srgb, var(--color-shell-main) 40%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 18%, var(--color-border));
    border-left: 3px solid var(--accent-inspector);
    border-radius: var(--radius-md);
  }

  .v-date  { font-size: var(--font-size-xs); color: var(--color-fg-secondary); }
  .v-label { font-size: var(--font-size-xs); color: var(--color-fg-muted); font-style: italic; }

  .version-actions,
  .annotation-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .mini-btn {
    height: 24px;
    padding: 0 var(--space-2);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 20%, var(--color-border));
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .mini-btn:hover:not(:disabled) {
    background: var(--color-hover);
    color: var(--color-fg-primary);
  }

  .mini-btn.active {
    background: color-mix(in srgb, var(--accent-inspector) 14%, transparent);
    color: var(--color-fg-primary);
    border-color: color-mix(in srgb, var(--accent-inspector) 48%, var(--color-border));
  }

  .mini-btn.danger {
    color: color-mix(in srgb, #e06c75 70%, var(--color-fg-secondary));
  }

  .version-diff {
    min-width: 0;
    margin-top: var(--space-2);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 20%, var(--color-border));
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: color-mix(in srgb, var(--color-shell-main) 54%, transparent);
  }

  .version-diff-summary {
    min-height: 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border-bottom: var(--border-subtle);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .version-diff-header,
  .version-diff-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .version-diff-header {
    border-bottom: var(--border-subtle);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .version-diff-header span {
    min-width: 0;
    padding: var(--space-1) var(--space-2);
    border-right: var(--border-subtle);
  }

  .version-diff-header span:last-child {
    border-right: none;
  }

  .version-diff-rows {
    max-height: 260px;
    overflow: auto;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  .version-diff-row {
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 34%, transparent);
  }

  .version-diff-row.changed {
    background: color-mix(in srgb, var(--accent-inspector) 12%, transparent);
  }

  .version-diff-row pre {
    min-width: 0;
    margin: 0;
    padding: 6px var(--space-2);
    border-right: var(--border-subtle);
    color: var(--color-fg-secondary);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .version-diff-row pre:last-child {
    border-right: none;
  }

  .annotation-tabs {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-4) 0;
  }

  .annotation-tabs button {
    height: 24px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .annotation-tabs button.active {
    background: color-mix(in srgb, var(--accent-inspector) 18%, transparent);
    color: var(--color-fg-primary);
  }

  .annotation-list {
    list-style: none;
    display: grid;
    gap: var(--space-2);
  }

  .annotation-item {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: color-mix(in srgb, var(--color-shell-main) 40%, transparent);
    border: 1px solid color-mix(in srgb, #f7c948 24%, var(--color-border));
    border-left: 3px solid #f7c948;
    border-radius: var(--radius-md);
  }

  .annotation-item.orphaned {
    border-color: color-mix(in srgb, var(--color-fg-muted) 22%, var(--color-border));
    border-left-color: var(--color-fg-muted);
  }

  .annotation-target {
    min-width: 0;
    padding: 0;
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .annotation-target:disabled {
    color: var(--color-fg-muted);
    cursor: default;
  }

  .annotation-note {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    line-height: 1.45;
  }

  .annotation-edit-label {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
  }

  .annotation-note-input {
    width: 100%;
    min-height: 74px;
    resize: vertical;
    padding: var(--space-2);
    border: 1px solid color-mix(in srgb, #f7c948 34%, var(--color-border));
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-shell-main) 54%, transparent);
    color: var(--color-fg-secondary);
    font-family: var(--font-sans);
    font-size: var(--font-size-xs);
    line-height: 1.45;
  }

  .annotation-note-input:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
  }

  .empty {
    padding: var(--space-4);
    font-size: var(--font-size-sm);
    color: var(--color-fg-muted);
  }

  .inspector-empty {
    display: grid;
    gap: var(--space-2);
    line-height: 1.45;
  }

  .inspector-empty h3 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: var(--font-size-sm);
  }

  .inspector-empty p {
    margin: 0;
  }

  .empty-hint {
    color: color-mix(in srgb, var(--color-fg-muted) 78%, transparent);
    font-size: var(--font-size-xs);
  }
</style>
