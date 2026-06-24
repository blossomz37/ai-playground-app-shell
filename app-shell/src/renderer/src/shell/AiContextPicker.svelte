<script lang="ts">
  import { documents, activeDocId } from '../store'
  import {
    aiContextCandidates,
    manualContextDocIds,
    manualContextNote,
    addContextDocument,
    removeContextDocument,
    setManualContextNote,
    toggleAiContextCandidate
  } from '../store/ai'

  interface TreeOption {
    id: string
    label: string
    depth: number
    isFolder: boolean
    // Leaf documents reachable from this node (the node itself if it is a leaf).
    leafIds: string[]
  }

  // Documents already represented in context (so we don't offer them again).
  let candidateDocIds = $derived(new Set($aiContextCandidates.map(c => c.sourceId)))
  let unavailableIds = $derived(
    new Set<string>([
      ...($activeDocId ? [$activeDocId] : []),
      ...$manualContextDocIds,
      ...candidateDocIds
    ])
  )

  // Depth-first walk of the document tree, so the dropdown mirrors the sidebar.
  let documentTree = $derived(buildTree($documents))

  function buildTree(docs: typeof $documents): TreeOption[] {
    const live = docs.filter(doc => !doc.archivedAt)
    const childrenOf = new Map<string | null, typeof live>()
    for (const doc of live) {
      const siblings = childrenOf.get(doc.parentId) ?? []
      siblings.push(doc)
      childrenOf.set(doc.parentId, siblings)
    }
    for (const siblings of childrenOf.values()) {
      siblings.sort((a, b) => a.sortOrder - b.sortOrder)
    }

    const out: TreeOption[] = []
    const walk = (parentId: string | null, depth: number): string[] => {
      const leaves: string[] = []
      for (const doc of childrenOf.get(parentId) ?? []) {
        const isFolder = doc.nodeType === 'folder'
        // Push the node before descending so a folder lists above its contents.
        const option: TreeOption = {
          id: doc.id,
          label: `${'  '.repeat(depth)}${isFolder ? '📁 ' : ''}${doc.title}`,
          depth,
          isFolder,
          leafIds: []
        }
        out.push(option)
        option.leafIds = isFolder ? walk(doc.id, depth + 1) : [doc.id]
        leaves.push(...option.leafIds)
      }
      return leaves
    }
    walk(null, 0)
    return out
  }

  // Offer a node only if it contributes at least one not-yet-included document.
  let addableOptions = $derived(
    documentTree.filter(option => option.leafIds.some(id => !$unavailableIds.has(id)))
  )

  let includedTokens = $derived(
    $aiContextCandidates.filter(c => c.included).reduce((sum, c) => sum + c.estimatedTokens, 0)
  )

  let noteDraft = $state($manualContextNote)
  let selectedDocId = $state('')

  function onAddDocument(): void {
    if (!selectedDocId) return
    const option = documentTree.find(item => item.id === selectedDocId)
    if (!option) return
    // A folder expands to its leaf documents; a document adds itself.
    for (const id of option.leafIds) {
      if (!$unavailableIds.has(id)) addContextDocument(id)
    }
    selectedDocId = ''
  }
</script>

<div class="context-picker">
  <div class="picker-head">
    <span class="section-title">Context</span>
    <span class="token-total">~{includedTokens} tok</span>
  </div>

  {#if $aiContextCandidates.length === 0}
    <p class="empty">No context collected yet.</p>
  {:else}
    <ul class="candidate-list">
      {#each $aiContextCandidates as candidate (candidate.id)}
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
            {#if candidate.sourceType === 'selected-document'}
              <button
                type="button"
                class="remove-btn"
                aria-label="Remove document from context"
                onclick={() => removeContextDocument(candidate.sourceId)}
              >×</button>
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  {/if}

  {#if addableOptions.length > 0}
    <div class="add-row">
      <select class="doc-select" bind:value={selectedDocId} aria-label="Add a document or folder to context">
        <option value="">Add a document or folder…</option>
        {#each addableOptions as option (option.id)}
          <option value={option.id}>{option.label}</option>
        {/each}
      </select>
      <button type="button" class="add-btn" onclick={onAddDocument} disabled={!selectedDocId}>Add</button>
    </div>
  {/if}

  <label class="note-field">
    <span class="note-label">Manual note</span>
    <textarea
      class="note-input"
      placeholder="Extra context to include in this run…"
      bind:value={noteDraft}
      onblur={() => setManualContextNote(noteDraft)}
    ></textarea>
  </label>
</div>

<style>
  .context-picker {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .picker-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .section-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .token-total {
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

  .remove-btn {
    border: none;
    background: transparent;
    color: var(--color-fg-muted);
    font-size: var(--font-size-md);
    line-height: 1;
    cursor: pointer;
    padding: 0 var(--space-1);
  }

  .remove-btn:hover {
    color: var(--color-fg-primary);
  }

  .add-row {
    display: flex;
    gap: var(--space-2);
  }

  .doc-select {
    flex: 1;
    min-width: 0;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-base);
    color: var(--color-fg-primary);
    font-size: var(--font-size-sm);
  }

  .add-btn {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .add-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
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
    min-height: 48px;
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
