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
  let sourceFilter = $state('all')
  let sourceOptions = $derived(runSourceOptions(runs))
  let visibleRuns = $derived(
    sourceFilter === 'all' ? runs : runs.filter(run => run.moduleId === sourceFilter)
  )

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

  function providerLabel(run: AiRun): string {
    if (run.providerId === 'mock-local') return 'Practice AI'
    if (run.providerId === 'openai-responses') return 'OpenAI'
    return run.providerId
  }

  function originLabel(run: AiRun): string {
    const labels: Record<AiRun['originType'], string> = {
      chat: 'Chat',
      template: 'Prompt',
      chain: 'Chain',
      workflow: 'Workflow'
    }
    return labels[run.originType]
  }

  function sourceLabel(moduleId: string): string {
    if (moduleId === 'shell.aichat') return 'Chat'
    if (moduleId === 'shell.promptstudio') return 'Prompts'
    if (moduleId === 'shell.workflow') return 'Workflow'
    if (moduleId === 'shell.documents') return 'Documents'
    return moduleId
  }

  function runSourceOptions(rows: AiRun[]): Array<{ id: string; label: string; count: number }> {
    const counts: Record<string, number> = {}
    for (const run of rows) {
      counts[run.moduleId] = (counts[run.moduleId] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([id, count]) => ({ id, label: sourceLabel(id), count }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }
</script>

<div class="run-list">
  {#if sourceOptions.length > 1}
    <div class="source-filter" aria-label="Filter run history by source">
      <button type="button" class:active={sourceFilter === 'all'} onclick={() => sourceFilter = 'all'}>
        All <span>{runs.length}</span>
      </button>
      {#each sourceOptions as option (option.id)}
        <button type="button" class:active={sourceFilter === option.id} onclick={() => sourceFilter = option.id}>
          {option.label} <span>{option.count}</span>
        </button>
      {/each}
    </div>
  {/if}

  {#each visibleRuns as run (run.id)}
    <article class="run-item" class:expanded={expandedRunId === run.id}>
      <button
        type="button"
        class="run-summary-button"
        data-capture-run-history-toggle
        aria-expanded={expandedRunId === run.id}
        onclick={() => toggleRun(run.id)}
      >
        <span class="run-status" class:success={run.status === 'completed'} class:error={run.status === 'failed'}>{run.status}</span>
        <span class="run-summary">{run.inputSummary || run.originType}</span>
        <span class="run-source">{sourceLabel(run.moduleId)}</span>
        <span class="run-toggle-hint">{expandedRunId === run.id ? 'Hide' : 'Result'}</span>
        <span class="run-time">{fmt(run.createdAt)}</span>
      </button>

      {#if expandedRunId === run.id}
        <div class="run-detail">
          {#if run.error}
            <section class="run-result error-box" aria-label="Run error">
              <span class="result-label">Error</span>
              <p>{run.error}</p>
            </section>
          {:else if run.outputText}
            <section class="run-result" aria-label="Run result">
              <span class="result-label">Result</span>
              <MarkdownContent content={run.outputText} />
            </section>
          {:else}
            <section class="run-result muted" aria-label="Run result">
              <span class="result-label">Result</span>
              <p>No output recorded.</p>
            </section>
          {/if}

          <div class="run-actions">
            {#if onUseSettings}
              <button type="button" class="use-settings-btn" onclick={() => void onUseSettings?.(run)}>
                Use these settings
              </button>
            {/if}
            <details class="run-technical">
              <summary>Run details</summary>
              <dl class="run-meta">
                <div>
                  <dt>AI</dt>
                  <dd>{providerLabel(run)}</dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>{run.model}</dd>
                </div>
                <div>
                  <dt>Temperature</dt>
                  <dd>{run.temperature.toFixed(1)}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{originLabel(run)} / {run.originId}</dd>
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
            </details>
          </div>
        </div>
      {/if}
    </article>
  {:else}
    <p class="empty-text">{sourceFilter === 'all' ? emptyLabel : 'No runs for this source yet.'}</p>
  {/each}
</div>

<style>
  .run-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .source-filter {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .source-filter button {
    min-height: 26px;
    padding: 0 var(--space-2);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    cursor: pointer;
  }

  .source-filter button.active {
    background: var(--color-accent-dim);
    color: var(--color-accent);
    border-color: color-mix(in srgb, var(--color-accent) 42%, var(--color-border));
  }

  .source-filter span {
    color: var(--color-fg-muted);
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
    grid-template-columns: auto auto minmax(0, 1fr) auto;
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

  .run-source {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
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
    grid-column: 1 / 4;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
  }

  .run-toggle-hint {
    grid-row: 1 / 3;
    grid-column: 4;
    align-self: center;
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .run-detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: 0 var(--space-2) var(--space-2);
  }

  .run-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
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

  .run-result {
    max-height: 220px;
    overflow: auto;
    padding: var(--space-2);
    border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    line-height: 1.45;
  }

  .run-result p {
    margin: var(--space-1) 0 0;
  }

  .result-label {
    display: block;
    margin-bottom: var(--space-1);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .use-settings-btn {
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

  .run-technical {
    min-width: 0;
  }

  .run-technical summary {
    min-height: 28px;
    display: inline-flex;
    align-items: center;
    padding: 0 var(--space-2);
    border: 1px solid color-mix(in srgb, var(--color-border) 80%, transparent);
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    cursor: pointer;
  }

  .run-technical summary:hover {
    color: var(--color-fg-primary);
    background: var(--color-hover);
  }

  .run-technical[open] .run-meta {
    margin-top: var(--space-2);
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
