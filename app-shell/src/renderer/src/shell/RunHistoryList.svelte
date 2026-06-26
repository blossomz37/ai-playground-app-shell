<script lang="ts">
  import type { AiRun } from '@shared/ai'
  import MarkdownContent from './MarkdownContent.svelte'

  interface Props {
    runs: AiRun[]
    emptyLabel: string
    onUseSettings?: (run: AiRun) => void | Promise<void>
  }

  let { runs, emptyLabel, onUseSettings }: Props = $props()
  let expandedRunId = $state<string | null>(null)

  function fmt(iso: string | null): string {
    if (!iso) return 'Not completed'
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function toggleRun(id: string): void {
    expandedRunId = expandedRunId === id ? null : id
  }
</script>

<div class="run-list">
  {#each runs as run (run.id)}
    <article class="run-item" class:expanded={expandedRunId === run.id}>
      <button type="button" class="run-summary-button" data-capture-run-history-toggle onclick={() => toggleRun(run.id)}>
        <span class="run-status" class:success={run.status === 'completed'} class:error={run.status === 'failed'}>{run.status}</span>
        <span class="run-summary">{run.inputSummary || run.originType}</span>
        <span class="run-time">{fmt(run.createdAt)}</span>
      </button>

      {#if expandedRunId === run.id}
        <div class="run-detail">
          {#if onUseSettings}
            <button type="button" class="use-settings-btn" onclick={() => void onUseSettings?.(run)}>
              Use Settings
            </button>
          {/if}

          <dl class="run-meta">
            <div>
              <dt>Provider</dt>
              <dd>{run.providerId}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{run.model}</dd>
            </div>
            <div>
              <dt>Temp</dt>
              <dd>{run.temperature.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Origin</dt>
              <dd>{run.originType} / {run.originId}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{fmt(run.completedAt)}</dd>
            </div>
            <div>
              <dt>Run ID</dt>
              <dd>{run.id}</dd>
            </div>
          </dl>

          {#if run.error}
            <div class="run-output error-box">{run.error}</div>
          {:else if run.outputText}
            <div class="run-output">
              <MarkdownContent content={run.outputText} />
            </div>
          {:else}
            <div class="run-output muted">No output recorded.</div>
          {/if}
        </div>
      {/if}
    </article>
  {:else}
    <p class="empty-text">{emptyLabel}</p>
  {/each}
</div>

<style>
  .run-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .run-item {
    border: 1px solid color-mix(in srgb, var(--color-border) 80%, transparent);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    overflow: hidden;
  }

  .run-item.expanded {
    border-color: color-mix(in srgb, var(--color-accent) 36%, var(--color-border));
  }

  .run-summary-button {
    width: 100%;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 2px var(--space-2);
    padding: var(--space-2);
    text-align: left;
  }

  .run-summary-button:hover {
    background: var(--color-hover);
  }

  .run-status {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 800;
    text-transform: uppercase;
  }

  .run-status.success {
    color: var(--color-success);
  }

  .run-status.error {
    color: var(--color-danger);
  }

  .run-summary {
    min-width: 0;
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .run-time {
    grid-column: 1 / -1;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }

  .run-detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: 0 var(--space-2) var(--space-2);
  }

  .run-meta {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-1);
    margin: 0;
    font-size: var(--font-size-xs);
  }

  .run-meta div {
    min-width: 0;
  }

  dt {
    color: var(--color-fg-muted);
    font-weight: 700;
  }

  dd {
    min-width: 0;
    margin: 0;
    color: var(--color-fg-secondary);
    overflow-wrap: anywhere;
  }

  .run-output {
    max-height: 220px;
    overflow: auto;
    padding: var(--space-2);
    border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    line-height: 1.45;
  }

  .use-settings-btn {
    align-self: flex-start;
    min-height: 28px;
    padding: 0 var(--space-2);
    border: 1px solid color-mix(in srgb, var(--color-accent) 34%, var(--color-border));
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 700;
    cursor: pointer;
  }

  .use-settings-btn:hover {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-fg-primary);
  }

  .error-box {
    color: var(--color-danger);
  }

  .muted,
  .empty-text {
    color: var(--color-fg-muted);
    font-size: var(--font-size-sm);
  }

  .empty-text {
    margin: 0;
  }
</style>
