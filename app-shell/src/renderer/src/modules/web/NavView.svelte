<!-- Web NavView — bookmarks and global history -->
<script lang="ts">
  import { PlusIcon } from 'phosphor-svelte'
  import {
    openBookmark,
    openBookmarkInNewTab,
    openHistoryItem,
    selectedBookmarkId,
    webBookmarks,
    webHistory
  } from './state'
</script>

<div class="nav-view">
  <section class="nav-section bookmarks">
    <header class="nav-header"><span class="nav-title">Bookmarks</span></header>
    <div class="bookmark-list">
      {#each $webBookmarks as bm (bm.id)}
        <div class="bm-row" class:active={$selectedBookmarkId === bm.id}>
          <button
            class="bm-item"
            aria-pressed={$selectedBookmarkId === bm.id}
            onclick={() => openBookmark(bm.id)}
          >
            <span class="bm-icon">{bm.icon}</span>
            <span class="bm-info">
              <span class="bm-title">{bm.title}</span>
              <span class="bm-url">{bm.url}</span>
            </span>
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
      {/each}
    </div>
  </section>

  <section class="nav-section history">
    <header class="nav-header"><span class="nav-title">History</span></header>
    <div class="history-list">
      {#each $webHistory as item (item.id)}
        <button class="history-item" onclick={() => openHistoryItem(item.id)}>
          <span class="history-title">{item.title}</span>
          <span class="history-url">{item.url}</span>
        </button>
      {/each}
    </div>
  </section>
</div>

<style>
  .nav-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .nav-section {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .bookmarks {
    flex: 0 0 auto;
    max-height: 44%;
  }

  .history {
    flex: 1;
  }

  .nav-header {
    display: flex;
    align-items: center;
    padding: var(--space-3);
    border-bottom: var(--border-zone);
    flex-shrink: 0;
  }

  .nav-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .bookmark-list,
  .history-list {
    overflow-y: auto;
    padding: var(--space-2);
  }

  .bm-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 26px;
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
    display: flex;
    flex-direction: column;
    gap: 1px;
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
</style>
