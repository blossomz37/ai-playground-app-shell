<!-- Table View MainView — data table of documents -->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { ArchiveIcon, CheckIcon, CopyIcon, TrashIcon, XIcon } from 'phosphor-svelte'
  import {
    documentKindFromValue,
    documentKindValue,
    labelForDocumentKind,
    STRUCTURAL_FOLDER_KIND_LABEL,
    STRUCTURAL_FOLDER_KIND_VALUE,
    UNCATEGORIZED_KIND_LABEL,
    UNCATEGORIZED_KIND_VALUE
  } from '@shared/document-kinds'

  import {
    clearTableSelection,
    filteredTableDocuments,
    resetTableFilters,
    selectTableDoc,
    selectedTableDocIds,
    selectedTableFileIds,
    selectedTableFolderIds,
    selectedTableDocId,
    setTableAllKinds,
    setTableSelectedKinds,
    setTableUpdatedRange,
    setTableWordCountRange,
    tableAllVisibleSelected,
    tableDocuments,
    tableHasActiveFilters,
    tableSelectedKinds,
    tableKindFilterMode,
    tableFilterSummary,
    tableSearchQuery,
    tableSortBy,
    tableSomeVisibleSelected,
    tableUpdatedRange,
    tableVisibleSelectedCount,
    tableWordCountMax,
    tableWordCountMin,
    toggleTableDocSelection,
    toggleTableVisibleSelection
  } from './state'
  import {
    activeModuleId,
    archiveDocs,
    deleteDocs,
    duplicateDocs,
    selectDoc,
    documentKindOptions,
    updateDoc,
    updateDocMetadata
  } from '../../store'
  import { addToast } from '../../store/toasts'
  import type { TableSortBy, TableUpdatedRange } from '@shared/state/tableview-state'

  const columns = ['Title', 'Kind', 'Updated', 'Words', 'Target']
  const baseKindOptions = [
    { value: STRUCTURAL_FOLDER_KIND_VALUE, label: STRUCTURAL_FOLDER_KIND_LABEL },
    { value: UNCATEGORIZED_KIND_VALUE, label: UNCATEGORIZED_KIND_LABEL }
  ]
  const updatedRangeOptions: { value: TableUpdatedRange; label: string }[] = [
    { value: 'all', label: 'Date' },
    { value: 'today', label: 'Today' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' }
  ]
  let kindPopoverOpen = $state(false)
  let bulkKind = $state(UNCATEGORIZED_KIND_VALUE)
  let bulkTargetWords = $state('')
  let bulkBusy = $state(false)
  let confirmDeleteKey = $state<string | null>(null)
  let captureFilterListener: ((event: Event) => void) | null = null
  let captureBulkListener: ((event: Event) => void) | null = null

  const kindOptions = $derived.by(() => {
    const options = [...baseKindOptions]
    for (const option of $documentKindOptions) {
      if (!options.some(item => item.value === option.id)) {
        options.push({ value: option.id, label: option.label })
      }
    }
    for (const doc of $tableDocuments) {
      const value = tableKindValue(doc)
      if (!options.some(item => item.value === value)) {
        options.push({ value, label: tableKindLabel(doc) })
      }
    }
    return options
  })

  const bulkKindOptions = $derived(kindOptions.filter(option => option.value !== STRUCTURAL_FOLDER_KIND_VALUE))

  const kindButtonLabel = $derived(
    $tableKindFilterMode === 'all'
      ? 'All kinds'
      : $tableSelectedKinds.length === 0
        ? 'No kinds'
        : `${$tableSelectedKinds.length} kind${$tableSelectedKinds.length === 1 ? '' : 's'}`
  )

  const filterChips = $derived(activeFilterChips())
  const selectedCount = $derived($selectedTableDocIds.length)
  const selectedFileCount = $derived($selectedTableFileIds.length)
  const selectedFolderCount = $derived($selectedTableFolderIds.length)
  const selectedKey = $derived($selectedTableDocIds.join('\0'))
  const folderSkipText = $derived(selectedFolderCount > 0
    ? `${selectedFolderCount} folder${selectedFolderCount === 1 ? '' : 's'} skipped for metadata`
    : ''
  )
  const deleteConfirmationArmed = $derived(confirmDeleteKey === selectedKey && selectedCount > 0)

  async function openDocument(event: MouseEvent, id: string): Promise<void> {
    event.stopPropagation()
    selectTableDoc(id)
    activeModuleId.set('shell.documents')
    await window.shell.modules.activate('shell.documents')
    await selectDoc(id)
  }

  function toggleKind(kind: string): void {
    confirmDeleteKey = null
    if ($tableKindFilterMode === 'all') {
      setTableSelectedKinds(kindOptions.map(option => option.value).filter(item => item !== kind))
      return
    }

    const selected = $tableSelectedKinds.includes(kind)
      ? $tableSelectedKinds.filter(item => item !== kind)
      : [...$tableSelectedKinds, kind]
    setTableSelectedKinds(kindOptions.map(option => option.value).filter(item => selected.includes(item)))
  }

  function selectAllKinds(): void {
    confirmDeleteKey = null
    setTableAllKinds()
  }

  function selectNoKinds(): void {
    confirmDeleteKey = null
    setTableSelectedKinds([])
  }

  function invertKinds(): void {
    confirmDeleteKey = null
    const selected = $tableKindFilterMode === 'all' ? kindOptions.map(option => option.value) : $tableSelectedKinds
    setTableSelectedKinds(kindOptions.map(option => option.value).filter(kind => !selected.includes(kind)))
  }

  function isKindSelected(kind: string): boolean {
    return $tableKindFilterMode === 'all' || $tableSelectedKinds.includes(kind)
  }

  function clearSearch(): void {
    confirmDeleteKey = null
    tableSearchQuery.set('')
  }

  function setSearch(value: string): void {
    confirmDeleteKey = null
    tableSearchQuery.set(value)
  }

  function clearKinds(): void {
    confirmDeleteKey = null
    setTableAllKinds()
  }

  function clearWords(): void {
    confirmDeleteKey = null
    setTableWordCountRange(undefined, undefined)
  }

  function clearUpdatedRange(): void {
    confirmDeleteKey = null
    setTableUpdatedRange('all')
  }

  function setWordRange(min: number | undefined, max: number | undefined): void {
    confirmDeleteKey = null
    setTableWordCountRange(min, max)
  }

  function setUpdatedRange(value: TableUpdatedRange): void {
    confirmDeleteKey = null
    setTableUpdatedRange(value)
  }

  function setSortBy(value: TableSortBy): void {
    confirmDeleteKey = null
    tableSortBy.set(value)
  }

  function resetFilters(): void {
    confirmDeleteKey = null
    resetTableFilters()
  }

  function activeFilterChips(): Array<{ id: string; label: string; clear: () => void }> {
    const chips: Array<{ id: string; label: string; clear: () => void }> = []
    const query = $tableSearchQuery.trim()
    if (query) chips.push({ id: 'search', label: `Search: ${query}`, clear: clearSearch })

    if ($tableKindFilterMode !== 'all') {
      chips.push({
        id: 'kind',
        label: $tableSelectedKinds.length ? `Kinds: ${$tableSelectedKinds.map(kindLabelForValue).join(', ')}` : 'Kinds: none',
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
      chips.push({ id: 'updated', label: `Date: ${label}`, clear: clearUpdatedRange })
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

  function targetWordCount(metadataJson: string | null): number | null {
    if (!metadataJson) return null
    try {
      const metadata = JSON.parse(metadataJson) as { targetWordCount?: unknown }
      return typeof metadata.targetWordCount === 'number' && Number.isFinite(metadata.targetWordCount)
        ? metadata.targetWordCount
        : null
    } catch {
      return null
    }
  }

  function tableKindValue(doc: { nodeType: string; kind: string | null }): string {
    return doc.nodeType === 'folder' ? STRUCTURAL_FOLDER_KIND_VALUE : documentKindValue(doc.kind)
  }

  function kindLabelForValue(value: string): string {
    if (value === STRUCTURAL_FOLDER_KIND_VALUE) return STRUCTURAL_FOLDER_KIND_LABEL
    return labelForDocumentKind(documentKindFromValue(value), $documentKindOptions)
  }

  function tableKindLabel(doc: { nodeType: string; kind: string | null }): string {
    if (doc.nodeType === 'folder') return STRUCTURAL_FOLDER_KIND_LABEL
    return labelForDocumentKind(doc.kind, $documentKindOptions)
  }

  function parseTargetWords(value: string): number | null {
    const parsed = parseWords(value)
    return parsed === undefined ? null : parsed
  }

  function onSelectRow(event: MouseEvent, id: string): void {
    event.stopPropagation()
    confirmDeleteKey = null
    toggleTableDocSelection(id, event.shiftKey)
  }

  function toggleVisibleSelection(): void {
    confirmDeleteKey = null
    toggleTableVisibleSelection()
  }

  function clearSelection(): void {
    confirmDeleteKey = null
    clearTableSelection()
  }

  async function archiveSelection(): Promise<void> {
    if (selectedCount === 0 || bulkBusy) return
    const selectedIds = [...$selectedTableDocIds]
    confirmDeleteKey = null
    bulkBusy = true
    try {
      const result = await archiveDocs(selectedIds)
      clearSelection()
      addToast('info', `Archived ${result.archivedIds.length} document${result.archivedIds.length === 1 ? '' : 's'}.`)
    } catch (error) {
      addToast('warn', error instanceof Error ? error.message : 'Selection could not be archived.')
    } finally {
      bulkBusy = false
    }
  }

  async function applyBulkKind(): Promise<void> {
    if (selectedFileCount === 0 || bulkBusy) {
      addToast('warn', 'Select at least one file to change kind.')
      return
    }
    const fileIds = [...$selectedTableFileIds]
    confirmDeleteKey = null
    bulkBusy = true
    try {
      for (const id of fileIds) {
        await updateDoc(id, { kind: documentKindFromValue(bulkKind) })
      }
      clearSelection()
      addToast('info', `Updated ${fileIds.length} file${fileIds.length === 1 ? '' : 's'}.`)
    } catch (error) {
      addToast('warn', error instanceof Error ? error.message : 'File kind could not be updated.')
    } finally {
      bulkBusy = false
    }
  }

  async function applyBulkTargetWords(): Promise<void> {
    const target = parseTargetWords(bulkTargetWords)
    if (target === null) {
      addToast('warn', 'Enter a target word count.')
      return
    }
    if (selectedFileCount === 0 || bulkBusy) {
      addToast('warn', 'Select at least one file to update target words.')
      return
    }
    const fileIds = [...$selectedTableFileIds]
    confirmDeleteKey = null
    bulkBusy = true
    try {
      for (const id of fileIds) {
        await updateDocMetadata(id, { targetWordCount: target })
      }
      clearSelection()
      addToast('info', `Set target words for ${fileIds.length} file${fileIds.length === 1 ? '' : 's'}.`)
    } catch (error) {
      addToast('warn', error instanceof Error ? error.message : 'Target word count could not be updated.')
    } finally {
      bulkBusy = false
    }
  }

  async function duplicateSelection(): Promise<void> {
    if (selectedCount === 0 || bulkBusy) return
    const selectedIds = [...$selectedTableDocIds]
    confirmDeleteKey = null
    bulkBusy = true
    try {
      const duplicated = await duplicateDocs(selectedIds)
      clearSelection()
      addToast('info', `Duplicated ${duplicated.length} document${duplicated.length === 1 ? '' : 's'}.`)
    } catch (error) {
      addToast('warn', error instanceof Error ? error.message : 'Selection could not be duplicated.')
    } finally {
      bulkBusy = false
    }
  }

  async function deleteSelection(): Promise<void> {
    if (selectedCount === 0 || bulkBusy) return
    if (confirmDeleteKey !== selectedKey) {
      confirmDeleteKey = selectedKey
      return
    }

    const selectedIds = [...$selectedTableDocIds]
    bulkBusy = true
    try {
      const result = await deleteDocs(selectedIds)
      clearSelection()
      addToast('info', `Deleted ${result.deletedIds.length} database record${result.deletedIds.length === 1 ? '' : 's'}.`)
    } catch (error) {
      addToast('warn', error instanceof Error ? error.message : 'Selection could not be deleted.')
    } finally {
      bulkBusy = false
    }
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

      if (detail.reset) resetFilters()
      if (detail.search !== undefined) setSearch(detail.search)
      if (detail.kinds !== undefined) {
        confirmDeleteKey = null
        setTableSelectedKinds(detail.kinds)
      }
      if (detail.wordsMin !== undefined || detail.wordsMax !== undefined) {
        setWordRange(detail.wordsMin, detail.wordsMax)
      }
      if (detail.updatedRange) setUpdatedRange(detail.updatedRange)
    }
    window.addEventListener('table:capture-set-filters', captureFilterListener)

    captureBulkListener = (event: Event) => {
      const detail = (event as CustomEvent<{
        count?: number
        kind?: string
        targetWords?: number
        applyKind?: boolean
        applyTargetWords?: boolean
        confirmDelete?: boolean
      }>).detail

      const rows = $filteredTableDocuments.slice(0, Math.max(1, detail.count ?? 3))
      clearSelection()
      for (const row of rows) {
        toggleTableDocSelection(row.id)
      }
      if (detail.kind) bulkKind = detail.kind
      if (detail.targetWords !== undefined) bulkTargetWords = String(detail.targetWords)
      if (detail.confirmDelete) confirmDeleteKey = rows.map(row => row.id).join('\0')
      if (detail.applyKind) void applyBulkKind()
      if (detail.applyTargetWords) void applyBulkTargetWords()
    }
    window.addEventListener('table:capture-set-bulk', captureBulkListener)
  })

  onDestroy(() => {
    if (captureFilterListener) {
      window.removeEventListener('table:capture-set-filters', captureFilterListener)
    }
    if (captureBulkListener) {
      window.removeEventListener('table:capture-set-bulk', captureBulkListener)
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
          value={$tableSearchQuery}
          oninput={(event) => setSearch(event.currentTarget.value)}
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
              {#each kindOptions as option (option.value)}
                <label class="kind-option">
                  <input
                    type="checkbox"
                    checked={isKindSelected(option.value)}
                    onchange={() => toggleKind(option.value)}
                  />
                  <span>{option.label}</span>
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
          onblur={(event) => setWordRange(parseWords(event.currentTarget.value), $tableWordCountMax)}
          onkeydown={(event) => {
            if (event.key === 'Enter') setWordRange(parseWords(event.currentTarget.value), $tableWordCountMax)
          }}
        />
        <input
          class="number-input"
          type="number"
          min="0"
          placeholder="Max words"
          value={$tableWordCountMax ?? ''}
          data-capture-table-words-max
          onblur={(event) => setWordRange($tableWordCountMin, parseWords(event.currentTarget.value))}
          onkeydown={(event) => {
            if (event.key === 'Enter') setWordRange($tableWordCountMin, parseWords(event.currentTarget.value))
          }}
        />
      </div>
      <label class="toolbar-field" for="table-updated-filter">
        <span class="sr-only">Date range</span>
        <select id="table-updated-filter" value={$tableUpdatedRange} onchange={(event) => setUpdatedRange(event.currentTarget.value as TableUpdatedRange)} data-capture-table-updated-range>
          {#each updatedRangeOptions as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>
      <label class="toolbar-field" for="table-sort">
        <span class="sr-only">Sort</span>
        <select id="table-sort" value={$tableSortBy} onchange={(event) => setSortBy(event.currentTarget.value as TableSortBy)}>
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
        onclick={resetFilters}
      >
        <XIcon size={14} weight="bold" aria-hidden="true" />
      </button>
    </header>
    <div class="filter-summary">
      <span>{$tableFilterSummary}</span>
      {#if $tableVisibleSelectedCount > 0}
        <span>{$tableVisibleSelectedCount} visible selected</span>
      {/if}
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
    {#if selectedCount > 0}
      <section class="bulk-bar" aria-label="Bulk document actions" data-capture-table-bulk-bar>
        <div class="bulk-summary">
          <strong>{selectedCount}</strong>
          <span>selected</span>
          {#if selectedFileCount > 0}
            <span>{selectedFileCount} file{selectedFileCount === 1 ? '' : 's'}</span>
          {/if}
          {#if selectedFolderCount > 0}
            <span>{selectedFolderCount} folder{selectedFolderCount === 1 ? '' : 's'}</span>
          {/if}
        </div>
        <button class="bulk-btn" type="button" disabled={bulkBusy} onclick={archiveSelection}>
          <ArchiveIcon size={14} weight="bold" aria-hidden="true" />
          Archive
        </button>
        <button class="bulk-btn" type="button" disabled={bulkBusy} onclick={duplicateSelection}>
          <CopyIcon size={14} weight="bold" aria-hidden="true" />
          Duplicate
        </button>
        <button
          class="bulk-btn danger"
          type="button"
          title={deleteConfirmationArmed ? 'Confirm database delete' : 'Delete database records'}
          aria-label={deleteConfirmationArmed ? 'Confirm database delete selected documents' : 'Delete selected database records'}
          disabled={bulkBusy}
          onclick={deleteSelection}
          data-capture-table-delete
        >
          {#if deleteConfirmationArmed}
            <CheckIcon size={14} weight="bold" aria-hidden="true" />
            Confirm delete
          {:else}
            <TrashIcon size={14} weight="bold" aria-hidden="true" />
            Delete from DB
          {/if}
        </button>
        <div class="bulk-group" aria-label="Change file kind">
          <select bind:value={bulkKind} disabled={bulkBusy || selectedFileCount === 0} data-capture-table-bulk-kind>
            {#each bulkKindOptions as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          <button class="bulk-btn" type="button" disabled={bulkBusy || selectedFileCount === 0} onclick={applyBulkKind}>Apply kind</button>
        </div>
        <div class="bulk-group" aria-label="Set target word count">
          <input
            class="bulk-number"
            type="number"
            min="0"
            placeholder="Target words"
            bind:value={bulkTargetWords}
            disabled={bulkBusy || selectedFileCount === 0}
            data-capture-table-bulk-target-words
          />
          <button class="bulk-btn" type="button" disabled={bulkBusy || selectedFileCount === 0} onclick={applyBulkTargetWords}>Set target</button>
        </div>
        {#if folderSkipText}
          <span class="bulk-note">{folderSkipText}</span>
        {/if}
        {#if deleteConfirmationArmed}
          <span class="bulk-note danger-note">Source files and folders stay on disk.</span>
        {/if}
        <button class="bulk-clear" type="button" disabled={bulkBusy} onclick={clearSelection}>Clear</button>
      </section>
    {/if}
  </div>
  <div class="table-wrapper">
    <table class="data-table">
      <thead>
        <tr>
          <th class="select-col">
            <button
              class="select-toggle"
              type="button"
              role="checkbox"
              aria-label="Select all visible documents"
              aria-checked={$tableAllVisibleSelected ? 'true' : $tableSomeVisibleSelected ? 'mixed' : 'false'}
              disabled={$filteredTableDocuments.length === 0}
              onclick={(event) => {
                event.stopPropagation()
                toggleVisibleSelection()
              }}
              data-capture-table-select-all
            >
              {$tableAllVisibleSelected ? '✓' : $tableSomeVisibleSelected ? '-' : ''}
            </button>
          </th>
          {#each columns as col (col)}
            <th>{col}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each $filteredTableDocuments as doc (doc.id)}
            <tr
              class:active={$selectedTableDocId === doc.id}
              class:selected={$selectedTableDocIds.includes(doc.id)}
              aria-selected={$selectedTableDocIds.includes(doc.id)}
              onclick={() => selectTableDoc(doc.id)}
            >
              <td class="select-cell">
                <input
                  type="checkbox"
                  aria-label={`Select ${doc.title}`}
                  checked={$selectedTableDocIds.includes(doc.id)}
                  onclick={(event) => onSelectRow(event, doc.id)}
                />
              </td>
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
              <td><span class="kind-badge">{tableKindLabel(doc)}</span></td>
              <td class="cell-date">{new Date(doc.updatedAt).toLocaleDateString()}</td>
              <td class="cell-num">{wordCount(doc.content)}</td>
              <td class="cell-num">{targetWordCount(doc.metadataJson) ?? '-'}</td>
            </tr>
        {:else}
          <tr>
            <td colspan="6" class="empty-cell">
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
  .bulk-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 var(--space-2) var(--space-2);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
  }
  .bulk-summary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    padding-right: var(--space-1);
    color: var(--color-fg-primary);
  }
  .bulk-summary span:not(:first-of-type) {
    color: var(--color-fg-muted);
  }
  .bulk-group {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .bulk-group select,
  .bulk-number,
  .bulk-btn,
  .bulk-clear {
    height: 28px;
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
    font: inherit;
    font-size: var(--font-size-xs);
  }
  .bulk-group select {
    width: 88px;
    padding: 0 var(--space-2);
  }
  .bulk-number {
    width: 104px;
    padding: 0 var(--space-2);
  }
  .bulk-btn,
  .bulk-clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0 var(--space-2);
    font-weight: 700;
  }
  .bulk-btn:hover:not(:disabled),
  .bulk-clear:hover:not(:disabled) {
    background: var(--color-bg-active);
  }
  .bulk-btn.danger {
    border-color: color-mix(in srgb, var(--color-danger, #c2410c) 40%, var(--color-border));
    color: var(--color-danger, #c2410c);
  }
  .bulk-btn.danger:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-danger, #c2410c) 12%, var(--color-bg-active));
  }
  .bulk-btn:disabled,
  .bulk-clear:disabled,
  .bulk-number:disabled,
  .bulk-group select:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .bulk-note {
    color: var(--color-fg-muted);
  }
  .danger-note {
    color: var(--color-danger, #c2410c);
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
  .data-table tr.selected td { background: color-mix(in srgb, var(--color-accent) 12%, transparent); }
  .select-col,
  .select-cell {
    width: 34px;
    min-width: 34px;
    max-width: 34px;
    padding-right: 0 !important;
    text-align: center !important;
  }
  .select-toggle,
  .select-cell input {
    width: 15px;
    height: 15px;
  }
  .select-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-bg-overlay);
    color: var(--color-accent);
    font-size: 11px;
    font-weight: 800;
    line-height: 1;
  }
  .select-cell input {
    accent-color: var(--color-accent);
  }
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
  .bulk-group select:focus-visible,
  .bulk-number:focus-visible,
  .bulk-btn:focus-visible,
  .bulk-clear:focus-visible,
  .select-toggle:focus-visible,
  .select-cell input:focus-visible,
  .doc-link:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
  }
  .cell-date { color: var(--color-fg-muted); font-variant-numeric: tabular-nums; }
  .cell-num { text-align: right; font-variant-numeric: tabular-nums; color: var(--color-fg-muted); }
  .kind-badge { font-size: var(--font-size-xs); color: var(--color-accent); background: var(--color-accent-dim); padding: 1px 6px; border-radius: var(--radius-sm); }
  .empty-cell { text-align: center; color: var(--color-fg-muted); padding: var(--space-6) !important; }
</style>
