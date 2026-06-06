<!-- ──────────────────────────────────────────────
  File:        AppShell.svelte
  Description: Root layout shell with dynamic grid, resize handles, persist/restore
  Version:     0.3.0
  Created:     2026-05-29
  Modified:    2026-05-29
  Author:      carlo
  ────────────────────────────────────────────── -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import ActivityRail from './ActivityRail.svelte'
  import Sidebar from './Sidebar.svelte'
  import MainPane from './MainPane.svelte'
  import Inspector from './Inspector.svelte'
  import ContextStrip from './ContextStrip.svelte'
  import StatusBar from './StatusBar.svelte'
  import CommandPalette from './CommandPalette.svelte'
  import ToastContainer from './ToastContainer.svelte'
  import ContextMenu from './ContextMenu.svelte'
  import SettingsPanel from './SettingsPanel.svelte'
  import JobsPanel from './JobsPanel.svelte'
  import { handleGlobalKeydown, registerCommand } from '../store/commands'
  import { activeModuleId } from '../store'
  import { ensureActiveModuleAvailable, isModuleReachable, loadModules } from '../store/modules'
  import { FALLBACK_MODULE_ID } from '@shared/module-policy'
  import { toggleJobsPanel } from '../store/jobs'
  import { importAssets } from '../modules/assets/state'
  import {
    closeActiveTab,
    goBack as webGoBack,
    goForward as webGoForward,
    newTab as webNewTab,
    toggleCurrentBookmark as webToggleCurrentBookmark
  } from '../modules/web/state'
  import type { Disposable, LayoutState } from '@shared/module-contract'

  let settingsPanel = $state<{ toggle(): void }>()
  let commandDisposables: Disposable[] = []

  // ── Layout state ──────────────────────────────────────────────────────────
  let sidebarWidth = $state(240)
  let inspectorWidth = $state(280)
  let sidebarVisible = $state(true)
  let inspectorVisible = $state(true)
  let zenMode = $state(false)
  let layoutLoaded = $state(false)
  let captureModuleListener: ((event: Event) => void) | null = null
  let captureSettingsListener: (() => void) | null = null
  let captureJobsListener: (() => void) | null = null

  // Default widths for double-click reset
  const DEFAULT_SIDEBAR_WIDTH = 240
  const DEFAULT_INSPECTOR_WIDTH = 280

  // Active resize tracking
  let resizing = $state<'sidebar' | 'inspector' | null>(null)
  let resizeStartX = 0
  let resizeStartWidth = 0

  // Compute shared shell tracks dynamically. Rows that represent the same zones
  // consume these variables so titlebar/context/body/status stay aligned.
  let railColumn = $derived(zenMode ? '0px' : '46px')
  let sidebarColumn = $derived(zenMode ? '0px' : sidebarVisible ? `${sidebarWidth}px` : '0px')
  let inspectorColumn = $derived(zenMode ? '0px' : inspectorVisible ? `${inspectorWidth}px` : '0px')
  let gridColumns = $derived('var(--_rail-col) var(--_sidebar-col) minmax(0, 1fr) var(--_inspector-col)')

  function applyLayout(state: LayoutState) {
    sidebarWidth = state.sidebarWidth
    inspectorWidth = state.inspectorWidth
    sidebarVisible = state.sidebarVisible
    inspectorVisible = state.inspectorVisible
    zenMode = state.zenMode
  }

  async function toggleSidebar() {
    const state = await window.shell.layout.toggle('sidebar')
    applyLayout(state)
  }

  async function toggleInspector() {
    const state = await window.shell.layout.toggle('inspector')
    applyLayout(state)
  }

  async function toggleZen() {
    const state = await window.shell.layout.toggleZen()
    applyLayout(state)
  }

  async function selectModule(id: string) {
    await loadModules()
    if (!isModuleReachable(id)) {
      activeModuleId.set(FALLBACK_MODULE_ID)
      await window.shell.modules.activate(FALLBACK_MODULE_ID)
      return
    }
    activeModuleId.set(id)
    await window.shell.modules.activate(id)
  }

  // ── Resize handles ────────────────────────────────────────────────────────

  function onResizeStart(zone: 'sidebar' | 'inspector', e: PointerEvent) {
    resizing = zone
    resizeStartX = e.clientX
    resizeStartWidth = zone === 'sidebar' ? sidebarWidth : inspectorWidth
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onResizeMove(e: PointerEvent) {
    if (!resizing) return
    const dx = e.clientX - resizeStartX
    if (resizing === 'sidebar') {
      sidebarWidth = Math.max(120, Math.min(600, resizeStartWidth + dx))
    } else {
      // Inspector drags leftward = increase, rightward = decrease
      inspectorWidth = Math.max(120, Math.min(600, resizeStartWidth - dx))
    }
  }

  function onResizeEnd() {
    if (!resizing) return
    const zone = resizing
    const px = zone === 'sidebar' ? sidebarWidth : inspectorWidth
    resizing = null
    // Persist the new size
    window.shell.layout.resize(zone, px)
  }

  /** Double-click a resize handle to reset to default width. */
  function onResizeReset(zone: 'sidebar' | 'inspector') {
    const defaultPx = zone === 'sidebar' ? DEFAULT_SIDEBAR_WIDTH : DEFAULT_INSPECTOR_WIDTH
    if (zone === 'sidebar') {
      sidebarWidth = defaultPx
    } else {
      inspectorWidth = defaultPx
    }
    window.shell.layout.resize(zone, defaultPx)
  }

  onMount(async () => {
    // Restore persisted layout
    try {
      const state = await window.shell.layout.get()
      applyLayout(state)
    } catch { /* use defaults */ }
    layoutLoaded = true
    ensureActiveModuleAvailable()

    // Register commands
    commandDisposables.push(
      registerCommand('shell.settings', () => settingsPanel?.toggle()),
      registerCommand('shell.layout.toggleSidebar', toggleSidebar),
      registerCommand('shell.layout.toggleInspector', toggleInspector),
      registerCommand('shell.layout.zenMode', toggleZen),
      registerCommand('shell.jobs.toggle', toggleJobsPanel),
      registerCommand('assets.import', () => importAssets()),
      registerCommand('web.newTab', () => webNewTab()),
      registerCommand('web.closeTab', closeActiveTab),
      registerCommand('web.back', webGoBack),
      registerCommand('web.forward', webGoForward),
      registerCommand('web.reload', () => window.dispatchEvent(new Event('web:reload'))),
      registerCommand('web.bookmark', webToggleCurrentBookmark)
    )

    captureModuleListener = (event: Event) => {
      const moduleId = (event as CustomEvent<string>).detail
      if (moduleId) void selectModule(moduleId)
    }
    window.addEventListener('shell:capture-select-module', captureModuleListener)

    captureSettingsListener = () => settingsPanel?.toggle()
    window.addEventListener('shell:capture-open-settings', captureSettingsListener)

    captureJobsListener = () => toggleJobsPanel()
    window.addEventListener('shell:capture-open-jobs', captureJobsListener)

    if (window.shell.capture?.moduleId) {
      await selectModule(window.shell.capture.moduleId)
    }
  })

  onDestroy(() => {
    if (captureModuleListener) {
      window.removeEventListener('shell:capture-select-module', captureModuleListener)
    }
    if (captureSettingsListener) {
      window.removeEventListener('shell:capture-open-settings', captureSettingsListener)
    }
    if (captureJobsListener) {
      window.removeEventListener('shell:capture-open-jobs', captureJobsListener)
    }
    for (const d of commandDisposables) d.dispose()
  })
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div
  class="app-shell"
  class:zen={zenMode}
  class:resizing={resizing !== null}
  style:grid-template-columns={gridColumns}
  style:--_rail-col={railColumn}
  style:--_sidebar-col={sidebarColumn}
  style:--_inspector-col={inspectorColumn}
  style:--_sidebar-w="{sidebarWidth}px"
  style:--_inspector-w="{inspectorWidth}px"
>
  <div class="topbar" aria-hidden="true"></div>
  <ContextStrip
    moduleId={$activeModuleId}
    {sidebarVisible}
    {inspectorVisible}
    {zenMode}
    onToggleSidebar={toggleSidebar}
    onToggleInspector={toggleInspector}
    onToggleZen={toggleZen}
  />
  {#if !zenMode}
    <ActivityRail moduleId={$activeModuleId} onSelect={selectModule} />
  {/if}
  {#if sidebarVisible && !zenMode}
    {#key $activeModuleId}
      <Sidebar moduleId={$activeModuleId} />
    {/key}
  {/if}
  {#key $activeModuleId}
    <MainPane moduleId={$activeModuleId} />
  {/key}

  <!-- Sidebar resize handle -->
  {#if sidebarVisible && !zenMode}
    <div
      class="resize-handle resize-sidebar"
      class:active={resizing === 'sidebar'}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      onpointerdown={(e) => onResizeStart('sidebar', e)}
      onpointermove={onResizeMove}
      onpointerup={onResizeEnd}
      ondblclick={() => onResizeReset('sidebar')}
    ></div>
  {/if}

  {#if inspectorVisible && !zenMode}
    <!-- Inspector resize handle -->
    <div
      class="resize-handle resize-inspector"
      class:active={resizing === 'inspector'}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize inspector"
      onpointerdown={(e) => onResizeStart('inspector', e)}
      onpointermove={onResizeMove}
      onpointerup={onResizeEnd}
      ondblclick={() => onResizeReset('inspector')}
    ></div>
    {#key $activeModuleId}
      <Inspector moduleId={$activeModuleId} />
    {/key}
  {/if}
  {#if !zenMode}
    <StatusBar moduleId={$activeModuleId === 'shell.documents' ? 'shell.documents' : null} />
  {/if}
</div>

<CommandPalette />
<ToastContainer />
<ContextMenu />
<SettingsPanel bind:this={settingsPanel} />
<JobsPanel />

<style>
  .app-shell {
    --_topbar-h: 36px;
    --_context-h: 34px;
    --_status-h: 30px;

    display: grid;
    grid-template-areas:
      "topbar topbar topbar topbar"
      "contextstrip contextstrip contextstrip contextstrip"
      "rail   sidebar main   inspector"
      "statusbar statusbar statusbar statusbar";
    grid-template-rows: var(--_topbar-h) var(--_context-h) 1fr var(--_status-h);
    height: 100vh;
    overflow: hidden;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-shell-topbar) 80%, transparent), transparent 180px),
      var(--color-shell-main);
    position: relative;
    /* Smooth panel slide transitions */
    transition: grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Disable transition while actively dragging so resize feels instant */
  .app-shell.resizing {
    transition: none;
  }

  /* Zen mode: simplified grid — only main pane visible */
  .app-shell.zen {
    grid-template-areas:
      "topbar topbar topbar topbar"
      "contextstrip contextstrip contextstrip contextstrip"
      "main   main   main   main"
      "main   main   main   main";
    grid-template-rows: var(--_topbar-h) var(--_context-h) 1fr 0px;
  }

  /* Full-width draggable zone that clears the macOS traffic lights.
     36px = standard macOS Big Sur+ title bar height with hiddenInset. */
  .topbar {
    grid-area: topbar;
    position: relative;
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-shell-topbar) 92%, var(--color-panel-glint)), var(--color-shell-topbar));
    -webkit-app-region: drag;
    border-bottom: var(--border-zone);
    box-shadow: inset 0 1px 0 var(--color-panel-glint);
  }

  /* In zen mode, make the topbar transparent so the content feels full-bleed */
  .zen .topbar {
    background: transparent;
    border-bottom: none;
  }

  /* ── Resize handles ──────────────────────────────────────────────────── */
  .resize-handle {
    position: absolute;
    top: calc(var(--_topbar-h) + var(--_context-h));
    bottom: var(--_status-h);
    width: 5px;
    cursor: col-resize;
    z-index: 100;
    transition: background 0.15s, box-shadow 0.15s, opacity 0.15s;
  }

  .resize-handle:hover,
  .resize-handle.active {
    background: var(--accent-editor);
    box-shadow: 0 0 14px color-mix(in srgb, var(--accent-editor) 48%, transparent);
    opacity: 0.62;
  }

  .resize-sidebar {
    /* Positioned at the right edge of the sidebar column */
    left: calc(var(--_rail-col) + var(--_sidebar-w, 240px) - 2px);
  }

  .resize-inspector {
    /* Positioned at the left edge of the inspector column */
    right: calc(var(--_inspector-w, 280px) - 2px);
  }
</style>
