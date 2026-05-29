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
  import type { Disposable } from '@shared/module-contract'

  let settingsPanel = $state<{ toggle(): void }>()
  let settingsDisposable: Disposable | null = null

  onMount(() => {
    settingsDisposable = registerCommand('shell.settings', () => settingsPanel?.toggle())
  })

  onDestroy(() => {
    settingsDisposable?.dispose()
  })
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="app-shell">
  <div class="topbar"></div>
  <ActivityRail />
  <Sidebar />
  <MainPane />
  <Inspector />
  <StatusBar />
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
    grid-template-columns: 48px 240px 1fr 280px;
    grid-template-rows: 36px 1fr 30px;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg-base);
  }

  /* Full-width draggable zone that clears the macOS traffic lights.
     36px = standard macOS Big Sur+ title bar height with hiddenInset. */
  .topbar {
    grid-area: topbar;
    background: var(--color-bg-surface);
    -webkit-app-region: drag;
    border-bottom: var(--border-subtle);
  }
</style>
