<!-- Web InspectorView — active tab and session info -->
<script lang="ts">
  import { activeTab, activeTabHistory, currentBookmarked, currentTitle, currentUrl, webTabs } from './state'

  const protocol = $derived($currentUrl.startsWith('https://') ? 'HTTPS' : $currentUrl.startsWith('http://') ? 'HTTP' : 'Pending')
</script>

<div class="inspector-view">
  <section class="section">
    <h3 class="section-title">Page Info</h3>
    <div class="meta-grid">
      <span class="meta-label">Title</span><span class="meta-value">{$currentTitle}</span>
      <span class="meta-label">URL</span><span class="meta-value url">{$currentUrl}</span>
      <span class="meta-label">Protocol</span><span class="meta-value">{protocol}</span>
      <span class="meta-label">Bookmark</span><span class="meta-value">{$currentBookmarked ? 'Saved' : 'Not saved'}</span>
    </div>
  </section>

  <section class="section">
    <h3 class="section-title">Tab</h3>
    <div class="meta-grid">
      <span class="meta-label">Open tabs</span><span class="meta-value">{$webTabs.length}</span>
      <span class="meta-label">Tab history</span><span class="meta-value">{$activeTab.historyStack.length}</span>
      <span class="meta-label">History index</span><span class="meta-value">{$activeTab.historyIndex + 1}</span>
      <span class="meta-label">Session</span><span class="meta-value">Persistent</span>
    </div>
  </section>

  <section class="section">
    <h3 class="section-title">Current Tab History</h3>
    <div class="history-stack">
      {#each $activeTabHistory.slice(0, 6) as item (item.id)}
        <div class="history-row">
          <span class="history-title">{item.title}</span>
          <span class="history-url">{item.url}</span>
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

  .meta-value.url {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    word-break: break-all;
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
</style>
