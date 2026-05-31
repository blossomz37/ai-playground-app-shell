<!-- Web MainView — browser with URL bar (placeholder for webview) -->
<script lang="ts">
  import {
    canGoBack,
    canGoForward,
    currentBookmarked,
    currentTitle,
    currentUrl,
    goBack,
    goForward,
    navigateTo,
    reloadPage,
    toggleCurrentBookmark,
    webLoading
  } from './state'
</script>

<div class="main-view">
  <header class="url-bar">
    <button class="nav-btn" title="Back" onclick={goBack} disabled={!$canGoBack}>←</button>
    <button class="nav-btn" title="Forward" onclick={goForward} disabled={!$canGoForward}>→</button>
    <button class="nav-btn" title="Reload" onclick={reloadPage}>{$webLoading ? '⟳' : '↻'}</button>
    <input
      class="url-input"
      type="url"
      value={$currentUrl}
      oninput={(event) => currentUrl.set(event.currentTarget.value)}
      onkeydown={(event) => event.key === 'Enter' && navigateTo($currentUrl)}
    />
    <button class="nav-btn" title={$currentBookmarked ? 'Remove bookmark' : 'Bookmark'} onclick={toggleCurrentBookmark}>
      {$currentBookmarked ? '★' : '☆'}
    </button>
  </header>
  <div class="browser-area">
    <div class="browser-placeholder">
      <span class="placeholder-icon">🌐</span>
      <h2 class="placeholder-title">{$currentTitle}</h2>
      <p class="placeholder-text">Embedded browsing via Electron webview.<br/>Navigate to a URL above to start.</p>
      <span class="placeholder-url">{$currentUrl}</span>
    </div>
  </div>
</div>

<style>
  .main-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .url-bar { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-bottom: var(--border-subtle); flex-shrink: 0; background: var(--color-bg-surface); }
  .nav-btn {
    width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
    border-radius: var(--radius-sm); color: var(--color-fg-muted); font-size: 14px; cursor: pointer; transition: background 0.1s, color 0.1s;
  }
  .nav-btn:hover { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .nav-btn:disabled:hover { background: transparent; color: var(--color-fg-muted); }
  .url-input {
    flex: 1; padding: var(--space-1) var(--space-3); background: var(--color-bg-overlay); border: var(--border-subtle);
    border-radius: var(--radius-md); color: var(--color-fg-primary); font-family: var(--font-sans);
    font-size: var(--font-size-sm); outline: none;
  }
  .url-input:focus { border-color: var(--color-accent); }
  .browser-area { flex: 1; display: flex; align-items: center; justify-content: center; }
  .browser-placeholder { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); color: var(--color-fg-muted); text-align: center; }
  .placeholder-icon { font-size: 48px; }
  .placeholder-title { font-size: var(--font-size-xl); font-weight: 600; color: var(--color-fg-secondary); }
  .placeholder-text { font-size: var(--font-size-sm); line-height: 1.6; }
  .placeholder-url { font-size: var(--font-size-xs); font-family: var(--font-mono); color: var(--color-accent); background: var(--color-accent-dim); padding: 2px 10px; border-radius: var(--radius-sm); }
</style>
