<!-- Table View InspectorView — row detail -->
<script lang="ts">
  import { countWords } from '../../store'
  import { labelForDocumentKind, STRUCTURAL_FOLDER_KIND_LABEL } from '@shared/document-kinds'
  import { documentKindOptions } from '../../store'
  import { selectedTableDoc } from './state'

  function fmt(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  let doc = $derived($selectedTableDoc)
  let kindLabel = $derived(doc
    ? doc.nodeType === 'folder'
      ? STRUCTURAL_FOLDER_KIND_LABEL
      : labelForDocumentKind(doc.kind, $documentKindOptions)
    : '')
</script>

<div class="inspector-view">
  <section class="section">
    <h3 class="section-title">Row Detail</h3>
    {#if doc}
      <div class="meta-grid">
        <span class="meta-label">Title</span><span class="meta-value">{doc.title}</span>
        <span class="meta-label">Kind</span><span class="meta-value">{kindLabel}</span>
        <span class="meta-label">Words</span><span class="meta-value">{countWords(doc.content)}</span>
        <span class="meta-label">Created</span><span class="meta-value">{fmt(doc.createdAt)}</span>
        <span class="meta-label">Updated</span><span class="meta-value">{fmt(doc.updatedAt)}</span>
      </div>
    {:else}
      <p class="hint">Select a row in the table to view details.</p>
    {/if}
  </section>
</div>

<style>
  .inspector-view { padding: var(--space-4); }
  .section { margin-bottom: var(--space-5); }
  .section-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); margin-bottom: var(--space-3); }
  .hint { font-size: var(--font-size-sm); color: var(--color-fg-muted); }
  .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--space-1) var(--space-3); font-size: var(--font-size-sm); }
  .meta-label { color: var(--color-fg-muted); }
  .meta-value { color: var(--color-fg-secondary); text-align: right; overflow: hidden; text-overflow: ellipsis; }
</style>
