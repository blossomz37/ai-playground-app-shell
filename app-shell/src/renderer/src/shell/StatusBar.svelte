<!-- ──────────────────────────────────────────────
  File:        StatusBar.svelte
  Description: Shell-owned status bar zone — left (module items), right (shell info)
  Version:     0.2.0
  Created:     2026-05-29
  Modified:    2026-05-29
  Author:      carlo
  ────────────────────────────────────────────── -->
<script lang="ts">
  import { activeModuleId, isDirty, editorContent, activeDoc, countWords } from '../store'
</script>

<footer class="status-bar">
  <!-- Left zone: module-contributed status items -->
  <div class="zone zone-left">
    {#if $activeModuleId === 'shell.documents' && $activeDoc}
      <span class="item doc-title" title={$activeDoc.title}>
        {$activeDoc.title}
      </span>
      <span class="sep">·</span>
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

  <!-- Right zone: shell-level info -->
  <div class="zone zone-right">
    <span class="item muted">authoring</span>
    <span class="sep">·</span>
    <span class="item muted">App Shell v0.1.0</span>
  </div>
</footer>

<style>
  .status-bar {
    grid-area: statusbar;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-4);
    gap: var(--space-3);
    background: var(--color-bg-surface);
    border-top: var(--border-subtle);
    font-size: var(--font-size-xs);
    color: var(--color-fg-secondary);
    overflow: hidden;
    user-select: none;
  }

  .zone {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .zone-left  { flex: 1; justify-content: flex-start; }
  .zone-center { flex: 0 1 auto; }
  .zone-right { flex: 0 0 auto; justify-content: flex-end; }

  .item {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 2px 4px;
    border-radius: var(--radius-sm);
    transition: color 0.15s ease, background 0.15s ease;
  }

  .item:hover {
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
  }

  .doc-title {
    max-width: 180px;
    font-weight: 500;
  }

  .word-count {
    color: var(--color-fg-muted);
    font-variant-numeric: tabular-nums;
  }

  .save-indicator {
    display: flex;
    align-items: center;
    gap: 3px;
    transition: color 0.3s ease;
  }

  .save-indicator.clean { color: var(--color-success); }
  .save-indicator.dirty { color: var(--color-warn); }

  .save-icon {
    font-size: 9px;
    line-height: 1;
    transition: transform 0.2s ease;
  }

  .save-indicator.clean .save-icon {
    transform: scale(1);
  }

  .save-indicator.dirty .save-icon {
    animation: pulse-dot 1.5s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.4; }
  }

  .sep { color: var(--color-fg-muted); opacity: 0.5; flex-shrink: 0; }
  .muted { color: var(--color-fg-muted); }
</style>

