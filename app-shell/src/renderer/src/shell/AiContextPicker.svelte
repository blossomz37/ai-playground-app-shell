<script lang="ts">
  import { onMount } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import { activeDocId, docTree } from '../store'
  import type { DocNode } from '@shared/state/documents-state'
  import {
    aiContextCandidates,
    manualContextDocIds,
    manualContextExcludedDocIds,
    manualContextFolderIds,
    manualContextNote,
    refreshAiContext,
    setManualContextNote,
    toggleAiContextCandidate,
    toggleContextDocument,
    toggleContextFolder
  } from '../store/ai'

  interface ContextRow {
    id: string
    title: string
    depth: number
    nodeType: 'folder' | 'document'
    children: ContextRow[]
    documentIds: string[]
    estimatedTokens: number
  }

  let expanded = new SvelteSet<string>()
  let noteDraft = $state('')

  let contextTree = $derived(($docTree as DocNode[]).map(node => toContextRow(node, 0)))
  let selectedFolderIds = $derived(new SvelteSet($manualContextFolderIds))
  let excludedDocumentIds = $derived(new SvelteSet($manualContextExcludedDocIds))
  let selectedDocumentIds = $derived.by(() => {
    const ids = new SvelteSet($manualContextDocIds)
    for (const row of flatRows(contextTree)) {
      if (row.nodeType === 'folder' && selectedFolderIds.has(row.id)) {
        for (const id of row.documentIds) ids.add(id)
      }
    }
    for (const id of excludedDocumentIds) ids.delete(id)
    return ids
  })
  let selectedTreeTokens = $derived(flatRows(contextTree).reduce((sum, row) =>
    row.nodeType === 'document' && selectedDocumentIds.has(row.id) ? sum + row.estimatedTokens : sum, 0
  ))
  let includedTokens = $derived(
    $aiContextCandidates.filter(candidate => candidate.included).reduce((sum, candidate) => sum + candidate.estimatedTokens, 0)
  )
  let autoCandidates = $derived($aiContextCandidates.filter(candidate => candidate.sourceType !== 'selected-document'))

  onMount(() => {
    noteDraft = $manualContextNote
    void refreshAiContext()
  })

  function estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4))
  }

  function toContextRow(node: DocNode, depth: number): ContextRow {
    const children = node.children.map(child => toContextRow(child, depth + 1))
    const ownDocumentIds = node.nodeType === 'document' ? [node.id] : []
    const documentIds = [...ownDocumentIds, ...children.flatMap(child => child.documentIds)]
    const estimatedTokens = node.nodeType === 'document'
      ? estimateTokens(node.content)
      : children.reduce((sum, child) => sum + child.estimatedTokens, 0)
    return {
      id: node.id,
      title: node.title,
      depth,
      nodeType: node.nodeType,
      children,
      documentIds,
      estimatedTokens
    }
  }

  function flatRows(rows: ContextRow[]): ContextRow[] {
    return rows.flatMap(row => [row, ...flatRows(row.children)])
  }

  function visibleRows(rows: ContextRow[]): ContextRow[] {
    const visible: ContextRow[] = []
    for (const row of rows) {
      visible.push(row)
      if (row.children.length > 0 && expanded.has(row.id)) {
        visible.push(...visibleRows(row.children))
      }
    }
    return visible
  }

  let rows = $derived(visibleRows(contextTree))

  function hasSelectedDescendants(row: ContextRow): boolean {
    return row.documentIds.some(id => selectedDocumentIds.has(id))
  }

  function rowChecked(row: ContextRow): boolean {
    return row.nodeType === 'folder'
      ? selectedFolderIds.has(row.id)
      : selectedDocumentIds.has(row.id)
  }

  function rowPartial(row: ContextRow): boolean {
    return row.nodeType === 'folder' && !selectedFolderIds.has(row.id) && hasSelectedDescendants(row)
  }

  function rowDisabled(row: ContextRow): boolean {
    return row.nodeType === 'folder' && row.documentIds.length === 0
  }

  function toggleExpanded(row: ContextRow): void {
    if (expanded.has(row.id)) {
      expanded.delete(row.id)
    } else {
      expanded.add(row.id)
    }
  }

  function toggleRow(row: ContextRow): void {
    if (rowDisabled(row)) return
    if (row.nodeType === 'folder') {
      toggleContextFolder(row.id)
    } else {
      toggleContextDocument(row.id)
    }
  }

  function rowReason(row: ContextRow): string {
    if (row.nodeType === 'folder') {
      if (selectedFolderIds.has(row.id)) return 'Folder included'
      if (rowPartial(row)) return 'Some documents included'
      return 'Folder excluded'
    }
    if (excludedDocumentIds.has(row.id)) return 'Excluded override'
    if (selectedDocumentIds.has(row.id)) return 'Document included'
    return 'Document excluded'
  }

  function commitManualNote(): void {
    if (noteDraft !== $manualContextNote) {
      setManualContextNote(noteDraft)
    }
  }
</script>

<div class="context-picker">
  <div class="picker-head">
    <span class="section-title">Project Context</span>
    <span class="token-total">~{includedTokens} tok</span>
  </div>

  <div class="context-tree" role="tree" aria-label="AI context document tree">
    {#if rows.length === 0}
      <p class="empty">No project documents yet.</p>
    {:else}
      {#each rows as row (row.id)}
        <div
          class="tree-row"
          class:active={$activeDocId === row.id}
          class:partial={rowPartial(row)}
          class:excluded={!rowChecked(row) && !rowPartial(row)}
          role="treeitem"
          aria-level={row.depth + 1}
          aria-selected={rowChecked(row)}
          aria-expanded={row.children.length > 0 ? expanded.has(row.id) : undefined}
          style={`--depth: ${row.depth}`}
        >
          <button
            type="button"
            class="expand-btn"
            aria-label={expanded.has(row.id) ? `Collapse ${row.title}` : `Expand ${row.title}`}
            disabled={row.children.length === 0}
            onclick={() => toggleExpanded(row)}
          >
            {#if row.children.length > 0}{expanded.has(row.id) ? 'v' : '>'}{/if}
          </button>
          <label class="row-toggle" title={rowReason(row)}>
            <input
              type="checkbox"
              checked={rowChecked(row)}
              disabled={rowDisabled(row)}
              onchange={() => toggleRow(row)}
            />
            <span class="row-icon">{row.nodeType === 'folder' ? 'Folder' : 'Doc'}</span>
            <span class="row-title">{row.title}</span>
          </label>
          <span class="row-meta">
            {#if rowPartial(row)}<span class="partial-label">partial</span>{/if}
            <span>~{row.estimatedTokens}</span>
          </span>
        </div>
      {/each}
    {/if}
  </div>

  <div class="picker-head secondary">
    <span class="section-title">Run Context</span>
    <span class="token-total">tree ~{selectedTreeTokens}</span>
  </div>

  {#if autoCandidates.length > 0}
    <ul class="candidate-list">
      {#each autoCandidates as candidate (candidate.id)}
        <li class="candidate" class:excluded={!candidate.included}>
          <label class="candidate-main">
            <input
              type="checkbox"
              checked={candidate.included}
              onchange={() => toggleAiContextCandidate(candidate.id)}
            />
            <span class="candidate-title" title={candidate.excerpt}>{candidate.title}</span>
          </label>
          <span class="candidate-meta">
            <span class="kind-badge">{candidate.kind}</span>
            <span class="candidate-tokens">~{candidate.estimatedTokens}</span>
          </span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">No active-document context collected.</p>
  {/if}

  <label class="note-field">
    <span class="note-label">Manual note</span>
    <textarea
      class="note-input"
      placeholder="Extra context to include in this run..."
      bind:value={noteDraft}
      onblur={commitManualNote}
    ></textarea>
  </label>
</div>

<style>
  .context-picker {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
  }

  .picker-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .picker-head.secondary {
    padding-top: var(--space-1);
  }

  .section-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .token-total {
    flex: 0 0 auto;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
  }

  .empty {
    margin: 0;
    color: var(--color-fg-muted);
    font-style: italic;
    font-size: var(--font-size-sm);
  }

  .context-tree {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .tree-row {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-1);
    min-height: 28px;
    padding: 0 var(--space-2) 0 calc(var(--space-1) + (var(--depth) * 14px));
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
  }

  .tree-row:hover {
    background: var(--color-bg-hover);
  }

  .tree-row.active {
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }

  .tree-row.excluded {
    opacity: 0.72;
  }

  .tree-row.partial {
    color: var(--color-fg-primary);
  }

  .expand-btn {
    width: 18px;
    height: 22px;
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    line-height: 1;
  }

  .expand-btn:disabled {
    opacity: 0;
    cursor: default;
  }

  .expand-btn:not(:disabled):hover {
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
  }

  .row-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    cursor: pointer;
  }

  .row-toggle input {
    flex: 0 0 auto;
    accent-color: var(--color-accent);
  }

  .row-icon {
    flex: 0 0 auto;
    width: 42px;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
  }

  .row-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--font-size-sm);
    color: inherit;
  }

  .row-meta {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  .partial-label {
    color: var(--color-accent);
    font-family: var(--font-sans);
    text-transform: uppercase;
  }

  .candidate-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .candidate {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--color-bg-surface);
  }

  .candidate.excluded {
    opacity: 0.5;
  }

  .candidate-main {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    cursor: pointer;
  }

  .candidate-main input {
    accent-color: var(--color-accent);
  }

  .candidate-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--font-size-sm);
    color: var(--color-fg-primary);
  }

  .candidate-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 0 0 auto;
  }

  .kind-badge {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    text-transform: lowercase;
  }

  .candidate-tokens {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
  }

  .note-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .note-label {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
  }

  .note-input {
    min-height: 56px;
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-base);
    color: var(--color-fg-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    resize: vertical;
  }

  .note-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }
</style>
