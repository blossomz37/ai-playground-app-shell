<!-- ──────────────────────────────────────────────
  File:        ContextMenu.svelte
  Description: Shell-owned right-click context menu — positioned dropdown
  Version:     0.1.0
  Created:     2026-05-29
  Modified:    2026-05-29
  Author:      carlo
  ────────────────────────────────────────────── -->
<script lang="ts">
  import { contextMenu, hideContextMenu, type ContextMenuItem } from '../store/contextmenu'
  import { executeCommand } from '../store/commands'

  function handleClick(item: ContextMenuItem) {
    if (item.disabled) return
    hideContextMenu()
    void executeCommand(item.id, ...(item.args ?? []))
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      hideContextMenu()
    }
  }

  function onMenuKeydown(e: KeyboardEvent) {
    e.stopPropagation()
    if (e.key === 'Escape') {
      e.preventDefault()
      hideContextMenu()
    }
  }

  // Viewport-clamp the menu position
  function clampStyle(x: number, y: number): string {
    const menuW = 200
    const menuH = 300
    const cx = Math.min(x, window.innerWidth - menuW - 8)
    const cy = Math.min(y, window.innerHeight - menuH - 8)
    return `left: ${cx}px; top: ${cy}px;`
  }
</script>

{#if $contextMenu.visible}
  <!-- Invisible backdrop to catch clicks outside -->
  <div
    class="ctx-backdrop"
    onclick={hideContextMenu}
    oncontextmenu={(e) => { e.preventDefault(); hideContextMenu() }}
    onkeydown={onKeydown}
    role="presentation"
    tabindex="-1"
  >
    <div
      class="ctx-menu"
      role="menu"
      tabindex="-1"
      style={clampStyle($contextMenu.x, $contextMenu.y)}
      onclick={(e) => e.stopPropagation()}
      onkeydown={onMenuKeydown}
    >
      {#each $contextMenu.items as item (item.id)}
        {#if item.separator}
          <div class="ctx-sep" role="separator"></div>
        {:else}
          <button
            class="ctx-item"
            class:disabled={item.disabled}
            role="menuitem"
            onclick={() => handleClick(item)}
          >
            {#if item.icon}
              <span class="ctx-icon">{item.icon}</span>
            {/if}
            <span class="ctx-label">{item.label}</span>
          </button>
        {/if}
      {/each}
    </div>
  </div>
{/if}

<style>
  .ctx-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1500;
  }

  .ctx-menu {
    position: fixed;
    min-width: 180px;
    max-width: 260px;
    background: var(--color-bg-surface);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(255, 255, 255, 0.04) inset;
    padding: var(--space-1) 0;
    overflow: hidden;
    animation: ctx-in 0.1s ease-out;
  }

  @keyframes ctx-in {
    from { opacity: 0; transform: scale(0.96); }
    to   { opacity: 1; transform: scale(1); }
  }

  .ctx-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-sm);
    text-align: left;
    cursor: pointer;
    transition: color 0.1s, background 0.1s;
  }

  .ctx-item:hover {
    background: var(--color-accent-dim);
    color: var(--color-fg-primary);
  }

  .ctx-item.disabled {
    color: var(--color-fg-muted);
    cursor: default;
    pointer-events: none;
  }

  .ctx-icon {
    width: 16px;
    text-align: center;
    font-size: 12px;
    flex-shrink: 0;
  }

  .ctx-label {
    flex: 1;
  }

  .ctx-sep {
    height: 1px;
    margin: var(--space-1) var(--space-2);
    background: var(--color-border);
    opacity: 0.5;
  }
</style>
