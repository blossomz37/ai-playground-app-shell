<script lang="ts">
  import type { DocumentSearchMode, DocumentSearchScope } from '@shared/document-search'

  export interface ProjectSearchResult {
    documentId: string
    title: string
    count: number
  }

  interface Props {
    query: string
    replacement: string
    mode: DocumentSearchMode
    scope: DocumentSearchScope
    matchCount: number
    activeIndex: number
    validationError: string | null
    projectResults: ProjectSearchResult[]
    projectReplacePreview: boolean
    projectReplaceBusy: boolean
    onQueryChange: (value: string) => void
    onReplacementChange: (value: string) => void
    onModeChange: (value: DocumentSearchMode) => void
    onScopeChange: (value: DocumentSearchScope) => void
    onPrevious: () => void
    onNext: () => void
    onReplace: () => void
    onReplaceNext: () => void
    onReplaceAll: () => void
    onClose: () => void
    onOpenProjectResult: (documentId: string) => void
    onConfirmProjectReplace: () => void
    onCancelProjectReplace: () => void
  }

  let {
    query,
    replacement,
    mode,
    scope,
    matchCount,
    activeIndex,
    validationError,
    projectResults,
    projectReplacePreview,
    projectReplaceBusy,
    onQueryChange,
    onReplacementChange,
    onModeChange,
    onScopeChange,
    onPrevious,
    onNext,
    onReplace,
    onReplaceNext,
    onReplaceAll,
    onClose,
    onOpenProjectResult,
    onConfirmProjectReplace,
    onCancelProjectReplace
  }: Props = $props()

  const projectMatchCount = $derived(projectResults.reduce((total, result) => total + result.count, 0))
  const activeLabel = $derived(matchCount > 0 ? `${activeIndex + 1} / ${matchCount}` : '0 / 0')

  function onPanelKeydown(event: KeyboardEvent): void {
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  function onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      onNext()
    }
  }
</script>

<div
  class="search-panel"
  role="dialog"
  aria-label="Document search and replace"
  tabindex="-1"
  onkeydown={onPanelKeydown}
>
  <div class="search-row">
    <label class="search-field">
      <span>Find</span>
      <input
        data-capture-document-search-input
        value={query}
        type="text"
        spellcheck="false"
        autocomplete="off"
        oninput={(event) => onQueryChange(event.currentTarget.value)}
        onkeydown={onSearchKeydown}
      />
    </label>

    <div class="result-count" aria-live="polite">
      {#if scope === 'project'}
        {projectMatchCount} in {projectResults.length}
      {:else}
        {activeLabel}
      {/if}
    </div>

    <button class="icon-btn" type="button" aria-label="Previous match" disabled={matchCount === 0} onclick={onPrevious}>
      ‹
    </button>
    <button class="icon-btn" type="button" aria-label="Next match" disabled={matchCount === 0} onclick={onNext}>
      ›
    </button>
    <button class="icon-btn close-btn" type="button" aria-label="Close search" onclick={onClose}>×</button>
  </div>

  <div class="search-row">
    <label class="search-field">
      <span>Replace</span>
      <input
        data-capture-document-replace-input
        value={replacement}
        type="text"
        spellcheck="false"
        autocomplete="off"
        oninput={(event) => onReplacementChange(event.currentTarget.value)}
      />
    </label>

    <div class="segmented" role="group" aria-label="Search scope">
      <button type="button" class:active={scope === 'document'} onclick={() => onScopeChange('document')}>Document</button>
      <button type="button" class:active={scope === 'project'} onclick={() => onScopeChange('project')}>Project</button>
    </div>

    <div class="segmented" role="group" aria-label="Search mode">
      <button type="button" class:active={mode === 'word'} onclick={() => onModeChange('word')}>Word</button>
      <button type="button" class:active={mode === 'regex'} onclick={() => onModeChange('regex')}>Regex</button>
    </div>
  </div>

  <div class="action-row">
    <button type="button" disabled={matchCount === 0} onclick={onReplace}>Replace</button>
    <button type="button" disabled={matchCount === 0} onclick={onReplaceNext}>Replace Next</button>
    <button
      type="button"
      class="primary"
      disabled={scope === 'project' ? projectMatchCount === 0 : matchCount === 0}
      onclick={onReplaceAll}
    >
      Replace All
    </button>
  </div>

  {#if validationError}
    <p class="error" role="status">{validationError}</p>
  {/if}

  {#if scope === 'project' && query.trim()}
    <div class="project-results" aria-label="Project search results">
      {#each projectResults as result (result.documentId)}
        <button type="button" onclick={() => onOpenProjectResult(result.documentId)}>
          <span>{result.title}</span>
          <strong>{result.count}</strong>
        </button>
      {:else}
        <p>No project matches.</p>
      {/each}
    </div>
  {/if}

  {#if projectReplacePreview}
    <div class="replace-preview" role="dialog" aria-label="Confirm project replace">
      <p>Replace {projectMatchCount} matches across {projectResults.length} documents?</p>
      <div>
        <button type="button" disabled={projectReplaceBusy} onclick={onCancelProjectReplace}>Cancel</button>
        <button type="button" class="danger" disabled={projectReplaceBusy} onclick={onConfirmProjectReplace}>
          {projectReplaceBusy ? 'Replacing…' : 'Confirm Replace'}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .search-panel {
    flex-shrink: 0;
    width: auto;
    margin: var(--space-3) clamp(var(--space-5), 7vw, 84px) 0;
    max-width: 820px;
    align-self: flex-end;
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-bg-surface) 94%, var(--color-panel-glint));
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
    color: var(--color-fg-primary);
    font-family: var(--font-sans);
  }

  .search-row,
  .action-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .search-field {
    flex: 1;
    min-width: 120px;
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr);
    align-items: center;
    gap: var(--space-2);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
  }

  .search-field input {
    min-width: 0;
    height: 30px;
    padding: 0 var(--space-2);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
    font: inherit;
    font-size: var(--font-size-sm);
    font-weight: 500;
    text-transform: none;
    outline: none;
  }

  .search-field input:focus-visible {
    border-color: var(--accent-editor);
    box-shadow: var(--focus-ring);
  }

  .result-count {
    width: 72px;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    text-align: center;
    white-space: nowrap;
  }

  .icon-btn {
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-lg);
    line-height: 1;
  }

  .close-btn {
    color: var(--color-fg-muted);
  }

  .segmented {
    display: flex;
    height: 30px;
    padding: 2px;
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
  }

  .segmented button,
  .action-row button,
  .replace-preview button {
    height: 26px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .segmented button.active,
  .primary {
    background: var(--color-accent-dim);
    color: var(--color-fg-primary);
  }

  button:hover:not(:disabled) {
    background: var(--color-hover);
    color: var(--color-fg-primary);
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .action-row {
    justify-content: flex-end;
  }

  .error {
    margin: 0;
    color: var(--color-danger, #ff7b72);
    font-size: var(--font-size-xs);
  }

  .project-results {
    display: grid;
    max-height: 130px;
    overflow-y: auto;
    border-top: var(--border-subtle);
    padding-top: var(--space-2);
  }

  .project-results button {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-3);
    min-height: 30px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    text-align: left;
  }

  .project-results span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-results strong {
    color: var(--accent-editor);
    font-size: var(--font-size-xs);
  }

  .project-results p {
    margin: 0;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }

  .replace-preview {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    border-top: var(--border-subtle);
    padding-top: var(--space-2);
  }

  .replace-preview p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
  }

  .replace-preview div {
    display: flex;
    gap: var(--space-2);
  }

  .danger {
    background: color-mix(in srgb, var(--color-danger, #ff7b72) 18%, transparent);
    color: var(--color-fg-primary);
  }
</style>
