<!-- ──────────────────────────────────────────────
  File:        StatusBar.svelte
  Description: Shell-owned status bar zone — left (module items), right (shell info)
  Version:     0.2.0
  Created:     2026-05-29
  Modified:    2026-05-29
  Author:      carlo
  ────────────────────────────────────────────── -->
<script lang="ts">
  import { isDirty, editorContent, activeDoc, activeWorkspace, countWords } from '../store'
  import { activeJobs, recentJobs, toggleJobsPanel } from '../store/jobs'

  let props = $props<{ moduleId: string | null }>()

  let latestJobStatus = $derived($activeJobs[0]?.message || $recentJobs[0]?.status || 'Idle')
</script>

<footer class="status-bar">
  <!-- Left zone: module-contributed status items -->
  <div class="zone zone-left">
    {#if props.moduleId === 'shell.documents' && $activeDoc}
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
  <div class="zone zone-center">
    <button class="jobs-item" type="button" onclick={toggleJobsPanel}>
      <span class:active={$activeJobs.length > 0}></span>
      {$activeJobs.length > 0 ? `${$activeJobs.length} running` : `Jobs ${latestJobStatus}`}
    </button>
  </div>

  <!-- Right zone: shell-level info -->
  <div class="zone zone-right">
    <span class="item muted">{$activeWorkspace?.type ?? 'workspace'}</span>
    <span class="sep">·</span>
    <span class="item muted">App Shell v0.1.0</span>
  </div>
</footer>

<style>
  .status-bar {
    grid-area: statusbar;
    display: grid;
    grid-template-columns: var(--_rail-col) var(--_sidebar-col) minmax(0, 1fr) var(--_inspector-col);
    align-items: center;
    padding: 0 var(--space-2);
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

  .zone-left {
    grid-column: 3;
    justify-content: flex-start;
  }

  .zone-center {
    grid-column: 2;
    justify-content: flex-start;
    overflow: hidden;
  }

  .zone-right {
    grid-column: 3 / 5;
    justify-self: end;
    justify-content: flex-end;
    padding-right: var(--space-2);
  }

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

  .jobs-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 2px var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    background: transparent;
    cursor: pointer;
    font-size: var(--font-size-xs);
  }

  .jobs-item:hover {
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
  }

  .jobs-item span {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--color-fg-muted);
  }

  .jobs-item span.active {
    background: var(--color-accent);
    animation: pulse-dot 1.5s ease-in-out infinite;
  }
</style>
