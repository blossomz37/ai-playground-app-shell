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
    padding: 1px 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-bg-overlay) 90%, black);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, white 28%, transparent),
      inset 0 0 0 1px color-mix(in srgb, white 24%, transparent),
      0 1px 1px rgb(0 0 0 / 0.24);
    color: #ffffff;
    text-shadow: 0 1px 1px rgb(0 0 0 / 0.42);
    transform: translateY(1px);
    transition: color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  }

  .item:hover {
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, white 34%, transparent),
      inset 0 0 0 1px color-mix(in srgb, white 30%, transparent),
      0 1px 2px rgb(0 0 0 / 0.28);
    color: #ffffff;
  }

  .word-count {
    background: color-mix(in srgb, var(--accent-editor) 88%, black);
    color: #eef6ff;
    font-variant-numeric: tabular-nums;
  }

  .save-indicator {
    display: flex;
    align-items: center;
    gap: 3px;
    transition: color 0.3s ease;
  }

  .save-indicator.clean {
    background: color-mix(in srgb, var(--color-success) 86%, black);
    color: #f0fdf4;
  }

  .save-indicator.dirty {
    background: color-mix(in srgb, var(--color-warn) 88%, black);
    color: #fff7ed;
  }

  .save-icon {
    color: currentColor;
    font-size: 8px;
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
    color: #f8fafc;
    background: color-mix(in srgb, black 44%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, white 16%, transparent);
    text-shadow: 0 1px 2px rgb(0 0 0 / 0.78);
    cursor: pointer;
    font-size: var(--font-size-xs);
  }

  .jobs-item:hover {
    background: color-mix(in srgb, black 54%, transparent);
    color: #ffffff;
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
