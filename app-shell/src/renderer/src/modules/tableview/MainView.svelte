<!-- Table View MainView — data table of documents -->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { XIcon } from 'phosphor-svelte'

  import {
    filteredTableDocuments,
    resetTableFilters,
    selectTableDoc,
    selectedTableDocId,
    setTableAllKinds,
    setTableSelectedKinds,
    setTableUpdatedRange,
    setTableWordCountRange,
    tableDocuments,
    tableHasActiveFilters,
    tableSelectedKinds,
    tableKindFilterMode,
    tableFilterSummary,
    tableSearchQuery,
    tableSortBy,
    tableUpdatedRange,
    tableWordCountMax,
    tableWordCountMin
  } from './state'
  import {
    activeModuleId,
    selectDoc
  } from '../../store'
  import type { TableUpdatedRange } from '@shared/state/tableview-state'

  const columns = ['Title', 'Kind', 'Updated', 'Words']
  const baseKindOptions = ['chapter', 'scene', 'plan', 'folder']
  const updatedRangeOptions: { value: TableUpdatedRange; label: string }[] = [
    { value: 'all', label: 'Modified' },
    { value: 'today', label: 'Today' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' }
  ]
  let kindPopoverOpen = $state(false)
  let captureFilterListener: ((event: Event) => void) | null = null

  const kindOptions = $derived(Array.from(new Set([
    ...baseKindOptions,
    ...$tableDocuments.map(doc => doc.kind)
  ])).sort((a, b) => baseKindOptions.indexOf(a) - baseKindOptions.indexOf(b) || a.localeCompare(b)))

  const kindButtonLabel = $derived(
    $tableKindFilterMode === 'all'
      ? 'All kinds'
      : $tableSelectedKinds.length === 0
        ? 'No kinds'
        : `${$tableSelectedKinds.length} kind${$tableSelectedKinds.length === 1 ? '' : 's'}`
  )

  const filterChips = $derived(activeFilterChips())

  async function openDocument(event: MouseEvent, id: string): Promise<void> {
    event.stopPropagation()
    selectTableDoc(id)
    activeModuleId.set('shell.documents')
    await window.shell.modules.activate('shell.documents')
    await selectDoc(id)
  }

  function toggleKind(kind: string): void {
    if ($tableKindFilterMode === 'all') {
      setTableSelectedKinds(kindOptions.filter(item => item !== kind))
      return
    }

    const selected = $tableSelectedKinds.includes(kind)
      ? $tableSelectedKinds.filter(item => item !== kind)
      : [...$tableSelectedKinds, kind]
    setTableSelectedKinds(kindOptions.filter(item => selected.includes(item)))
  }

  function selectAllKinds(): void {
    setTableAllKinds()
  }

  function selectNoKinds(): void {
    setTableSelectedKinds([])
  }

  function invertKinds(): void {
    const selected = $tableKindFilterMode === 'all' ? kindOptions : $tableSelectedKinds
    setTableSelectedKinds(kindOptions.filter(kind => !selected.includes(kind)))
  }

  function isKindSelected(kind: string): boolean {
    return $tableKindFilterMode === 'all' || $tableSelectedKinds.includes(kind)
  }

  function clearSearch(): void {
    tableSearchQuery.set('')
  }

  function clearKinds(): void {
    setTableAllKinds()
  }

  function clearWords(): void {
    setTableWordCountRange(undefined, undefined)
  }

  function clearUpdatedRange(): void {
    setTableUpdatedRange('all')
  }

  function activeFilterChips(): Array<{ id: string; label: string; clear: () => void }> {
    const chips: Array<{ id: string; label: string; clear: () => void }> = []
    const query = $tableSearchQuery.trim()
    if (query) chips.push({ id: 'search', label: `Search: ${query}`, clear: clearSearch })

    if ($tableKindFilterMode !== 'all') {
      chips.push({
        id: 'kind',
        label: $tableSelectedKinds.length ? `Kinds: ${$tableSelectedKinds.join(', ')}` : 'Kinds: none',
        clear: clearKinds
      })
    }

    if ($tableWordCountMin !== undefined || $tableWordCountMax !== undefined) {
      const min = $tableWordCountMin ?? 0
      const max = $tableWordCountMax
      chips.push({
        id: 'words',
        label: max === undefined ? `Words: ${min}+` : `Words: ${min}-${max}`,
        clear: clearWords
      })
    }

    if ($tableUpdatedRange !== 'all') {
      const label = updatedRangeOptions.find(option => option.value === $tableUpdatedRange)?.label ?? $tableUpdatedRange
      chips.push({ id: 'updated', label: `Modified: ${label}`, clear: clearUpdatedRange })
    }

    return chips
  }

  function parseWords(value: string): number | undefined {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) return undefined
    return Math.max(0, Math.floor(parsed))
  }

  function wordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length
  }

  function onToolbarKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      kindPopoverOpen = false
    }
  }

  onMount(() => {
    captureFilterListener = (event: Event) => {
      const detail = (event as CustomEvent<{
        search?: string
        kinds?: string[]
        wordsMin?: number
        wordsMax?: number
        updatedRange?: TableUpdatedRange
        reset?: boolean
      }>).detail

      if (detail.reset) resetTableFilters()
      if (detail.search !== undefined) tableSearchQuery.set(detail.search)
      if (detail.kinds !== undefined) {
        setTableSelectedKinds(detail.kinds)
      }
      if (detail.wordsMin !== undefined || detail.wordsMax !== undefined) {
        setTableWordCountRange(detail.wordsMin, detail.wordsMax)
      }
      if (detail.updatedRange) setTableUpdatedRange(detail.updatedRange)
    }
    window.addEventListener('table:capture-set-filters', captureFilterListener)
  })

  onDestroy(() => {
    if (captureFilterListener) {
      window.removeEventListener('table:capture-set-filters', captureFilterListener)
    }
  })
</script>

<div class="main-view">
  <div class="table-controls">
    <header class="table-toolbar" aria-label="Table filters">
      <div class="search-field">
        <label class="sr-only" for="table-search">Search documents</label>
        <input
          id="table-search"
          class="search-input"
          type="search"
          placeholder="Search"
          bind:value={$tableSearchQuery}
          data-capture-table-search
        />
      </div>
      <div class="kind-filter">
        <button
          class="kind-filter-btn"
          class:active={$tableKindFilterMode !== 'all'}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={kindPopoverOpen}
          data-capture-table-kind
          onclick={() => kindPopoverOpen = !kindPopoverOpen}
        >
          {kindButtonLabel}
        </button>
        {#if kindPopoverOpen}
          <div class="kind-popover" role="dialog" aria-label="Kind filter" tabindex="-1" onkeydown={onToolbarKeydown}>
            <div class="kind-actions">
              <button type="button" onclick={selectAllKinds}>All</button>
              <button type="button" onclick={selectNoKinds}>None</button>
              <button type="button" onclick={invertKinds}>Invert</button>
            </div>
            <div class="kind-list">
              {#each kindOptions as kind (kind)}
                <label class="kind-option">
                  <input
                    type="checkbox"
                    checked={isKindSelected(kind)}
                    onchange={() => toggleKind(kind)}
                  />
                  <span>{kind}</span>
                </label>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      <div class="word-range" aria-label="Word count range">
        <input
          class="number-input"
          type="number"
          min="0"
          placeholder="Min words"
          value={$tableWordCountMin ?? ''}
          data-capture-table-words-min
          onblur={(event) => setTableWordCountRange(parseWords(event.currentTarget.value), $tableWordCountMax)}
          onkeydown={(event) => {
            if (event.key === 'Enter') setTableWordCountRange(parseWords(event.currentTarget.value), $tableWordCountMax)
          }}
        />
        <input
          class="number-input"
          type="number"
          min="0"
          placeholder="Max words"
          value={$tableWordCountMax ?? ''}
          data-capture-table-words-max
          onblur={(event) => setTableWordCountRange($tableWordCountMin, parseWords(event.currentTarget.value))}
          onkeydown={(event) => {
            if (event.key === 'Enter') setTableWordCountRange($tableWordCountMin, parseWords(event.currentTarget.value))
          }}
        />
      </div>
      <label class="toolbar-field" for="table-updated-filter">
        <span class="sr-only">Modified range</span>
        <select id="table-updated-filter" bind:value={$tableUpdatedRange} data-capture-table-updated-range>
          {#each updatedRangeOptions as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>
      <label class="toolbar-field" for="table-sort">
        <span class="sr-only">Sort</span>
        <select id="table-sort" bind:value={$tableSortBy}>
          <option value="title">Title</option>
          <option value="updatedAt">Modified</option>
          <option value="createdAt">Created</option>
          <option value="kind">Kind</option>
        </select>
      </label>
      <button
        class="reset-btn"
        type="button"
        disabled={!$tableHasActiveFilters}
        aria-label="Reset table filters"
        title="Reset filters"
        onclick={resetTableFilters}
      >
        <XIcon size={14} weight="bold" aria-hidden="true" />
      </button>
    </header>
    <div class="filter-summary">
      <span>{$tableFilterSummary}</span>
      {#if filterChips.length}
        <div class="filter-chips" aria-label="Active filters">
          {#each filterChips as chip (chip.id)}
            <button class="filter-chip" type="button" onclick={chip.clear}>
              {chip.label}
              <XIcon size={11} weight="bold" aria-hidden="true" />
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
  <div class="table-wrapper">
    <table class="data-table">
      <thead>
        <tr>
          {#each columns as col (col)}
            <th>{col}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each $filteredTableDocuments as doc (doc.id)}
            <tr
              class:active={$selectedTableDocId === doc.id}
              onclick={() => selectTableDoc(doc.id)}
            >
              <td class="cell-title">
                <button
                  class="doc-link"
                  type="button"
                  aria-label={`Open ${doc.title} in Documents`}
                  onclick={(event) => openDocument(event, doc.id)}
                  onkeydown={(event) => event.stopPropagation()}
                  onfocus={() => selectTableDoc(doc.id)}
                >
                  {doc.title}
                </button>
              </td>
              <td><span class="kind-badge">{doc.kind}</span></td>
              <td class="cell-date">{new Date(doc.updatedAt).toLocaleDateString()}</td>
              <td class="cell-num">{wordCount(doc.content)}</td>
            </tr>
        {:else}
          <tr>
            <td colspan="4" class="empty-cell">
              {$tableHasActiveFilters ? 'No documents match the current filters.' : 'No documents'}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .main-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .table-controls {
    border-bottom: var(--border-subtle);
    background: var(--color-bg-surface);
  }
  .table-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: var(--space-2);
  }
  .search-field { flex: 1 1 130px; min-width: 0; }
  .search-input,
  .toolbar-field select,
  .kind-filter-btn,
  .number-input {
    width: 100%;
    height: 30px;
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
    font: inherit;
    font-size: var(--font-size-sm);
    outline: none;
  }
  .search-input { padding: 0 var(--space-3); }
  .kind-filter {
    position: relative;
    flex: 0 0 auto;
  }
  .kind-filter-btn {
    width: 112px;
    padding: 0 var(--space-2);
    font-weight: 600;
    text-align: left;
  }
  .kind-filter-btn.active {
    border-color: var(--color-accent);
    background: var(--color-accent-dim);
  }
  .kind-popover {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 20;
    width: 220px;
    padding: var(--space-2);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
    box-shadow: var(--shadow-panel);
  }
  .kind-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
    margin-bottom: var(--space-2);
  }
  .kind-actions button {
    min-height: 26px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }
  .kind-actions button:hover {
    background: var(--color-bg-active);
    color: var(--color-fg-primary);
  }
  .kind-list {
    display: grid;
    gap: 2px;
  }
  .kind-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 28px;
    padding: 0 var(--space-1);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-sm);
  }
  .kind-option input {
    accent-color: var(--color-accent);
  }
  .word-range {
    display: flex;
    gap: 4px;
    flex: 0 0 auto;
  }
  .number-input {
    width: 92px;
    padding: 0 var(--space-2);
  }
  .toolbar-field {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
  }
  .toolbar-field select {
    width: 94px;
    padding: 0 var(--space-2);
    font-weight: 500;
  }
  .search-input:focus-visible,
  .toolbar-field select:focus-visible,
  .kind-filter-btn:focus-visible,
  .kind-actions button:focus-visible,
  .kind-option:focus-within,
  .number-input:focus-visible,
  .filter-chip:focus-visible,
  .reset-btn:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 1px;
  }
  .reset-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 30px;
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    background: var(--color-bg-overlay);
  }
  .reset-btn:hover:not(:disabled) { background: var(--color-bg-active); color: var(--color-fg-primary); }
  .reset-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .filter-summary {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
    min-height: 32px;
    padding: 0 var(--space-2) var(--space-2);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }
  .filter-chips {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
  }
  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 22px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 600;
  }
  .filter-chip:hover {
    background: var(--color-bg-active);
    color: var(--color-fg-primary);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .table-wrapper {
    flex: 1;
    overflow: auto;
    padding: 0 var(--space-4) var(--space-4);
    background: var(--color-bg-base);
  }
  .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
  .data-table th {
    text-align: left; padding: var(--space-2) var(--space-3); font-size: var(--font-size-xs); font-weight: 600;
    letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-fg-muted); border-bottom: var(--border-subtle);
    position: sticky; top: 0; z-index: 2; background: var(--color-bg-base);
  }
  .data-table td { padding: var(--space-2) var(--space-3); color: var(--color-fg-secondary); border-bottom: 1px solid rgba(69, 71, 90, 0.3); }
  .data-table tr:hover td { background: var(--color-bg-overlay); }
  .data-table tr { cursor: pointer; }
  .data-table tr.active td { background: var(--color-accent-dim); }
  .cell-title { font-weight: 500; color: var(--color-fg-primary); }
  .doc-link {
    display: inline-flex;
    max-width: 100%;
    color: var(--color-fg-primary);
    font: inherit;
    font-weight: inherit;
    text-align: left;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .doc-link:hover,
  .doc-link:focus-visible {
    color: var(--accent-nav);
  }
  .doc-link:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
  .cell-date { color: var(--color-fg-muted); font-variant-numeric: tabular-nums; }
  .cell-num { text-align: right; font-variant-numeric: tabular-nums; color: var(--color-fg-muted); }
  .kind-badge { font-size: var(--font-size-xs); color: var(--color-accent); background: var(--color-accent-dim); padding: 1px 6px; border-radius: var(--radius-sm); }
  .empty-cell { text-align: center; color: var(--color-fg-muted); padding: var(--space-6) !important; }
</style>
