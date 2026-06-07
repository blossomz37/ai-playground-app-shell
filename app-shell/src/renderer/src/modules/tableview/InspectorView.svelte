<!-- Table View InspectorView — row detail -->
<script lang="ts">
  import { countWords } from '../../store'
  import { labelForDocumentKind, STRUCTURAL_FOLDER_KIND_LABEL } from '@shared/document-kinds'
  import { documentKindOptions } from '../../store'
  import { selectedTableDoc, tableDocuments } from './state'
  import type { Doc } from '@shared/module-contract'

  function fmt(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  let doc = $derived($selectedTableDoc)
  let folderPath = $derived(doc?.nodeType === 'document' ? parentFolderPath(doc, $tableDocuments) : '')
  let kindLabel = $derived(doc
    ? doc.nodeType === 'folder'
      ? STRUCTURAL_FOLDER_KIND_LABEL
      : labelForDocumentKind(doc.kind, $documentKindOptions)
    : '')

  function parentFolderPath(doc: Doc, documents: Doc[]): string {
    if (!doc.parentId) return 'Workspace root'

    const docsById = new Map(documents.map(item => [item.id, item]))
    const segments: string[] = []
    let parentId: string | null = doc.parentId
    const seen: string[] = []
    while (parentId) {
      if (seen.includes(parentId)) break
      seen.push(parentId)
      const parent = docsById.get(parentId)
      if (!parent) break
      segments.unshift(parent.title)
      parentId = parent.parentId
    }
    return segments.length ? segments.join('/') : 'Unknown folder'
  }
</script>

<div class="inspector-view">
  <section class="section">
    <h3 class="section-title">Row Detail</h3>
    {#if doc}
      <div class="meta-grid">
        <span class="meta-label">Title</span><span class="meta-value">{doc.title}</span>
        <span class="meta-label">Kind</span><span class="meta-value">{kindLabel}</span>
        {#if doc.nodeType === 'document'}
          <span class="meta-label">Folder</span><span class="meta-value path-value" title={folderPath}>{folderPath}</span>
        {/if}
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
  .path-value {
    overflow-wrap: anywhere;
    white-space: normal;
  }
</style>
