<script lang="ts">
  import { onMount } from 'svelte'
  import WorkspaceSwitcher from './WorkspaceSwitcher.svelte'

  // Phosphor icons — curated for each module (Icon-suffixed per Phosphor convention)
  import {
    PenNibIcon, NotebookIcon, ImageSquareIcon, LightningIcon,
    TableIcon, RobotIcon, GlobeSimpleIcon, TerminalIcon
  } from 'phosphor-svelte'

  import type { Component } from 'svelte'

  interface RailItem { id: string; label: string; icon: Component }
  interface Props {
    moduleId: string | null
    onSelect: (id: string) => void | Promise<void>
  }

  let { moduleId, onSelect }: Props = $props()
  let modules = $state<RailItem[]>([])
  let focusedControlId = $state<string | null>(null)

  const railOrder = [
    'shell.tableview',
    'shell.documents',
    'shell.journal',
    'shell.aichat',
    'shell.assets',
    'shell.workflow',
    'shell.web',
    'shell.promptstudio'
  ]

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

  const railModules = $derived(sortModules(modules.filter(mod => railOrder.includes(mod.id)), railOrder))
  const visibleControlIds = $derived(railModules.map(mod => mod.id))
  const tabStopId = $derived(focusedControlId ?? activeRailControlId())

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

  function sortModules(items: RailItem[], order: string[]): RailItem[] {
    return [...items].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  }

  function activeRailControlId(): string | null {
    if (moduleId && railModules.some(mod => mod.id === moduleId)) return moduleId
    return visibleControlIds[0] ?? null
  }

  function focusRailControl(id: string): void {
    focusedControlId = id
    requestAnimationFrame(() => {
      const button = document.querySelector<HTMLButtonElement>(`[data-rail-id="${id}"]`)
      button?.focus()
    })
  }

  function onRailKeydown(event: KeyboardEvent, currentId: string): void {
    const ids = visibleControlIds
    const currentIndex = Math.max(0, ids.indexOf(currentId))
    let nextId: string | null = null

    if (event.key === 'ArrowDown') nextId = ids[(currentIndex + 1) % ids.length]
    if (event.key === 'ArrowUp') nextId = ids[(currentIndex - 1 + ids.length) % ids.length]
    if (event.key === 'Home') nextId = ids[0]
    if (event.key === 'End') nextId = ids[ids.length - 1]

    if (nextId) {
      event.preventDefault()
      focusRailControl(nextId)
    }
  }

  async function selectModule(id: string): Promise<void> {
    focusedControlId = id
    await onSelect(id)
  }
</script>

<nav class="activity-rail" aria-label="Module navigation">
  <WorkspaceSwitcher />
  {#each railModules as mod (mod.id)}
    {@const isActive = moduleId === mod.id}
    <button
      class="rail-btn"
      class:active={isActive}
      title={mod.label}
      aria-label={mod.label}
      aria-current={isActive ? 'page' : undefined}
      data-rail-id={mod.id}
      tabindex={tabStopId === mod.id ? 0 : -1}
      onfocus={() => focusedControlId = mod.id}
      onkeydown={(event) => onRailKeydown(event, mod.id)}
      onclick={() => selectModule(mod.id)}
    >
      <mod.icon
        size={20}
        weight={isActive ? 'fill' : 'light'}
      />
      <span class="rail-tooltip" aria-hidden="true">{mod.label}</span>
    </button>
  {/each}
</nav>

<style>
  .activity-rail {
    grid-area: rail;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: var(--space-2);
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-shell-rail) 90%, var(--color-panel-glint)), var(--color-shell-rail));
    border-right: var(--border-zone);
    box-shadow: inset -1px 0 0 color-mix(in srgb, var(--color-panel-glint) 54%, transparent);
    gap: 2px;
  }

  .rail-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    color: color-mix(in srgb, var(--color-fg-secondary) 78%, var(--color-fg-muted));
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  }

  .rail-btn:hover {
    color: var(--color-fg-primary);
    background: var(--color-hover);
  }

  .rail-btn.active {
    color: var(--accent-nav);
    background: color-mix(in srgb, var(--accent-nav) 16%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-nav) 28%, transparent);
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
    background: linear-gradient(180deg, var(--accent-nav), var(--accent-editor));
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent-nav) 48%, transparent);
  }

  .rail-tooltip {
    position: absolute;
    left: calc(100% + var(--space-2));
    top: 50%;
    z-index: 20;
    min-width: max-content;
    max-width: 220px;
    transform: translateY(-50%) translateX(-4px);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border-strong);
    box-shadow: var(--shadow-panel);
    color: var(--color-fg-primary);
    font-size: var(--font-size-xs);
    font-weight: 650;
    line-height: 1.3;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s ease, transform 0.12s ease;
  }

  .rail-btn:hover .rail-tooltip,
  .rail-btn:focus-visible .rail-tooltip {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }

</style>
