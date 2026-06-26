<script lang="ts">
  import { jobsPanelOpen, activeJobs, recentJobs, cancelJob } from '../store/jobs'

  function formatTime(value: string | null): string {
    if (!value) return ''
    return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
</script>

{#if $jobsPanelOpen}
  <aside class="jobs-panel" aria-label="Jobs">
    <header class="jobs-header">
      <h2>Jobs</h2>
      <button type="button" aria-label="Close jobs" onclick={() => jobsPanelOpen.set(false)}>×</button>
    </header>

    <section class="jobs-section">
      <h3>Active</h3>
      {#if $activeJobs.length === 0}
        <p class="empty">No active jobs.</p>
      {:else}
        {#each $activeJobs as job (job.id)}
          <article class="job-row active">
            <div class="job-line">
              <strong>{job.title}</strong>
              <span>{job.progress}%</span>
            </div>
            <div class="progress-track" aria-label={`${job.title} progress`}>
              <div class="progress-fill" style:width={`${job.progress}%`}></div>
            </div>
            <div class="job-meta">
              <span>{job.message || job.status}</span>
              <button type="button" onclick={() => cancelJob(job.id)}>Cancel</button>
            </div>
          </article>
        {/each}
      {/if}
    </section>

    <section class="jobs-section">
      <h3>History</h3>
      {#if $recentJobs.length === 0}
        <p class="empty">No completed jobs.</p>
      {:else}
        {#each $recentJobs.slice(0, 12) as job (job.id)}
          <article class="job-row">
            <div class="job-line">
              <strong>{job.title}</strong>
              <span class:failed={job.status === 'failed'} class:cancelled={job.status === 'cancelled'}>
                {job.status === 'failed' ? 'needs attention' : job.status}
              </span>
            </div>
            <p class="job-message">{job.error ?? job.message}</p>
            <time>{formatTime(job.completedAt ?? job.updatedAt)}</time>
          </article>
        {/each}
      {/if}
    </section>
  </aside>
{/if}

<style>
  .jobs-panel {
    position: fixed;
    right: var(--space-4);
    bottom: 96px;
    z-index: 350;
    width: min(360px, calc(100vw - 32px));
    max-height: min(560px, calc(100vh - 80px));
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    overflow: auto;
    padding: var(--space-4);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
    box-shadow: 0 18px 42px rgb(0 0 0 / 0.26);
  }

  .jobs-header,
  .job-line,
  .job-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .jobs-header h2 {
    margin: 0;
    font-size: var(--font-size-lg);
    color: var(--color-fg-primary);
  }

  .jobs-header button {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    background: transparent;
    cursor: pointer;
    font-size: var(--font-size-lg);
  }

  .jobs-header button:hover {
    background: var(--color-bg-overlay);
    color: var(--color-fg-primary);
  }

  .jobs-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .jobs-section h3 {
    margin: 0;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .empty {
    margin: 0;
    color: var(--color-fg-muted);
    font-size: var(--font-size-sm);
  }

  .job-row {
    padding: var(--space-3);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-bg-base);
  }

  .job-row.active {
    border-color: color-mix(in srgb, var(--color-accent) 42%, transparent);
  }

  .job-line strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-fg-primary);
    font-size: var(--font-size-sm);
  }

  .job-line span,
  time,
  .job-message,
  .job-meta {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }

  .job-message {
    margin: var(--space-1) 0;
    overflow-wrap: anywhere;
  }

  .failed {
    color: var(--color-warn);
  }

  .cancelled {
    color: var(--color-warn);
  }

  .progress-track {
    height: 6px;
    margin: var(--space-2) 0;
    overflow: hidden;
    border-radius: 999px;
    background: var(--color-bg-overlay);
  }

  .progress-fill {
    height: 100%;
    border-radius: inherit;
    background: var(--color-accent);
    transition: width 0.2s ease;
  }

  .job-meta button {
    padding: 2px var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    color: var(--color-fg-secondary);
    cursor: pointer;
  }

  .job-meta button:hover {
    color: var(--color-fg-primary);
  }
</style>
