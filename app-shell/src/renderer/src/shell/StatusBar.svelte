<!-- ──────────────────────────────────────────────
  File:        StatusBar.svelte
  Description: Shell-owned status bar zone — left (module items), right (shell info)
  Version:     0.2.0
  Created:     2026-05-29
  Modified:    2026-05-29
  Author:      carlo
  ────────────────────────────────────────────── -->
<script lang="ts">
  import { isDirty, editorContent, activeDoc, countWords } from '../store'

  let props = $props<{ moduleId: string | null }>()
</script>

<footer class="status-bar">
  <!-- Left zone: module-contributed status items -->
  <div class="zone zone-left">
    {#if props.moduleId === 'shell.documents' && $activeDoc}
      <span class="item word-count">
        {countWords($editorContent).toLocaleString()} words
      </span>
      <span class="sep">·</span>
      <span
        class="item save-indicator"
        class:dirty={$isDirty}
        class:clean={!$isDirty}
      >
        <span class="save-icon">{$isDirty ? '●' : '✓'}</span>
        {$isDirty ? 'unsaved' : 'saved'}
      </span>
    {/if}
  </div>

  <!-- Center zone: reserved for notifications / progress bar -->
  <div class="zone zone-center"></div>
</footer>

<style>
  .status-bar {
    grid-area: statusbar;
    position: relative;
    isolation: isolate;
    display: grid;
    grid-template-columns: var(--_rail-col) var(--_sidebar-col) minmax(0, 1fr) var(--_inspector-col);
    align-items: center;
    padding: 0 var(--space-2);
    gap: var(--space-3);
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-shell-status) 84%, var(--color-panel-glint)), var(--color-shell-status));
    border-top: 1px solid color-mix(in srgb, var(--color-border-strong) 78%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-panel-glint) 50%, transparent);
    font-size: 10px;
    color: var(--color-fg-secondary);
    overflow: hidden;
    user-select: none;
  }

  .status-bar::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    background:
      linear-gradient(180deg, color-mix(in srgb, white 20%, transparent), transparent 42%, color-mix(in srgb, black 12%, transparent));
    pointer-events: none;
  }

  .zone {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .zone-left {
    grid-column: 3;
    justify-content: flex-start;
  }

  .zone-center {
    grid-column: 2;
    justify-content: flex-start;
    overflow: hidden;
  }

  .item {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0;
    color: var(--color-fg-muted);
  }

  .word-count {
    color: var(--color-fg-secondary);
    font-variant-numeric: tabular-nums;
  }

  .save-indicator {
    display: flex;
    align-items: center;
    gap: 3px;
    transition: color 0.3s ease;
  }

  .save-indicator.clean {
    color: var(--color-fg-muted);
  }

  .save-indicator.dirty {
    color: var(--color-warn);
  }

  .save-icon {
    color: currentColor;
    font-size: 8px;
    line-height: 1;
  }

  .sep { color: var(--color-fg-muted); opacity: 0.5; flex-shrink: 0; }

  @media (max-width: 900px) {
    .status-bar {
      grid-template-columns: var(--_rail-col) minmax(0, 1fr);
      gap: var(--space-1);
    }

    .zone-left,
    .zone-center {
      grid-column: 2;
    }
  }
</style>
