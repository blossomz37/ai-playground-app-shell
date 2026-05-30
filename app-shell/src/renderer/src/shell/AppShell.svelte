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
  import StatusBar from './StatusBar.svelte'
  import CommandPalette from './CommandPalette.svelte'
  import ToastContainer from './ToastContainer.svelte'
  import ContextMenu from './ContextMenu.svelte'
  import SettingsPanel from './SettingsPanel.svelte'
  import { handleGlobalKeydown, registerCommand } from '../store/commands'
  import { activeModuleId } from '../store'
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
  let activeModule = $state<string | null>(null)
  let activeModuleUnsubscribe: (() => void) | null = null
  let captureModuleListener: ((event: Event) => void) | null = null

  // Default widths for double-click reset
  const DEFAULT_SIDEBAR_WIDTH = 240
  const DEFAULT_INSPECTOR_WIDTH = 280

  // Active resize tracking
  let resizing = $state<'sidebar' | 'inspector' | null>(null)
  let resizeStartX = 0
  let resizeStartWidth = 0

  // Compute grid-template-columns dynamically
  // In zen mode, hide the activity rail too for full immersion
  let gridColumns = $derived(
    zenMode
      ? '0px 0px 1fr 0px'
      : `48px ${sidebarVisible ? sidebarWidth + 'px' : '0px'} 1fr ${inspectorVisible ? inspectorWidth + 'px' : '0px'}`
  )

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
    activeModule = id
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
    activeModuleUnsubscribe = activeModuleId.subscribe((id) => {
      activeModule = id
    })

    // Restore persisted layout
    try {
      const state = await window.shell.layout.get()
      applyLayout(state)
    } catch { /* use defaults */ }
    layoutLoaded = true

    // Register commands
    commandDisposables.push(
      registerCommand('shell.settings', () => settingsPanel?.toggle()),
      registerCommand('shell.layout.toggleSidebar', toggleSidebar),
      registerCommand('shell.layout.toggleInspector', toggleInspector),
      registerCommand('shell.layout.zenMode', toggleZen)
    )

    captureModuleListener = (event: Event) => {
      const moduleId = (event as CustomEvent<string>).detail
      if (moduleId) void selectModule(moduleId)
    }
    window.addEventListener('shell:capture-select-module', captureModuleListener)

    if (window.shell.capture?.moduleId) {
      await selectModule(window.shell.capture.moduleId)
    }
  })

  onDestroy(() => {
    activeModuleUnsubscribe?.()
    if (captureModuleListener) {
      window.removeEventListener('shell:capture-select-module', captureModuleListener)
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
  style:--_sidebar-w="{sidebarWidth}px"
  style:--_inspector-w="{inspectorWidth}px"
>
  <div class="topbar"></div>
  {#if !zenMode}
    <ActivityRail moduleId={activeModule} onSelect={selectModule} />
  {/if}
  {#if sidebarVisible && !zenMode}
    <Sidebar moduleId={activeModule} />
  {/if}
  {#if activeModule === 'shell.documents'}
    <MainPane moduleId="shell.documents" />
  {:else if activeModule === 'shell.journal'}
    <MainPane moduleId="shell.journal" />
  {:else if activeModule === 'shell.assets'}
    <MainPane moduleId="shell.assets" />
  {:else if activeModule === 'shell.workflow'}
    <MainPane moduleId="shell.workflow" />
  {:else if activeModule === 'shell.tableview'}
    <MainPane moduleId="shell.tableview" />
  {:else if activeModule === 'shell.aichat'}
    <MainPane moduleId="shell.aichat" />
  {:else if activeModule === 'shell.web'}
    <MainPane moduleId="shell.web" />
  {:else if activeModule === 'shell.promptstudio'}
    <MainPane moduleId="shell.promptstudio" />
  {:else}
    <MainPane moduleId={null} />
  {/if}

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
    {#if activeModule === 'shell.documents'}
      <Inspector moduleId="shell.documents" />
    {:else if activeModule === 'shell.journal'}
      <Inspector moduleId="shell.journal" />
    {:else if activeModule === 'shell.assets'}
      <Inspector moduleId="shell.assets" />
    {:else if activeModule === 'shell.workflow'}
      <Inspector moduleId="shell.workflow" />
    {:else if activeModule === 'shell.tableview'}
      <Inspector moduleId="shell.tableview" />
    {:else if activeModule === 'shell.aichat'}
      <Inspector moduleId="shell.aichat" />
    {:else if activeModule === 'shell.web'}
      <Inspector moduleId="shell.web" />
    {:else if activeModule === 'shell.promptstudio'}
      <Inspector moduleId="shell.promptstudio" />
    {:else}
      <Inspector moduleId={null} />
    {/if}
  {/if}
  {#if !zenMode}
    {#if activeModule === 'shell.documents'}
      <StatusBar moduleId="shell.documents" />
    {:else}
      <StatusBar moduleId={null} />
    {/if}
  {/if}
</div>

<CommandPalette />
<ToastContainer />
<ContextMenu />
<SettingsPanel bind:this={settingsPanel} />

<style>
  .app-shell {
    display: grid;
    grid-template-areas:
      "topbar topbar topbar topbar"
      "rail   sidebar main   inspector"
      "rail   sidebar statusbar statusbar";
    grid-template-rows: 36px 1fr 30px;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg-base);
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
      "main   main   main   main"
      "main   main   main   main";
    grid-template-rows: 36px 1fr 0px;
  }

  /* Full-width draggable zone that clears the macOS traffic lights.
     36px = standard macOS Big Sur+ title bar height with hiddenInset. */
  .topbar {
    grid-area: topbar;
    background: var(--color-bg-surface);
    -webkit-app-region: drag;
    border-bottom: var(--border-subtle);
  }

  /* In zen mode, make the topbar transparent so the content feels full-bleed */
  .zen .topbar {
    background: transparent;
    border-bottom: none;
  }

  /* ── Resize handles ──────────────────────────────────────────────────── */
  .resize-handle {
    position: absolute;
    top: 36px;           /* below topbar */
    bottom: 30px;        /* above status bar */
    width: 5px;
    cursor: col-resize;
    z-index: 100;
    transition: background 0.15s;
  }

  .resize-handle:hover,
  .resize-handle.active {
    background: var(--color-accent);
    opacity: 0.5;
  }

  .resize-sidebar {
    /* Positioned at the right edge of the sidebar column */
    left: calc(48px + var(--_sidebar-w, 240px) - 2px);
  }

  .resize-inspector {
    /* Positioned at the left edge of the inspector column */
    right: calc(var(--_inspector-w, 280px) - 2px);
  }
</style>
