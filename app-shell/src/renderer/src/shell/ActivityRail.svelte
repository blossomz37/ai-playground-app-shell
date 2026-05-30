<script lang="ts">
  import { onMount } from 'svelte'
  import { activeModuleId } from '../store'
  import { executeCommand } from '../store/commands'

  // Phosphor icons — curated for each module (Icon-suffixed per Phosphor convention)
  import {
    PenNibIcon, NotebookIcon, ImageSquareIcon, LightningIcon,
    TableIcon, RobotIcon, GlobeSimpleIcon, GearSixIcon, TerminalIcon
  } from 'phosphor-svelte'

  import type { Component } from 'svelte'

  interface RailItem { id: string; label: string; icon: Component }

  let modules = $state<RailItem[]>([])

  const iconMap: Record<string, Component> = {
    'shell.documents': PenNibIcon,
    'shell.journal':   NotebookIcon,
    'shell.assets':    ImageSquareIcon,
    'shell.workflow':  LightningIcon,
    'shell.tableview': TableIcon,
    'shell.aichat':    RobotIcon,
    'shell.web':       GlobeSimpleIcon,
    'shell.promptstudio': TerminalIcon
  }

  onMount(async () => {
    const list = await window.shell.modules.list()
    modules = list
      .filter(m => m.enabled)
      .map(m => ({
        id: m.id,
        label: m.name,
        icon: iconMap[m.id] ?? PenNibIcon
      }))
  })
</script>

<nav class="activity-rail" aria-label="Module navigation">
  <div class="rail-spacer"></div>
  {#each modules as mod}
    {@const isActive = $activeModuleId === mod.id}
    <button
      class="rail-btn"
      class:active={isActive}
      title={mod.label}
      aria-current={isActive ? 'page' : undefined}
      onclick={async () => {
        activeModuleId.set(mod.id)
        await window.shell.modules.activate(mod.id)
      }}
    >
      <mod.icon
        size={20}
        weight={isActive ? 'fill' : 'light'}
      />
    </button>
  {/each}

  <div class="rail-bottom">
    <button
      class="rail-btn settings-btn"
      title="Settings (Cmd+,)"
      onclick={() => executeCommand('shell.settings')}
    >
      <GearSixIcon size={20} weight="light" />
    </button>
  </div>
</nav>

<style>
  .activity-rail {
    grid-area: rail;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: var(--space-2);
    background: var(--color-bg-surface);
    border-right: var(--border-subtle);
    gap: 2px;
  }

  .rail-spacer { flex: 0 0 var(--space-1); }

  .rail-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    color: var(--color-fg-muted);
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .rail-btn:hover {
    color: var(--color-fg-secondary);
    background: var(--color-bg-overlay);
  }

  .rail-btn.active {
    color: var(--color-accent);
    background: var(--color-accent-dim);
  }

  /* Active indicator bar on left edge */
  .rail-btn.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    border-radius: 0 2px 2px 0;
    background: var(--color-accent);
  }

  /* Bottom utilities */
  .rail-bottom {
    margin-top: auto;
    padding-bottom: var(--space-2);
  }
</style>
