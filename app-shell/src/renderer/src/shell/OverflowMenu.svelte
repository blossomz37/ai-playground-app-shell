<script lang="ts" module>
  export interface OverflowMenuItem {
    id: string
    label: string
    tone?: 'default' | 'danger'
    disabled?: boolean
    separatorBefore?: boolean
    keepOpen?: boolean
    onSelect: () => void | Promise<void>
  }
</script>

<script lang="ts">
  import { tick } from 'svelte'
  import { DotsThreeVerticalIcon } from 'phosphor-svelte'

  interface Props {
    ariaLabel: string
    items: OverflowMenuItem[]
    disabled?: boolean
  }

  let { ariaLabel, items, disabled = false }: Props = $props()
  let open = $state(false)
  let rootElement: HTMLDivElement | null = $state(null)
  let triggerElement: HTMLButtonElement | null = $state(null)
  let menuStyle = $state('')

  function trackRoot(node: HTMLDivElement): () => void {
    rootElement = node
    return () => {
      if (rootElement === node) rootElement = null
    }
  }

  function trackTrigger(node: HTMLButtonElement): () => void {
    triggerElement = node
    return () => {
      if (triggerElement === node) triggerElement = null
    }
  }

  function enabledItems(): HTMLButtonElement[] {
    if (!rootElement) return []
    return Array.from(rootElement.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'))
  }

  function focusItem(index: number): void {
    const buttons = enabledItems()
    if (buttons.length === 0) return
    buttons[(index + buttons.length) % buttons.length]?.focus()
  }

  function positionMenu(): void {
    if (!triggerElement) return
    const rect = triggerElement.getBoundingClientRect()
    const width = 208
    const estimatedHeight = Math.min(360, Math.max(44, items.length * 36 + 12))
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
    const below = rect.bottom + 4
    const top = below + estimatedHeight <= window.innerHeight - 8
      ? below
      : Math.max(8, rect.top - estimatedHeight - 4)
    menuStyle = `left: ${left}px; top: ${top}px;`
  }

  async function toggleMenu(): Promise<void> {
    if (disabled) return
    open = !open
    if (!open) return
    await tick()
    positionMenu()
    focusItem(0)
  }

  function closeMenu(restoreFocus = false): void {
    if (!open) return
    open = false
    if (restoreFocus) queueMicrotask(() => triggerElement?.focus())
  }

  function onDocumentClick(event: MouseEvent): void {
    if (!open || !rootElement) return
    if (event.target instanceof Node && rootElement.contains(event.target)) return
    closeMenu()
  }

  function onWindowResize(): void {
    closeMenu()
  }

  function onMenuKeydown(event: KeyboardEvent): void {
    const buttons = enabledItems()
    const activeIndex = buttons.findIndex(button => button === document.activeElement)

    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeMenu(true)
      return
    }
    if (event.key === 'Tab') {
      closeMenu()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusItem(activeIndex + 1)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusItem(activeIndex <= 0 ? buttons.length - 1 : activeIndex - 1)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      focusItem(0)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      focusItem(buttons.length - 1)
    }
  }

  async function selectItem(item: OverflowMenuItem): Promise<void> {
    if (item.disabled) return
    if (!item.keepOpen) closeMenu(true)
    await item.onSelect()
    if (item.keepOpen && open) {
      await tick()
      positionMenu()
    }
  }
</script>

<svelte:document onclick={onDocumentClick} />
<svelte:window onresize={onWindowResize} />

<div class="overflow-menu" {@attach trackRoot}>
  <button
    class="overflow-trigger"
    type="button"
    {@attach trackTrigger}
    aria-label={ariaLabel}
    title={ariaLabel}
    aria-haspopup="menu"
    aria-expanded={open}
    {disabled}
    onclick={() => void toggleMenu()}
  >
    <DotsThreeVerticalIcon size={16} weight="bold" aria-hidden="true" />
  </button>

  {#if open}
    <div
      class="overflow-popover"
      role="menu"
      tabindex="-1"
      aria-label={ariaLabel}
      style={menuStyle}
      onkeydown={onMenuKeydown}
    >
      {#each items as item (item.id)}
        <button
          class="overflow-item"
          class:danger={item.tone === 'danger'}
          class:separated={item.separatorBefore}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onclick={() => void selectItem(item)}
        >
          {item.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .overflow-menu {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
  }

  .overflow-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
  }

  .overflow-trigger:hover:not(:disabled),
  .overflow-trigger:focus-visible,
  .overflow-trigger[aria-expanded='true'] {
    color: var(--color-fg-primary);
    background: var(--color-hover);
    border-color: color-mix(in srgb, var(--color-border-strong) 58%, transparent);
  }

  .overflow-trigger:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .overflow-popover {
    position: fixed;
    z-index: 1600;
    display: grid;
    width: 208px;
    padding: var(--space-1) 0;
    overflow: hidden;
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
    box-shadow: var(--shadow-panel);
  }

  .overflow-item {
    width: 100%;
    min-height: 34px;
    padding: 0 var(--space-3);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-sm);
    text-align: left;
  }

  .overflow-item:hover:not(:disabled),
  .overflow-item:focus-visible {
    color: var(--color-fg-primary);
    background: var(--color-hover);
  }

  .overflow-item.danger {
    color: var(--color-danger);
  }

  .overflow-item.separated {
    margin-top: var(--space-1);
    border-top: var(--border-subtle);
  }

  .overflow-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
