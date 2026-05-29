<script lang="ts">
  import { commandCatalog, paletteOpen, executeCommand } from '../store/commands'
  import type { CommandCatalogEntry } from '@shared/module-contract'

  let query = $state('')
  let selected = $state(0)
  let inputEl = $state<HTMLInputElement>()

  const results = $derived(
    $commandCatalog.filter(c =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.id.toLowerCase().includes(query.toLowerCase())
    )
  )

  // Reset state + focus the input whenever the palette opens.
  $effect(() => {
    if ($paletteOpen) {
      query = ''
      selected = 0
      // Focus after the input renders.
      queueMicrotask(() => inputEl?.focus())
    }
  })

  // Keep the selection in range as the result set shrinks.
  $effect(() => {
    if (selected >= results.length) selected = Math.max(0, results.length - 1)
  })

  function close() {
    paletteOpen.set(false)
  }

  async function run(cmd: CommandCatalogEntry | undefined) {
    if (!cmd) return
    close()
    await executeCommand(cmd.id)
  }

  function onKeydown(e: KeyboardEvent) {
    // The palette owns its keys while open; keep them from the global dispatcher.
    e.stopPropagation()
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      selected = Math.min(selected + 1, results.length - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      selected = Math.max(selected - 1, 0)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(results[selected])
    }
  }

  // Render a keybinding for display: CmdOrCtrl+S -> ⌘S (macOS chrome).
  function prettyKey(binding: string): string {
    return binding
      .replace(/CmdOrCtrl|Cmd|Command|Meta/gi, '⌘')
      .replace(/Ctrl|Control/gi, '⌃')
      .replace(/Alt|Opt|Option/gi, '⌥')
      .replace(/Shift/gi, '⇧')
      .replace(/\+/g, '')
      .toUpperCase()
  }
</script>

{#if $paletteOpen}
  <!-- Backdrop: click to dismiss -->
  <div class="palette-backdrop" onclick={close} role="presentation">
    <!-- Stop clicks inside the panel from bubbling to the backdrop -->
    <div
      class="palette"
      role="dialog"
      aria-label="Command palette"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={onKeydown}
    >
      <input
        bind:this={inputEl}
        bind:value={query}
        class="palette-input"
        type="text"
        placeholder="Type a command…"
        spellcheck="false"
        autocomplete="off"
      />
      <ul class="palette-list">
        {#each results as cmd, i (cmd.id)}
          <li>
            <button
              class="palette-item"
              class:selected={i === selected}
              onmouseenter={() => (selected = i)}
              onclick={() => run(cmd)}
            >
              <span class="title">{cmd.title}</span>
              {#if cmd.keybinding}
                <span class="key">{prettyKey(cmd.keybinding)}</span>
              {/if}
            </button>
          </li>
        {:else}
          <li class="palette-empty">No matching commands</li>
        {/each}
      </ul>
    </div>
  </div>
{/if}

<style>
  .palette-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 12vh;
    z-index: 1000;
  }

  .palette {
    width: min(560px, 90vw);
    max-height: 60vh;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-surface);
    border: var(--border-subtle);
    border-radius: var(--radius-lg);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .palette-input {
    width: 100%;
    padding: var(--space-4) var(--space-5);
    background: transparent;
    border: none;
    border-bottom: var(--border-subtle);
    color: var(--color-fg-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-lg);
    outline: none;
  }

  .palette-input::placeholder { color: var(--color-fg-muted); }

  .palette-list {
    list-style: none;
    margin: 0;
    padding: var(--space-2);
    overflow-y: auto;
  }

  .palette-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    color: var(--color-fg-secondary);
    text-align: left;
    gap: var(--space-3);
  }

  .palette-item.selected {
    background: var(--color-accent-dim);
    color: var(--color-fg-primary);
  }

  .palette-item .title { font-size: var(--font-size-md); }

  .palette-item .key {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  .palette-empty {
    padding: var(--space-3);
    color: var(--color-fg-muted);
    font-size: var(--font-size-sm);
    text-align: center;
  }
</style>
