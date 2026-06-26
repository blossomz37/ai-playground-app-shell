<!-- ──────────────────────────────────────────────
  File:        CommandPalette.svelte
  Description: Command palette + document search (Cmd+K / Cmd+Shift+F)
  Version:     0.2.0
  Created:     2026-05-29
  Modified:    2026-05-29
  Author:      carlo
  ────────────────────────────────────────────── -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { commandCatalog, paletteOpen, executeCommand, setSearchOpener } from '../store/commands'
  import { moduleList } from '../store/modules'
  import { navigateToSearchResult } from '../store/navigate'
  import type { CommandCatalogEntry, SearchEntityType, SearchResult } from '@shared/module-contract'

  const SEARCH_LIMIT = 50

  const ENTITY_LABELS: Record<SearchEntityType, string> = {
    document: 'Document',
    conversation: 'Chat',
    template: 'Prompt',
    asset: 'Asset'
  }

  let query = $state('')
  let selected = $state(0)
  let inputEl = $state<HTMLInputElement>()

  // Mode: 'commands' (default, query starts with >) or 'search' (free text)
  let mode = $state<'commands' | 'search'>('commands')
  let searchResults = $state<SearchResult[]>([])
  let recentResults = $state<SearchResult[]>([])
  let searchPending = $state(false)
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  let capturePaletteListener: ((event: Event) => void) | null = null

  // The active result set in search mode: recents when the query is empty.
  const activeSearchResults = $derived(
    mode === 'search' && query.trim().length === 0 ? recentResults : searchResults
  )

  // Derived: strip the `>` prefix for command mode
  const commandQuery = $derived(
    mode === 'commands' ? query.replace(/^>\s*/, '') : query
  )

  const commandResults = $derived(
    $commandCatalog.filter(c =>
      c.title.toLowerCase().includes(commandQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(commandQuery.toLowerCase())
    )
  )

  // Unified result count for navigation
  const resultCount = $derived(
    mode === 'commands' ? commandResults.length : activeSearchResults.length
  )

  // React to query changes — route to search when no `>` prefix
  $effect(() => {
    const q = query
    // Determine mode from prefix
    if (q.startsWith('>')) {
      mode = 'commands'
      // Clear search state
      searchResults = []
      if (searchTimer) clearTimeout(searchTimer)
    } else {
      mode = 'search'
      // Debounce search queries
      if (searchTimer) clearTimeout(searchTimer)
      if (q.trim().length > 0) {
        searchPending = true
        searchTimer = setTimeout(async () => {
          try {
            searchResults = await window.shell.search.query(q.trim(), SEARCH_LIMIT)
          } catch {
            searchResults = []
          }
          searchPending = false
        }, 200)
      } else {
        searchResults = []
        searchPending = false
        void loadRecents()
      }
    }
  })

  async function loadRecents() {
    try {
      recentResults = await window.shell.search.recents(SEARCH_LIMIT)
    } catch {
      recentResults = []
    }
  }

  // Reset state + focus the input whenever the palette opens.
  $effect(() => {
    if ($paletteOpen) {
      query = '> '
      selected = 0
      mode = 'commands'
      searchResults = []
      // Focus after the input renders.
      queueMicrotask(() => inputEl?.focus())
    }
  })

  // Keep the selection in range as the result set shrinks.
  $effect(() => {
    if (selected >= resultCount) selected = Math.max(0, resultCount - 1)
  })

  /** Open in search mode (Cmd+Shift+F) */
  export function openSearch() {
    paletteOpen.set(true)
    // Wait for mount then switch to search mode
    queueMicrotask(() => {
      query = ''
      mode = 'search'
      selected = 0
      void loadRecents()
      inputEl?.focus()
    })
  }

  onMount(() => {
    setSearchOpener(openSearch)
    capturePaletteListener = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      paletteOpen.set(true)
      queueMicrotask(() => {
        query = `> ${detail ?? ''}`
        mode = 'commands'
        selected = 0
        inputEl?.focus()
      })
    }
    window.addEventListener('shell:capture-open-command-palette', capturePaletteListener)

    return () => {
      if (capturePaletteListener) {
        window.removeEventListener('shell:capture-open-command-palette', capturePaletteListener)
      }
    }
  })

  function close() {
    paletteOpen.set(false)
    if (searchTimer) clearTimeout(searchTimer)
  }

  async function runCommand(cmd: CommandCatalogEntry | undefined) {
    if (!cmd) return
    close()
    await executeCommand(cmd.id)
  }

  async function openSearchResult(result: SearchResult | undefined) {
    if (!result) return
    close()
    await navigateToSearchResult(result)
  }

  function onKeydown(e: KeyboardEvent) {
    // The palette owns its keys while open; keep them from the global dispatcher.
    e.stopPropagation()
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      selected = Math.min(selected + 1, resultCount - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      selected = Math.max(selected - 1, 0)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (mode === 'commands') {
        runCommand(commandResults[selected])
      } else {
        openSearchResult(activeSearchResults[selected])
      }
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

  function moduleLabel(moduleId: string): string {
    const module = $moduleList.find((item) => item.id === moduleId)
    if (module) return module.name

    return moduleId
      .replace(/^shell\./, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }
</script>

{#if $paletteOpen}
  <!-- Backdrop: click to dismiss -->
  <div class="palette-backdrop" onclick={close} role="presentation">
    <!-- Stop clicks inside the panel from bubbling to the backdrop -->
    <div
      class="palette"
      role="dialog"
      aria-label={mode === 'commands' ? 'Command palette' : 'Go to anything'}
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={onKeydown}
    >
      <input
        bind:this={inputEl}
        bind:value={query}
        class="palette-input"
        type="text"
        placeholder={mode === 'commands' ? '> Type a command…' : 'Go to anything — documents, chats, prompts, assets…'}
        spellcheck="false"
        autocomplete="off"
      />

      <div class="mode-hint">
        {#if mode === 'commands'}
          <span class="hint-text">Commands</span>
        {:else if query.trim().length === 0}
          <span class="hint-text">Recents</span>
          <span class="hint-tip">Type <kbd>></kbd> for commands</span>
        {:else if searchPending}
          <span class="hint-text">Searching…</span>
          <span class="hint-tip">Type <kbd>></kbd> for commands</span>
        {:else}
          <span class="hint-text">
            {activeSearchResults.length === SEARCH_LIMIT
              ? `Showing first ${SEARCH_LIMIT}`
              : `${activeSearchResults.length} result${activeSearchResults.length === 1 ? '' : 's'}`}
          </span>
          <span class="hint-tip">Type <kbd>></kbd> for commands</span>
        {/if}
      </div>

      <ul class="palette-list">
        {#if mode === 'commands'}
          {#each commandResults as cmd, i (cmd.id)}
            <li>
              <button
                class="palette-item"
                class:selected={i === selected}
                onmouseenter={() => (selected = i)}
                onclick={() => runCommand(cmd)}
              >
                <span class="command-info">
                  <span class="title">{cmd.title}</span>
                  <span class="module-label">{moduleLabel(cmd.moduleId)}</span>
                </span>
                {#if cmd.keybinding}
                  <span class="key">{prettyKey(cmd.keybinding)}</span>
                {/if}
              </button>
            </li>
          {:else}
            <li class="palette-empty">No matching commands</li>
          {/each}
        {:else if searchPending}
          <li class="palette-empty">Searching…</li>
        {:else}
          {#each activeSearchResults as result, i (`${result.entityType}:${result.entityId}`)}
            <li>
              <button
                class="palette-item search-item"
                class:selected={i === selected}
                onmouseenter={() => (selected = i)}
                onclick={() => openSearchResult(result)}
              >
                <div class="search-info">
                  <span class="search-title-row">
                    <span class="entity-badge" data-entity={result.entityType}>
                      {ENTITY_LABELS[result.entityType]}
                    </span>
                    <span class="title">{result.title}</span>
                  </span>
                  {#if result.snippet}
                    <span class="snippet">{@html result.snippet}</span>
                  {/if}
                </div>
              </button>
            </li>
          {:else}
            <li class="palette-empty">
              {query.trim().length === 0 ? 'No recent items yet' : 'No matches found'}
            </li>
          {/each}
        {/if}
      </ul>
    </div>
  </div>
{/if}

<style>
  .palette-backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.34);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 9vh;
    z-index: 1000;
  }

  .palette {
    width: min(540px, 92vw);
    max-height: 68vh;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-surface);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    box-shadow: 0 18px 46px rgb(0 0 0 / 0.42);
    overflow: hidden;
  }

  .palette-input {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    background: transparent;
    border: none;
    border-bottom: var(--border-subtle);
    color: var(--color-fg-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-md);
    outline: none;
  }

  .palette-input::placeholder { color: var(--color-fg-muted); }

  .mode-hint {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3px var(--space-4);
    border-bottom: var(--border-subtle);
    font-size: var(--font-size-xs);
  }

  .hint-text {
    color: var(--color-fg-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .hint-tip {
    color: var(--color-fg-muted);
  }

  .hint-tip kbd {
    display: inline-block;
    padding: 0 4px;
    background: var(--color-bg-overlay);
    border: var(--border-subtle);
    border-radius: 3px;
    font-family: var(--font-mono);
    font-size: 10px;
  }

  .palette-list {
    list-style: none;
    margin: 0;
    padding: var(--space-1);
    overflow-y: auto;
  }

  .palette-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 34px;
    padding: 5px var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    text-align: left;
    gap: var(--space-3);
    cursor: pointer;
    transition: background 0.1s;
  }

  .palette-item.selected {
    background: var(--color-accent-dim);
    color: var(--color-fg-primary);
  }

  .palette-item .title { font-size: var(--font-size-md); }

  .command-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .command-info .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .module-label {
    color: var(--color-fg-muted);
    font-size: 10px;
    font-weight: 650;
    line-height: 1.1;
    text-transform: uppercase;
  }

  .palette-item .key {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  /* Search-specific styles */
  .search-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    padding: var(--space-2);
  }

  .search-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
  }

  .search-title-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .search-info .title {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .entity-badge {
    flex-shrink: 0;
    padding: 0 6px;
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: 10px;
    font-weight: 650;
    line-height: 1.5;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .entity-badge[data-entity='document'] { color: var(--color-accent); }

  .snippet {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.snippet mark) {
    background: var(--color-accent-dim);
    color: var(--color-accent);
    border-radius: 2px;
    padding: 0 2px;
  }

  .palette-empty {
    padding: var(--space-3);
    color: var(--color-fg-muted);
    font-size: var(--font-size-sm);
    text-align: center;
  }
</style>
