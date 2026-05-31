<!-- Web NavView — bookmarks and history -->
<script lang="ts">
  import { openBookmark, selectedBookmarkId, webBookmarks, webHistory } from './state'
</script>

<div class="nav-view">
  <header class="nav-header"><span class="nav-title">Bookmarks</span></header>
  <div class="bookmark-list">
    {#each $webBookmarks as bm (bm.id)}
      <button
        class="bm-item"
        class:active={$selectedBookmarkId === bm.id}
        aria-pressed={$selectedBookmarkId === bm.id}
        onclick={() => openBookmark(bm.id)}
      >
        <span class="bm-icon">{bm.icon}</span>
        <div class="bm-info">
          <span class="bm-title">{bm.title}</span>
          <span class="bm-url">{bm.url}</span>
        </div>
      </button>
    {/each}
  </div>
  <div class="nav-section">
    <header class="nav-header"><span class="nav-title">History</span></header>
    <div class="history-list">
      {#each $webHistory as item (item.id)}
        <div class="history-item">
          <span class="history-title">{item.title}</span>
          <span class="history-url">{item.url}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-header { display: flex; align-items: center; padding: var(--space-3); border-bottom: var(--border-subtle); flex-shrink: 0; }
  .nav-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); }
  .bookmark-list { overflow-y: auto; padding: var(--space-2); }
  .bm-item { display: flex; align-items: center; gap: var(--space-2); width: 100%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); text-align: left; color: var(--color-fg-secondary); transition: background 0.1s; cursor: pointer; }
  .bm-item:hover { background: var(--color-bg-overlay); }
  .bm-item.active { background: var(--color-accent-dim); color: var(--color-accent); }
  .bm-icon { font-size: 14px; flex-shrink: 0; }
  .bm-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .bm-title { font-size: var(--font-size-sm); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bm-url { font-size: var(--font-size-xs); color: var(--color-fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-section { flex: 1; display: flex; flex-direction: column; }
  .history-list { padding: var(--space-2); display: flex; flex-direction: column; gap: var(--space-1); overflow-y: auto; }
  .history-item { display: flex; flex-direction: column; gap: 1px; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); background: var(--color-bg-overlay); }
  .history-title { font-size: var(--font-size-xs); color: var(--color-fg-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .history-url { font-size: var(--font-size-xs); color: var(--color-fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
