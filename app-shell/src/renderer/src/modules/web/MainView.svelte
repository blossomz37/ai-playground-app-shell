<!-- Web MainView — tabbed browser surface with URL bar and Electron webview -->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import {
    ArrowClockwiseIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    PlusIcon,
    StarIcon,
    XIcon
  } from 'phosphor-svelte'
  import {
    activeTabId,
    canGoBack,
    canGoForward,
    closeTab,
    currentBookmarked,
    currentUrl,
    goBack,
    goForward,
    navigateTo,
    newTab,
    reloadPage,
    requestedUrl,
    selectTab,
    setActiveTabLoading,
    syncLoadedPage,
    toggleCurrentBookmark,
    webLoading,
    webTabs
  } from './state'

  let reloadListener: EventListener | null = null
  let captureNavigateListener: EventListener | null = null
  let addressInput = $derived($currentUrl)

  function reload(): void {
    reloadPage()
    const surface = document.querySelector('webview.web-surface') as { reload?: () => void } | null
    surface?.reload?.()
  }

  function onDidNavigate(event: Event): void {
    const url = (event as Event & { url?: string }).url
    if (url) {
      syncLoadedPage(url)
    }
  }

  function onPageTitleUpdated(event: Event): void {
    const title = (event as Event & { title?: string }).title
    if (title) syncLoadedPage($currentUrl, title)
  }

  function closeTabFromButton(event: MouseEvent, id: string): void {
    event.stopPropagation()
    closeTab(id)
  }

  onMount(() => {
    reloadListener = () => reload()
    captureNavigateListener = (event: Event) => {
      const url = (event as CustomEvent<string>).detail
      if (url) navigateTo(url)
    }
    window.addEventListener('web:reload', reloadListener)
    window.addEventListener('web:capture-navigate', captureNavigateListener)
  })

  onDestroy(() => {
    if (reloadListener) window.removeEventListener('web:reload', reloadListener)
    if (captureNavigateListener) window.removeEventListener('web:capture-navigate', captureNavigateListener)
  })
</script>

<div class="main-view">
  <header class="zone-header tab-strip" aria-label="Browser tabs">
    <div class="tabs">
      {#each $webTabs as tab (tab.id)}
        <div
          class="tab"
          class:active={$activeTabId === tab.id}
          title={tab.title}
        >
          <button
            class="tab-open"
            aria-pressed={$activeTabId === tab.id}
            onclick={() => selectTab(tab.id)}
          >
            <span class="tab-title">{tab.title}</span>
          </button>
          <button
            class="tab-close"
            title="Close tab"
            aria-label="Close tab"
            onclick={(event) => closeTabFromButton(event, tab.id)}
          >
            <XIcon size={12} weight="bold" />
          </button>
        </div>
      {/each}
    </div>
    <button class="icon-btn new-tab" title="New tab" aria-label="New tab" onclick={() => newTab()}>
      <PlusIcon size={15} weight="bold" />
    </button>
  </header>

  <header class="url-bar">
    <button class="icon-btn" title="Back" aria-label="Back" onclick={goBack} disabled={!$canGoBack}>
      <ArrowLeftIcon size={17} weight="bold" />
    </button>
    <button class="icon-btn" title="Forward" aria-label="Forward" onclick={goForward} disabled={!$canGoForward}>
      <ArrowRightIcon size={17} weight="bold" />
    </button>
    <button class="icon-btn" title="Reload" aria-label="Reload" onclick={reload} class:spinning={$webLoading}>
      <ArrowClockwiseIcon size={17} weight="bold" />
    </button>
    <input
      class="url-input"
      type="url"
      value={addressInput}
      aria-label="URL"
      oninput={(event) => {
        addressInput = event.currentTarget.value
      }}
      onkeydown={(event) => event.key === 'Enter' && navigateTo(addressInput)}
    />
    <button
      class="icon-btn"
      class:bookmarked={$currentBookmarked}
      title={$currentBookmarked ? 'Remove bookmark' : 'Bookmark'}
      aria-label={$currentBookmarked ? 'Remove bookmark' : 'Bookmark'}
      onclick={toggleCurrentBookmark}
    >
      <StarIcon size={17} weight={$currentBookmarked ? 'fill' : 'bold'} />
    </button>
  </header>

  <div class="browser-area">
    {#key $activeTabId}
      <webview
        class="web-surface"
        src={$requestedUrl}
        partition="persist:app-shell-web"
        allowpopups={false}
        ondid-start-loading={() => setActiveTabLoading(true)}
        ondid-stop-loading={() => setActiveTabLoading(false)}
        ondid-navigate={onDidNavigate}
        onpage-title-updated={onPageTitleUpdated}
      ></webview>
    {/key}
  </div>
</div>

<style>
  .main-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .tab-strip {
    align-items: stretch;
    min-height: var(--shell-zone-header-h);
    height: var(--shell-zone-header-h);
    padding: 0;
    background: var(--color-bg-base);
  }

  .tabs {
    display: flex;
    align-items: stretch;
    flex: 1;
    min-width: 0;
    overflow-x: auto;
  }

  .tab {
    position: relative;
    width: 184px;
    min-width: 132px;
    max-width: 220px;
    border-right: var(--border-zone);
    color: var(--color-fg-secondary);
    background: transparent;
  }

  .tab:hover {
    background: var(--color-bg-overlay);
  }

  .tab.active {
    color: var(--color-fg-primary);
    background: var(--color-bg-surface);
    box-shadow: inset 0 -2px 0 var(--color-accent);
  }

  .tab-open {
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
    padding: 5px 28px 5px 10px;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .tab-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .tab-title {
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .tab-close {
    position: absolute;
    top: 50%;
    right: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    margin-top: -9px;
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
  }

  .tab-close:hover {
    color: var(--color-fg-primary);
    background: var(--color-bg-overlay);
  }

  .url-bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-bottom: var(--border-zone);
    flex-shrink: 0;
    background: var(--color-bg-surface);
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    flex-shrink: 0;
  }

  .icon-btn:hover {
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
  }

  .icon-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .icon-btn:disabled:hover {
    background: transparent;
    color: var(--color-fg-muted);
  }

  .icon-btn.bookmarked {
    color: var(--color-accent);
  }

  .new-tab {
    margin: 6px;
  }

  .spinning {
    color: var(--color-accent);
  }

  .url-input {
    flex: 1;
    min-width: 80px;
    padding: var(--space-1) var(--space-3);
    background: var(--color-bg-overlay);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    color: var(--color-fg-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    outline: none;
  }

  .url-input:focus {
    border-color: var(--color-accent);
  }

  .browser-area {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: var(--color-bg-base);
  }

  .web-surface {
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    min-height: 0;
    border: 0;
    background: white;
  }
</style>
