<!-- Assets MainView — asset preview/detail -->
<div class="main-view">
  <div class="preview-area">
    <div class="placeholder-img">
      <span class="placeholder-icon">🖼</span>
      <span class="placeholder-text">hero-banner.png</span>
      <span class="placeholder-meta">1920 × 1080 · PNG · 1.2 MB</span>
    </div>
  </div>
  <div class="asset-actions">
    <button class="action-btn">Open in Finder</button>
    <button class="action-btn">Copy Path</button>
    <button class="action-btn danger">Remove</button>
  </div>
</div>

<style>
  .main-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .preview-area { flex: 1; display: flex; align-items: center; justify-content: center; padding: var(--space-6); }
  .placeholder-img {
    display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
    padding: var(--space-6); border: 2px dashed var(--color-border); border-radius: var(--radius-lg);
    color: var(--color-fg-muted); max-width: 400px; width: 100%;
  }
  .placeholder-icon { font-size: 48px; }
  .placeholder-text { font-size: var(--font-size-md); font-weight: 500; color: var(--color-fg-secondary); }
  .placeholder-meta { font-size: var(--font-size-xs); }
  .asset-actions { display: flex; gap: var(--space-2); padding: var(--space-3) var(--space-6); border-top: var(--border-subtle); }
  .action-btn {
    padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-size-sm);
    color: var(--color-fg-secondary); background: var(--color-bg-overlay); cursor: pointer; transition: background 0.1s, color 0.1s;
  }
  .action-btn:hover { background: var(--color-bg-active); color: var(--color-fg-primary); }
  .action-btn.danger:hover { color: var(--color-danger); }
</style>
