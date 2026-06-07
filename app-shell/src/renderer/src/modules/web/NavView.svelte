<!-- Web NavView — bookmarks and global history -->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { PlusIcon, TrashSimpleIcon } from 'phosphor-svelte'
  import InlineRename from '../../shell/InlineRename.svelte'
  import { addToast } from '../../store/toasts'
  import {
    clearWebHistory,
    openBookmark,
    openBookmarkInNewTab,
    openHistoryItem,
    renameBookmark,
    selectedBookmarkId,
    webBookmarks,
    webHistory
  } from './state'
  import { formatUrlSecondary, formatVisitedAt } from './url-display'

  let renamingBookmarkId = $state<string | null>(null)
  let navMode = $state<'bookmarks' | 'history'>('bookmarks')
  let captureNavListener: EventListener | null = null
  let captureClearHistoryListener: EventListener | null = null

  function startRename(event: MouseEvent, id: string): void {
    event.stopPropagation()
    renamingBookmarkId = id
  }

  function cancelRename(): void {
    renamingBookmarkId = null
  }

  function commitRename(id: string, title: string): void {
    if (!title) {
      addToast('warn', 'Bookmark title cannot be blank.')
      cancelRename()
      return
    }
    renameBookmark(id, title)
    cancelRename()
  }

  function clearHistory(): void {
    if ($webHistory.length === 0) return
    const confirmed = window.confirm('Clear all browsing history for this workspace?')
    if (!confirmed) return
    clearWebHistory()
  }

  onMount(() => {
    captureNavListener = (event: Event) => {
      const mode = (event as CustomEvent<string>).detail
      if (mode === 'bookmarks' || mode === 'history') navMode = mode
    }
    captureClearHistoryListener = () => clearWebHistory()
    window.addEventListener('web:capture-set-nav', captureNavListener)
    window.addEventListener('web:capture-clear-history', captureClearHistoryListener)
  })

  onDestroy(() => {
    if (captureNavListener) window.removeEventListener('web:capture-set-nav', captureNavListener)
    if (captureClearHistoryListener) window.removeEventListener('web:capture-clear-history', captureClearHistoryListener)
  })
</script>

<div class="nav-view">
  <header class="zone-header nav-header">
    <div class="segmented-control" role="group" aria-label="Web navigation">
      <button
        class:active={navMode === 'bookmarks'}
        aria-pressed={navMode === 'bookmarks'}
        onclick={() => navMode = 'bookmarks'}
      >
        Bookmarks
      </button>
      <button
        class:active={navMode === 'history'}
        aria-pressed={navMode === 'history'}
        onclick={() => navMode = 'history'}
      >
        History
      </button>
    </div>
  </header>

  {#if navMode === 'bookmarks'}
    <section class="nav-section bookmarks" aria-label="Bookmarks">
      <div class="bookmark-list">
        {#if $webBookmarks.length === 0}
          <p class="empty-state">No bookmarks saved yet.</p>
        {/if}
        {#each $webBookmarks as bm (bm.id)}
          <div class="bm-row" class:active={$selectedBookmarkId === bm.id}>
            {#if renamingBookmarkId === bm.id}
              <InlineRename
                value={bm.title}
                ariaLabel="Rename bookmark"
                onCommit={(title) => commitRename(bm.id, title)}
                onCancel={cancelRename}
              />
            {:else}
              <button
                class="bm-item"
                aria-pressed={$selectedBookmarkId === bm.id}
                onclick={() => openBookmark(bm.id)}
              >
                <span class="bm-icon">{bm.icon}</span>
                <span class="bm-info">
                  <span class="bm-title">{bm.title}</span>
                  <span class="bm-url">{formatUrlSecondary(bm.url)}</span>
                </span>
              </button>
              <div class="row-actions">
                <button
                  class="row-action"
                  title="Rename"
                  aria-label={`Rename ${bm.title}`}
                  onclick={(event) => startRename(event, bm.id)}
                >
                  ✎
                </button>
                <button
                  class="row-action"
                  title="Open in new tab"
                  aria-label="Open bookmark in new tab"
                  onclick={() => openBookmarkInNewTab(bm.id)}
                >
                  <PlusIcon size={13} weight="bold" />
                </button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  {:else}
    <section class="nav-section history" aria-label="History">
      <div class="history-tools">
        <span>{$webHistory.length} {$webHistory.length === 1 ? 'visit' : 'visits'}</span>
        <button
          type="button"
          class="clear-history"
          data-capture-clear-web-history
          disabled={$webHistory.length === 0}
          title="Clear browsing history"
          aria-label="Clear browsing history"
          onclick={clearHistory}
        >
          <TrashSimpleIcon size={13} weight="bold" />
          Clear
        </button>
      </div>
      <div class="history-list">
        {#if $webHistory.length === 0}
          <p class="empty-state">Browsing history is clear.</p>
        {/if}
        {#each $webHistory as item (item.id)}
          <button class="history-item" onclick={() => openHistoryItem(item.id)}>
            <span class="history-title">{item.title}</span>
            <span class="history-url">{formatUrlSecondary(item.url)}</span>
            <span class="history-time">{formatVisitedAt(item.visitedAt)}</span>
          </button>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .nav-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .nav-header {
    padding: var(--space-2);
  }

  .segmented-control {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
    padding: 2px;
    border-radius: var(--radius-md);
    background: var(--color-bg-overlay);
  }

  .segmented-control button {
    min-width: 0;
    height: 24px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    cursor: pointer;
  }

  .segmented-control button.active {
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
    box-shadow: var(--shadow-subtle);
  }

  .nav-section {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
  }

  .bookmarks {
    min-height: 0;
  }

  .history {
    flex: 1;
  }

  .bookmark-list,
  .history-list {
    overflow-y: auto;
    padding: var(--space-2);
  }

  .empty-state {
    margin: var(--space-3);
    color: var(--color-fg-muted);
    font-size: var(--font-size-sm);
  }

  .history-tools {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-2) 0;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .clear-history {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    height: 24px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    background: var(--color-bg-overlay);
    cursor: pointer;
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .clear-history:hover:not(:disabled) {
    color: var(--color-danger);
    background: var(--color-bg-surface);
  }

  .clear-history:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .bm-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 50px;
    align-items: center;
    border-radius: var(--radius-md);
    color: var(--color-fg-secondary);
  }

  .bm-row:hover {
    background: var(--color-bg-overlay);
  }

  .bm-row.active {
    background: var(--color-accent-dim);
    color: var(--color-accent);
  }

  .bm-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    width: 100%;
    padding: var(--space-2) var(--space-1) var(--space-2) var(--space-3);
    text-align: left;
    color: inherit;
    cursor: pointer;
  }

  .bm-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .bm-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .bm-title,
  .history-title {
    font-size: var(--font-size-sm);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bm-url,
  .history-url {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
  }

  .row-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 0;
  }

  .bm-row:hover .row-actions,
  .bm-row.active .row-actions,
  .row-actions:focus-within {
    opacity: 1;
  }

  .row-action:hover {
    color: var(--color-fg-primary);
    background: var(--color-bg-overlay);
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .history-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1px var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    text-align: left;
    color: var(--color-fg-secondary);
    cursor: pointer;
  }

  .history-item:hover {
    background: var(--color-accent-dim);
  }

  .history-title,
  .history-url {
    grid-column: 1;
  }

  .history-time {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: center;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    white-space: nowrap;
  }

  @media (max-width: 900px) {
    .nav-header {
      padding: var(--space-1);
    }

    .bookmark-list,
    .history-list {
      padding: var(--space-1);
    }

    .history-tools {
      padding: var(--space-1) var(--space-1) 0;
    }

    .bm-row {
      grid-template-columns: minmax(0, 1fr) 46px;
    }

    .history-time {
      display: none;
    }
  }
</style>
