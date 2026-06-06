<script lang="ts">
  import { onMount } from 'svelte'

  // Phosphor icons — curated for each module (Icon-suffixed per Phosphor convention)
  import {
    PenNibIcon, NotebookIcon, ImageSquareIcon, LightningIcon,
    TableIcon, RobotIcon, GlobeSimpleIcon, TerminalIcon
  } from 'phosphor-svelte'

  import type { Component } from 'svelte'
  import { moduleList, loadModules } from '../store/modules'

  interface RailItem { id: string; label: string; icon: Component }
  interface Props {
    moduleId: string | null
    onSelect: (id: string) => void | Promise<void>
  }

  let { moduleId, onSelect }: Props = $props()
  let focusedControlId = $state<string | null>(null)
  let customRailOrder = $state<string[] | null>(null)
  let draggingModuleId = $state<string | null>(null)
  let dragOverModuleId = $state<string | null>(null)
  let dragOverPlacement = $state<'before' | 'after'>('before')

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
  const RAIL_ORDER_SETTING = 'activityRail.order'

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

  const effectiveRailOrder = $derived(normalizeRailOrder(customRailOrder ?? railOrder))
  const modules = $derived($moduleList
    .filter(module => module.enabled && module.visible)
    .map(module => ({
      id: module.id,
      label: module.name,
      icon: iconMap[module.id] ?? PenNibIcon
    })))
  const railModules = $derived(sortModules(modules.filter(mod => railOrder.includes(mod.id)), effectiveRailOrder))
  const visibleControlIds = $derived(railModules.map(mod => mod.id))
  const tabStopId = $derived(focusedControlId ?? activeRailControlId())

  onMount(async () => {
    const [, savedOrder] = await Promise.all([
      loadModules(),
      window.shell.settings.get(RAIL_ORDER_SETTING) as Promise<unknown>
    ])

    if (Array.isArray(savedOrder)) {
      customRailOrder = normalizeRailOrder(savedOrder.filter(item => typeof item === 'string'))
    }
  })

  function sortModules(items: RailItem[], order: string[]): RailItem[] {
    return [...items].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  }

  function normalizeRailOrder(order: string[]): string[] {
    const seen: string[] = []
    const normalized: string[] = []

    for (const id of order) {
      if (!railOrder.includes(id) || seen.includes(id)) continue
      seen.push(id)
      normalized.push(id)
    }

    for (const id of railOrder) {
      if (seen.includes(id)) continue
      seen.push(id)
      normalized.push(id)
    }

    return normalized
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

  function onRailDragStart(event: DragEvent, id: string): void {
    draggingModuleId = id
    dragOverModuleId = null
    event.dataTransfer?.setData('text/plain', id)

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
    }
  }

  function onRailDragOver(event: DragEvent, id: string): void {
    if (!draggingModuleId || draggingModuleId === id) return
    event.preventDefault()

    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    dragOverModuleId = id
    dragOverPlacement = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before'

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  function onRailDragLeave(event: DragEvent, id: string): void {
    const target = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return
    if (dragOverModuleId === id) {
      dragOverModuleId = null
    }
  }

  async function onRailDrop(event: DragEvent, id: string): Promise<void> {
    event.preventDefault()
    if (!draggingModuleId || draggingModuleId === id) {
      clearDragState()
      return
    }

    await moveRailModule(draggingModuleId, id, dragOverPlacement)
    clearDragState()
  }

  function onRailDragEnd(): void {
    clearDragState()
  }

  async function moveRailModule(sourceId: string, targetId: string, placement: 'before' | 'after'): Promise<void> {
    const currentOrder = railModules.map(mod => mod.id)
    const nextOrder = currentOrder.filter(id => id !== sourceId)
    const targetIndex = nextOrder.indexOf(targetId)
    if (targetIndex === -1) return

    nextOrder.splice(placement === 'after' ? targetIndex + 1 : targetIndex, 0, sourceId)
    customRailOrder = normalizeRailOrder(nextOrder)
    await window.shell.settings.set(RAIL_ORDER_SETTING, customRailOrder)
  }

  function clearDragState(): void {
    draggingModuleId = null
    dragOverModuleId = null
  }
</script>

<nav class="activity-rail" aria-label="Module navigation">
  {#each railModules as mod (mod.id)}
    {@const isActive = moduleId === mod.id}
    <button
      class="rail-btn"
      class:active={isActive}
      class:dragging={draggingModuleId === mod.id}
      class:drop-before={dragOverModuleId === mod.id && dragOverPlacement === 'before'}
      class:drop-after={dragOverModuleId === mod.id && dragOverPlacement === 'after'}
      title={`${mod.label} (drag to reorder)`}
      aria-label={mod.label}
      aria-current={isActive ? 'page' : undefined}
      data-rail-id={mod.id}
      draggable="true"
      tabindex={tabStopId === mod.id ? 0 : -1}
      onfocus={() => focusedControlId = mod.id}
      onkeydown={(event) => onRailKeydown(event, mod.id)}
      ondragstart={(event) => onRailDragStart(event, mod.id)}
      ondragover={(event) => onRailDragOver(event, mod.id)}
      ondragleave={(event) => onRailDragLeave(event, mod.id)}
      ondrop={(event) => onRailDrop(event, mod.id)}
      ondragend={onRailDragEnd}
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
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-shell-rail) 84%, var(--color-panel-glint)), var(--color-shell-rail));
    border-right: 1px solid color-mix(in srgb, var(--color-border-strong) 80%, transparent);
    box-shadow: inset -1px 0 0 color-mix(in srgb, var(--color-panel-glint) 46%, transparent);
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
    cursor: grab;
    transition: color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  }

  .rail-btn:active {
    cursor: grabbing;
  }

  .rail-btn:hover {
    color: var(--color-fg-primary);
    background: var(--color-hover);
  }

  .rail-btn.active {
    color: var(--accent-nav);
    background: color-mix(in srgb, var(--accent-nav) 8%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-nav) 18%, transparent);
  }

  .rail-btn.dragging {
    opacity: 0.46;
  }

  /* Active indicator bar on left edge */
  .rail-btn.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 5px;
    bottom: 5px;
    width: 3px;
    border-radius: 0 2px 2px 0;
    background: var(--accent-nav);
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent-nav) 42%, transparent);
  }

  .rail-btn.drop-before::after,
  .rail-btn.drop-after::after {
    content: '';
    position: absolute;
    left: 6px;
    right: 6px;
    height: 2px;
    border-radius: 999px;
    background: var(--color-focus-ring);
    box-shadow: 0 0 10px color-mix(in srgb, var(--color-focus-ring) 64%, transparent);
  }

  .rail-btn.drop-before::after {
    top: -2px;
  }

  .rail-btn.drop-after::after {
    bottom: -2px;
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

  .rail-btn.dragging .rail-tooltip {
    opacity: 0;
  }

</style>
