<!-- Web MainView — browser with URL bar and Electron webview -->
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
    syncLoadedPage,
    toggleCurrentBookmark,
    webLoading
  } from './state'

  function reload(): void {
    reloadPage()
    const surface = document.querySelector('webview.web-surface') as { reload?: () => void } | null
    surface?.reload?.()
  }

  function onDidNavigate(event: Event): void {
    const url = (event as Event & { url?: string }).url
    if (url) syncLoadedPage(url)
  }

  function onPageTitleUpdated(event: Event): void {
    const title = (event as Event & { title?: string }).title
    if (title) syncLoadedPage($currentUrl, title)
  }
</script>

<div class="main-view">
  <header class="url-bar">
    <button class="nav-btn" title="Back" onclick={goBack} disabled={!$canGoBack}>←</button>
    <button class="nav-btn" title="Forward" onclick={goForward} disabled={!$canGoForward}>→</button>
    <button class="nav-btn" title="Reload" onclick={reload}>{$webLoading ? '⟳' : '↻'}</button>
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
    <webview
      class="web-surface"
      src={$currentUrl}
      partition="persist:app-shell-web"
      allowpopups={false}
      ondid-navigate={onDidNavigate}
      onpage-title-updated={onPageTitleUpdated}
    ></webview>
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
  .browser-area { flex: 1; min-height: 0; background: var(--color-bg-base); }
  .web-surface { display: block; width: 100%; height: 100%; border: 0; background: white; }
</style>
