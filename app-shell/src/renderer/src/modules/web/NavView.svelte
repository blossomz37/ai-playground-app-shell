<!-- Web NavView — bookmarks and history -->
<script lang="ts">
  const bookmarks = [
    { id: '1', title: 'Wikipedia', url: 'https://wikipedia.org', icon: '🌐' },
    { id: '2', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: '📖' },
    { id: '3', title: 'Research Paper', url: 'https://arxiv.org', icon: '📄' },
  ]
  let activeBookmark = $state('1')
</script>

<div class="nav-view">
  <header class="nav-header"><span class="nav-title">Bookmarks</span></header>
  <div class="bookmark-list">
    {#each bookmarks as bm}
      <button class="bm-item" class:active={activeBookmark === bm.id} onclick={() => (activeBookmark = bm.id)}>
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
    <p class="history-hint">No recent history</p>
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
  .history-hint { font-size: var(--font-size-xs); color: var(--color-fg-muted); padding: var(--space-3); }
</style>
