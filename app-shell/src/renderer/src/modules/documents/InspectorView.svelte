<script lang="ts">
  import type { DocumentAnnotation, DocumentAnnotationStatus, DocumentAnnotationTarget, DocumentSourceMetadata, DocVersion } from '@shared/module-contract'
  import { documentKindFromValue, documentKindValue, labelForDocumentKind, UNCATEGORIZED_KIND_LABEL, UNCATEGORIZED_KIND_VALUE } from '@shared/document-kinds'
  import {
    activeDoc, annotations, versions, editorContent, countWords, updateDoc, documents, documentKindOptions,
    updateDocMetadata, restoreDocVersion, updateAnnotation, resolveAnnotation, reopenAnnotation, deleteAnnotation
  } from '../../store'
  import { addToast } from '../../store/toasts'

  type SourceField = { label: string; value: string; title?: string }
  type DocumentMetadata = DocumentSourceMetadata & { targetWordCount?: unknown }
  type AnnotationFilter = DocumentAnnotationStatus

  let annotationFilter = $state<AnnotationFilter>('active')

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

  function annotationExcerpt(annotation: DocumentAnnotation): string {
    const target = parseAnnotationTarget(annotation)
    return target?.exact || 'Original text unavailable'
  }

  function jumpToAnnotation(annotation: DocumentAnnotation): void {
    window.dispatchEvent(new CustomEvent('documents:jump-to-annotation', { detail: annotation.id }))
  }

  async function editAnnotation(annotation: DocumentAnnotation): Promise<void> {
    const note = window.prompt('Annotation note', annotation.note)
    if (note === null || note.trim() === annotation.note.trim()) return
    await updateAnnotation(annotation.id, { note })
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
</script>

<div class="inspector-view">
  {#if $activeDoc}
    <section class="section">
      <div class="section-header">
        <h3 class="section-title">Document</h3>
      </div>
      <div class="section-body">
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
      </div>
    </section>

    {#if hasSourceMetadata}
      <section class="section">
        <div class="section-header">
          <h3 class="section-title">Source Metadata</h3>
          <span class="readonly-badge">Read-only</span>
        </div>
        <div class="section-body">
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
        </div>
      </section>
    {/if}

    <section class="section">
      <div class="section-header">
        <h3 class="section-title">Snapshots</h3>
      </div>
      <div class="section-body">
        {#if $versions.length === 0}
          <p class="empty-text">No snapshots yet. Earlier saved text will appear here after this document changes.</p>
        {:else}
          <ul class="version-list" aria-label="Snapshots">
            {#each $versions as v (v.id)}
              <li class="version-item">
                <span class="v-date">{fmt(v.createdAt)}</span>
                {#if v.label}<span class="v-label">{v.label}</span>{/if}
                <div class="version-actions">
                  <button type="button" class="mini-btn" onclick={() => void restoreVersionAsCopy(v)}>Copy</button>
                  <button type="button" class="mini-btn danger" onclick={() => void replaceCurrentWithVersion(v)}>Replace</button>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h3 class="section-title">Annotations</h3>
      </div>
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
                <p class="annotation-note">{annotation.note}</p>
                <div class="annotation-actions">
                  <button type="button" class="mini-btn" onclick={() => void editAnnotation(annotation)}>Edit</button>
                  {#if annotation.status === 'resolved'}
                    <button type="button" class="mini-btn" onclick={() => void onReopenAnnotation(annotation)}>Reopen</button>
                  {:else}
                    <button type="button" class="mini-btn" onclick={() => void onResolveAnnotation(annotation)}>Resolve</button>
                  {/if}
                  <button type="button" class="mini-btn danger" onclick={() => void onDeleteAnnotation(annotation)}>Delete</button>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </section>
  {:else}
    <div class="empty">Select a document to inspect.</div>
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
    padding: var(--space-3) var(--space-4) 0;
    text-align: left;
    color: inherit;
  }

  .section-title {
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--accent-inspector) 62%, var(--color-fg-muted));
    margin: 0;
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

  .mini-btn.danger {
    color: color-mix(in srgb, #e06c75 70%, var(--color-fg-secondary));
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

  .empty {
    padding: var(--space-4);
    font-size: var(--font-size-sm);
    color: var(--color-fg-muted);
  }
</style>
