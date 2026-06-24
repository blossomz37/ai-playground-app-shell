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

  // Documents that can be added manually: real docs (not folders), not archived,
  // not the active doc, and not already pulled in by a candidate.
  let candidateDocIds = $derived(new Set($aiContextCandidates.map(c => c.sourceId)))
  let addableDocuments = $derived(
    $documents.filter(doc =>
      doc.nodeType !== 'folder' &&
      !doc.archivedAt &&
      doc.id !== $activeDocId &&
      !$manualContextDocIds.includes(doc.id) &&
      !candidateDocIds.has(doc.id)
    )
  )

  let includedTokens = $derived(
    $aiContextCandidates.filter(c => c.included).reduce((sum, c) => sum + c.estimatedTokens, 0)
  )

  let noteDraft = $state($manualContextNote)
  let selectedDocId = $state('')

  function onAddDocument(): void {
    if (!selectedDocId) return
    addContextDocument(selectedDocId)
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

  {#if addableDocuments.length > 0}
    <div class="add-row">
      <select class="doc-select" bind:value={selectedDocId} aria-label="Add a document to context">
        <option value="">Add a document…</option>
        {#each addableDocuments as doc (doc.id)}
          <option value={doc.id}>{doc.title}</option>
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
