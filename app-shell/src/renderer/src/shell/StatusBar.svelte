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
  import { activeJobs, recentJobs, toggleJobsPanel } from '../store/jobs'

  let props = $props<{ moduleId: string | null }>()

  let visibleJob = $derived($activeJobs[0] ?? $recentJobs.find(job => job.status === 'failed'))
  let jobLabel = $derived.by(() => {
    if ($activeJobs.length > 0) return $activeJobs.length === 1 ? ($activeJobs[0].message || '1 job running') : `${$activeJobs.length} jobs running`
    if (visibleJob?.status === 'failed') return visibleJob.message || 'Job failed'
    return ''
  })
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
  <div class="zone zone-center">
    {#if visibleJob && jobLabel}
      <button class="jobs-item" class:failed={visibleJob.status === 'failed'} type="button" onclick={toggleJobsPanel}>
        <span class:active={$activeJobs.length > 0} class:failed={visibleJob.status === 'failed'}></span>
        {jobLabel}
      </button>
    {/if}
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
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-shell-status) 84%, var(--color-panel-glint)), var(--color-shell-status));
    border-top: 1px solid color-mix(in srgb, var(--color-border-strong) 78%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-panel-glint) 50%, transparent);
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

  .item {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 2px 4px;
    border-radius: var(--radius-sm);
    transition: color 0.15s ease, background 0.15s ease;
  }

  .item:hover {
    background: var(--color-hover);
    color: var(--color-fg-primary);
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

  .save-indicator.clean { color: var(--accent-nav); }
  .save-indicator.dirty { color: var(--accent-status); }

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
    background: var(--color-hover);
    color: var(--color-fg-primary);
  }

  .jobs-item span {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--color-fg-muted);
  }

  .jobs-item span.active {
    background: var(--accent-status);
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent-status) 58%, transparent);
    animation: pulse-dot 1.5s ease-in-out infinite;
  }

  .jobs-item.failed {
    color: var(--color-danger);
  }

  .jobs-item span.failed {
    background: var(--color-danger);
  }
</style>
