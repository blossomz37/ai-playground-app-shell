<!-- Assets InspectorView — metadata panel -->
<script lang="ts">
  import type { AssetDocumentLink, AssetWorkspaceLink, Doc } from '@shared/module-contract'
  import { labelForDocumentKind, STRUCTURAL_FOLDER_KIND_LABEL } from '@shared/document-kinds'
  import { activeWorkspace, documents, documentKindOptions } from '../../store'
  import {
    addDocumentLink,
    addProjectLink,
    formatAssetBytes,
    primaryAssetMetadata,
    removeDocumentLink,
    removeProjectLink,
    renameAsset,
    selectedAsset,
    updateAssetDetails,
    updateDocumentLink,
    updateProjectLink
  } from './state'

  const PROJECT_ROLES = ['reference', 'cover', 'research', 'marketing', 'moodboard', 'other']
  const DOCUMENT_RELATIONS = ['reference', 'illustrates', 'source', 'cover', 'research', 'other']

  let asset = $derived($selectedAsset)
  let workspace = $derived($activeWorkspace)
  let documentQuery = $state('')
  let documentTypeaheadOpen = $state(false)
  let highlightedDocumentIndex = $state(0)
  let newDocumentRelation = $state('reference')

  let currentWorkspaceLinks = $derived(
    asset && workspace ? asset.workspaceLinks.filter(link => link.workspaceId === workspace.id) : []
  )

  let availableProjectRoles = $derived(
    PROJECT_ROLES.filter(role => !currentWorkspaceLinks.some(link => link.role === role))
  )

  let documentLookup = $derived.by(() =>
    new Map($documents.map(doc => [doc.id, doc]))
  )

  let linkedDocumentIds = $derived.by(() =>
    new Set(asset?.documentLinks.map(link => link.documentId) ?? [])
  )

  let documentCandidates = $derived.by(() => {
    const query = documentQuery.trim().toLowerCase()
    if (!query) return []
    return $documents
      .filter(doc => !doc.archivedAt && !linkedDocumentIds.has(doc.id))
      .filter(doc => `${documentKindLabel(doc)} ${doc.title}`.toLowerCase().includes(query))
      .slice(0, 7)
  })

  let showDocumentCandidates = $derived(documentTypeaheadOpen && documentCandidates.length > 0)

  async function saveLabel(value: string): Promise<void> {
    if (!asset) return
    const label = value.trim()
    if (!label || label === asset.label) return
    await renameAsset(asset.id, label)
  }

  async function saveComments(value: string): Promise<void> {
    if (!asset || value === asset.comments) return
    await updateAssetDetails(asset.id, { comments: value })
  }

  async function saveTags(value: string): Promise<void> {
    if (!asset) return
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean)
    if (tags.join('|') === asset.tags.join('|')) return
    await updateAssetDetails(asset.id, { tags })
  }

  async function addCurrentProjectLink(): Promise<void> {
    if (!asset || !workspace || availableProjectRoles.length === 0) return
    await addProjectLink(asset.id, workspace.id, availableProjectRoles[0])
  }

  async function changeProjectRole(link: AssetWorkspaceLink, nextRole: string): Promise<void> {
    if (!asset || link.role === nextRole) return
    await updateProjectLink(asset.id, link.workspaceId, link.role, nextRole)
  }

  async function unlinkProject(link: AssetWorkspaceLink): Promise<void> {
    if (!asset) return
    await removeProjectLink(asset.id, link.workspaceId, link.role)
  }

  async function changeDocumentRelation(link: AssetDocumentLink, nextRelationType: string): Promise<void> {
    if (!asset || link.relationType === nextRelationType) return
    await updateDocumentLink(asset.id, link.documentId, link.relationType, nextRelationType)
  }

  async function unlinkDocument(link: AssetDocumentLink): Promise<void> {
    if (!asset) return
    await removeDocumentLink(asset.id, link.documentId, link.relationType)
  }

  async function selectDocumentCandidate(doc: Doc): Promise<void> {
    if (!asset) return
    await addDocumentLink(asset.id, doc.id, newDocumentRelation)
    documentQuery = ''
    documentTypeaheadOpen = false
    highlightedDocumentIndex = 0
  }

  function onDocumentQueryInput(event: Event): void {
    documentQuery = event.currentTarget instanceof HTMLInputElement ? event.currentTarget.value : ''
    documentTypeaheadOpen = true
    highlightedDocumentIndex = 0
  }

  function onDocumentQueryFocus(): void {
    documentTypeaheadOpen = true
  }

  function onDocumentQueryKeydown(event: KeyboardEvent): void {
    if (!showDocumentCandidates && event.key !== 'Escape') return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      highlightedDocumentIndex = Math.min(highlightedDocumentIndex + 1, documentCandidates.length - 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      highlightedDocumentIndex = Math.max(highlightedDocumentIndex - 1, 0)
    } else if (event.key === 'Enter') {
      const candidate = documentCandidates[highlightedDocumentIndex]
      if (!candidate) return
      event.preventDefault()
      void selectDocumentCandidate(candidate)
    } else if (event.key === 'Escape') {
      documentTypeaheadOpen = false
    }
  }

  function roleOptions(currentRole: string): string[] {
    return PROJECT_ROLES.includes(currentRole) ? PROJECT_ROLES : [currentRole, ...PROJECT_ROLES]
  }

  function relationOptions(currentRelation: string): string[] {
    return DOCUMENT_RELATIONS.includes(currentRelation) ? DOCUMENT_RELATIONS : [currentRelation, ...DOCUMENT_RELATIONS]
  }

  function documentLabel(documentId: string): string {
    const doc = documentLookup.get(documentId)
    return doc ? `${documentKindLabel(doc)} - ${doc.title}` : documentId
  }

  function documentKindLabel(doc: Doc): string {
    return doc.nodeType === 'folder'
      ? STRUCTURAL_FOLDER_KIND_LABEL
      : labelForDocumentKind(doc.kind, $documentKindOptions)
  }
</script>

<div class="inspector-view">
  {#if asset}
    <section class="section">
      <h3 class="section-title">Asset Info</h3>
      <div class="meta-grid">
        <label class="meta-label" for="asset-label">Label</label>
        <input
          id="asset-label"
          class="field compact"
          aria-label="Asset label"
          value={asset.label}
          onblur={(event) => void saveLabel(event.currentTarget.value)}
        />
      </div>
    </section>

    <section class="section">
      <div class="section-row">
        <h3 class="section-title">Source & Technical</h3>
        <span class="readonly-badge">Read-only</span>
      </div>
      <div class="meta-grid">
        <span class="meta-label">Original</span><span class="meta-value">{asset.originalName}</span>
        <span class="meta-label">Media</span><span class="meta-value">{asset.mediaType}</span>
        <span class="meta-label">Extension</span><span class="meta-value">{asset.extension || 'None'}</span>
        <span class="meta-label">MIME</span><span class="meta-value">{asset.mimeType}</span>
        <span class="meta-label">Primary</span><span class="meta-value">{primaryAssetMetadata(asset)}</span>
        <span class="meta-label">Size</span><span class="meta-value">{formatAssetBytes(asset.sizeBytes)}</span>
        <span class="meta-label">Created</span><span class="meta-value">{asset.fileCreatedAt ?? 'Unknown'}</span>
        <span class="meta-label">Modified</span><span class="meta-value">{asset.fileModifiedAt ?? 'Unknown'}</span>
        <span class="meta-label">Imported</span><span class="meta-value">{asset.importedAt}</span>
        <span class="meta-label">Checksum</span><span class="meta-value checksum">{asset.checksum ?? 'Unknown'}</span>
        <span class="meta-label">Path</span><span class="meta-value path">{asset.filePath ?? 'Not imported'}</span>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">Tags</h3>
      <input
        class="field"
        aria-label="Asset tags"
        value={asset.tags.join(', ')}
        onblur={(event) => void saveTags(event.currentTarget.value)}
        placeholder="cover, reference, research"
      />
    </section>

    <section class="section">
      <h3 class="section-title">Comments</h3>
      <textarea
        class="comments"
        aria-label="Asset comments"
        value={asset.comments}
        onblur={(event) => void saveComments(event.currentTarget.value)}
        placeholder="Add notes about this asset"
      ></textarea>
    </section>

    <section class="section">
      <div class="section-row">
        <h3 class="section-title">Links</h3>
        <span class="readonly-badge">{currentWorkspaceLinks.length} project · {asset.documentLinks.length} document</span>
      </div>

      <div class="link-group">
        <div class="link-group-header">
          <span>Project</span>
          <button
            type="button"
            class="link-add"
            disabled={!workspace || availableProjectRoles.length === 0}
            onclick={() => void addCurrentProjectLink()}
          >+ Add project link</button>
        </div>

        {#if currentWorkspaceLinks.length > 0}
          <div class="link-list">
            {#each currentWorkspaceLinks as link (link.workspaceId + link.role)}
              <div class="link-row">
                <span class="link-target">{workspace?.name ?? 'Current project'}</span>
                <select
                  class="link-select"
                  aria-label="Project link role"
                  value={link.role}
                  onchange={(event) => void changeProjectRole(link, event.currentTarget.value)}
                >
                  {#each roleOptions(link.role) as role (role)}
                    <option value={role}>{role}</option>
                  {/each}
                </select>
                <button type="button" class="link-remove" aria-label="Remove project link" onclick={() => void unlinkProject(link)}>×</button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="link-group">
        <div class="link-group-header">
          <span>Documents</span>
          <select class="link-select compact-select" aria-label="New document link relation" bind:value={newDocumentRelation}>
            {#each DOCUMENT_RELATIONS as relation (relation)}
              <option value={relation}>{relation}</option>
            {/each}
          </select>
        </div>

        <div class="typeahead">
          <input
            class="field"
            aria-label="Add document link"
            aria-autocomplete="list"
            aria-expanded={showDocumentCandidates}
            placeholder="+ Add document link"
            value={documentQuery}
            data-capture-document-typeahead
            oninput={onDocumentQueryInput}
            onfocus={onDocumentQueryFocus}
            onkeydown={onDocumentQueryKeydown}
          />
          {#if showDocumentCandidates}
            <div class="typeahead-results" role="listbox">
              {#each documentCandidates as doc, index (doc.id)}
                <button
                  type="button"
                  role="option"
                  class="typeahead-result"
                  class:active={index === highlightedDocumentIndex}
                  aria-selected={index === highlightedDocumentIndex}
                  onclick={() => void selectDocumentCandidate(doc)}
                >
                  <span>{documentKindLabel(doc)} - {doc.title}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        {#if asset.documentLinks.length > 0}
          <div class="link-list document-link-list">
            {#each asset.documentLinks as link (link.documentId + link.relationType)}
              <div class="link-row" data-capture-document-link-row>
                <span class="link-target">{documentLabel(link.documentId)}</span>
                <select
                  class="link-select"
                  aria-label="Document link relation"
                  value={link.relationType}
                  onchange={(event) => void changeDocumentRelation(link, event.currentTarget.value)}
                >
                  {#each relationOptions(link.relationType) as relation (relation)}
                    <option value={relation}>{relation}</option>
                  {/each}
                </select>
                <button type="button" class="link-remove" aria-label="Remove document link" onclick={() => void unlinkDocument(link)}>×</button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {/if}
</div>

<style>
  .inspector-view { padding: var(--space-4); }
  .section { margin-bottom: var(--space-5); }
  .section-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-3); }
  .section-title {
    font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--color-fg-muted); margin-bottom: var(--space-3);
  }
  .section-row .section-title { margin-bottom: 0; }
  .readonly-badge { font-size: var(--font-size-xs); color: var(--color-fg-muted); }
  .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--space-1) var(--space-3); font-size: var(--font-size-sm); }
  .meta-label { color: var(--color-fg-muted); }
  .meta-value { min-width: 0; color: var(--color-fg-secondary); overflow-wrap: anywhere; }
  .checksum { font-family: var(--font-mono); font-size: var(--font-size-xs); }
  .path { font-size: var(--font-size-xs); }
  .field, .comments {
    width: 100%; border: var(--border-subtle); border-radius: var(--radius-sm);
    background: var(--color-bg-overlay); color: var(--color-fg-primary);
    font: inherit; font-size: var(--font-size-sm); padding: var(--space-2);
  }
  .field.compact { padding: var(--space-1) var(--space-2); }
  .comments { min-height: 86px; resize: vertical; }
  .field:focus-visible, .comments:focus-visible, .link-select:focus-visible, .link-add:focus-visible, .link-remove:focus-visible, .typeahead-result:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 1px; }
  .link-group { display: grid; gap: var(--space-2); margin-bottom: var(--space-4); }
  .link-group-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); font-size: var(--font-size-xs); font-weight: 700; color: var(--color-fg-secondary); text-transform: uppercase; }
  .link-add {
    border: var(--border-subtle); border-radius: var(--radius-sm); background: var(--color-bg-overlay);
    color: var(--color-fg-secondary); font: inherit; font-size: var(--font-size-xs); padding: var(--space-1) var(--space-2);
  }
  .link-add:disabled { opacity: 0.45; cursor: not-allowed; }
  .link-list { display: grid; gap: var(--space-2); }
  .document-link-list { margin-top: var(--space-2); }
  .link-row { display: grid; grid-template-columns: minmax(0, 1fr) 108px 28px; gap: var(--space-2); align-items: center; }
  .link-target { min-width: 0; color: var(--color-fg-secondary); font-size: var(--font-size-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .link-select {
    width: 100%; border: var(--border-subtle); border-radius: var(--radius-sm);
    background: var(--color-bg-overlay); color: var(--color-fg-primary);
    font: inherit; font-size: var(--font-size-xs); padding: var(--space-1) var(--space-2);
  }
  .compact-select { max-width: 116px; }
  .link-remove {
    width: 28px; height: 28px; border: var(--border-subtle); border-radius: var(--radius-sm);
    background: transparent; color: var(--color-fg-muted); font: inherit; line-height: 1;
  }
  .link-remove:hover, .link-add:hover:not(:disabled), .typeahead-result:hover { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .typeahead { position: relative; }
  .typeahead-results {
    position: absolute; z-index: 4; left: 0; right: 0; top: calc(100% + var(--space-1));
    display: grid; gap: 1px; border: var(--border-subtle); border-radius: var(--radius-sm);
    background: var(--color-bg-elevated); box-shadow: var(--shadow-panel); overflow: hidden;
  }
  .typeahead-result {
    width: 100%; border: 0; background: transparent; color: var(--color-fg-secondary);
    font: inherit; font-size: var(--font-size-sm); text-align: left; padding: var(--space-2);
  }
  .typeahead-result.active { background: color-mix(in srgb, var(--accent-inspector) 18%, transparent); color: var(--color-fg-primary); }
</style>
