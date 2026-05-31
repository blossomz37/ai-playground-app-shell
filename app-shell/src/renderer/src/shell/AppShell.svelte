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
  import JobsPanel from './JobsPanel.svelte'
  import { handleGlobalKeydown, registerCommand } from '../store/commands'
  import { activeModuleId, activeWorkspace, workspaces, workspaceId, switchWorkspace, createWorkspace as createWorkspaceAction } from '../store'
  import { toggleJobsPanel } from '../store/jobs'
  import { importAssets } from '../modules/assets/state'
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
  let workspaceMenuOpen = $state(false)
  let createWorkspaceOpen = $state(false)
  let workspaceName = $state('')
  let workspaceType = $state('authoring')
  let workspaceBusy = $state(false)
  let workspaceError = $state<string | null>(null)
  let activeModuleUnsubscribe: (() => void) | null = null
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

  async function onWorkspaceSelect(event: Event) {
    const id = (event.target as HTMLSelectElement).value
    await switchWorkspace(id)
  }

  async function onCreateWorkspace() {
    if (!workspaceName.trim()) return
    workspaceBusy = true
    workspaceError = null
    try {
      await createWorkspaceAction({ name: workspaceName, type: workspaceType })
      workspaceName = ''
      workspaceType = 'authoring'
      createWorkspaceOpen = false
      workspaceMenuOpen = false
    } catch (err) {
      workspaceError = err instanceof Error ? err.message : String(err)
    } finally {
      workspaceBusy = false
    }
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
      registerCommand('shell.layout.zenMode', toggleZen),
      registerCommand('shell.jobs.toggle', toggleJobsPanel),
      registerCommand('assets.import', () => importAssets())
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
    activeModuleUnsubscribe?.()
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
  style:--_sidebar-w="{sidebarWidth}px"
  style:--_inspector-w="{inspectorWidth}px"
>
  <div class="topbar">
    <div class="workspace-switcher">
      <button
        class="workspace-button"
        type="button"
        aria-expanded={workspaceMenuOpen}
        onclick={() => workspaceMenuOpen = !workspaceMenuOpen}
      >
        <span class="workspace-name">{$activeWorkspace?.name ?? 'Workspace'}</span>
        <span class="workspace-type">{$activeWorkspace?.type ?? 'default'}</span>
      </button>

      {#if workspaceMenuOpen}
        <div class="workspace-menu">
          <label class="field-label" for="workspace-select">Workspace</label>
          <select id="workspace-select" value={$workspaceId} onchange={onWorkspaceSelect}>
            {#each $workspaces as workspace (workspace.id)}
              <option value={workspace.id}>{workspace.name}</option>
            {/each}
          </select>

          <button
            class="new-workspace-toggle"
            type="button"
            onclick={() => createWorkspaceOpen = !createWorkspaceOpen}
          >
            {createWorkspaceOpen ? 'Cancel' : 'New workspace'}
          </button>

          {#if createWorkspaceOpen}
            <form class="workspace-form" onsubmit={(event) => { event.preventDefault(); void onCreateWorkspace() }}>
              <input
                aria-label="Workspace name"
                placeholder="Workspace name"
                bind:value={workspaceName}
                disabled={workspaceBusy}
              />
              <select aria-label="Workspace type" bind:value={workspaceType} disabled={workspaceBusy}>
                <option value="authoring">authoring</option>
                <option value="research">research</option>
                <option value="default">default</option>
              </select>
              <button type="submit" disabled={workspaceBusy || !workspaceName.trim()}>
                {workspaceBusy ? 'Creating...' : 'Create'}
              </button>
              {#if workspaceError}
                <p class="workspace-error">{workspaceError}</p>
              {/if}
            </form>
          {/if}
        </div>
      {/if}
    </div>
  </div>
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
<JobsPanel />

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
    display: flex;
    align-items: center;
    padding-left: 84px;
    padding-right: var(--space-3);
  }

  .workspace-switcher {
    position: relative;
    -webkit-app-region: no-drag;
  }

  .workspace-button {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    min-width: 220px;
    max-width: 360px;
    height: 28px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-md);
    color: var(--color-fg-primary);
    background: transparent;
    border: var(--border-subtle);
    cursor: pointer;
  }

  .workspace-button:hover {
    background: var(--color-bg-overlay);
  }

  .workspace-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .workspace-type {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    flex-shrink: 0;
  }

  .workspace-menu {
    position: absolute;
    top: 32px;
    left: 0;
    width: 320px;
    z-index: 400;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
    box-shadow: 0 12px 32px rgb(0 0 0 / 0.22);
  }

  .field-label {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    font-weight: 600;
  }

  .workspace-menu select,
  .workspace-form input {
    width: 100%;
    min-height: 30px;
    padding: 0 var(--space-2);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-base);
    color: var(--color-fg-primary);
  }

  .new-workspace-toggle,
  .workspace-form button {
    min-height: 30px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    background: var(--color-accent);
    color: var(--color-bg-base);
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .new-workspace-toggle {
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
    border: var(--border-subtle);
  }

  .workspace-form {
    display: grid;
    gap: var(--space-2);
  }

  .workspace-form button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .workspace-error {
    margin: 0;
    color: var(--color-danger);
    font-size: var(--font-size-xs);
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
