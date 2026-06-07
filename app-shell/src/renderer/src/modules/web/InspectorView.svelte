<!-- Web InspectorView — active tab and session info -->
<script lang="ts">
  import { activeTabHistory, currentBookmarked, currentTitle, currentUrl, toggleCurrentBookmark, webLoading, webTabs } from './state'
  import { formatUrlSecondary, getWebUrlMetadata } from './url-display'

  let urlMetadata = $derived(getWebUrlMetadata($currentUrl))
</script>

<div class="inspector-view">
  <section class="section">
    <h3 class="section-title">Page</h3>
    <div class="page-card">
      <span class="page-domain">{urlMetadata.domain}</span>
      <h4>{$currentTitle}</h4>
      <p>{urlMetadata.displayUrl}</p>
      <div class="page-actions">
        <span class="load-state" class:loading={$webLoading}>{$webLoading ? 'Loading' : 'Ready'}</span>
        <button type="button" class:active={$currentBookmarked} onclick={toggleCurrentBookmark}>
          {$currentBookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
      </div>
    </div>
  </section>

  <section class="section">
    <h3 class="section-title">Open Work</h3>
    <div class="meta-grid">
      <span class="meta-label">Tabs</span><span class="meta-value">{$webTabs.length} open</span>
      <span class="meta-label">Status</span><span class="meta-value">{urlMetadata.securityLabel}</span>
      <span class="meta-label">Saved</span><span class="meta-value">{$currentBookmarked ? 'In bookmarks' : 'Not bookmarked'}</span>
    </div>
  </section>

  <section class="section">
    <h3 class="section-title">Recent In This Tab</h3>
    <div class="history-stack">
      {#each $activeTabHistory.slice(0, 6) as item (item.id)}
        <div class="history-row">
          <span class="history-title">{item.title}</span>
          <span class="history-url">{formatUrlSecondary(item.url)}</span>
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .inspector-view {
    padding: var(--space-4);
  }

  .section {
    margin-bottom: var(--space-5);
  }

  .section-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-3);
  }

  .page-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-bg-overlay);
  }

  .page-domain {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .page-card h4 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: var(--font-size-md);
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .page-card p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .page-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-1);
  }

  .load-state {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .load-state.loading {
    color: var(--color-accent);
  }

  .page-actions button {
    min-width: 0;
    padding: 4px var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    background: var(--color-bg-surface);
    font-size: var(--font-size-xs);
    font-weight: 700;
    cursor: pointer;
  }

  .page-actions button.active {
    color: var(--color-accent);
  }

  .meta-grid {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-1) var(--space-3);
    font-size: var(--font-size-sm);
  }

  .meta-label {
    color: var(--color-fg-muted);
  }

  .meta-value {
    color: var(--color-fg-secondary);
    min-width: 0;
  }

  .history-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .history-row {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
  }

  .history-title {
    font-size: var(--font-size-xs);
    color: var(--color-fg-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .history-url {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 900px) {
    .inspector-view {
      padding: var(--space-3);
    }
  }
</style>
