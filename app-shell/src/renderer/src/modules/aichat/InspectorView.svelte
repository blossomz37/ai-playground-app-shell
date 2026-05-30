<!-- AI Chat InspectorView — context and settings -->
<script lang="ts">
  import { onMount } from 'svelte'
  import {
    aiContextCandidates,
    aiRuns,
    loadAiRuns,
    refreshAiContext,
    toggleAiContextCandidate
  } from '../../store/ai'

  onMount(() => {
    void refreshAiContext()
    void loadAiRuns('shell.aichat')
  })
</script>

<div class="inspector-view">
  <section class="section">
    <h3 class="section-title">Context</h3>
    {#if $aiContextCandidates.length === 0}
      <p class="context-hint">Open a document to add run context.</p>
    {:else}
      <div class="context-list">
        {#each $aiContextCandidates as candidate (candidate.id)}
          <label class="context-item">
            <input
              type="checkbox"
              checked={candidate.included}
              onchange={() => toggleAiContextCandidate(candidate.id)}
            />
            <span class="ctx-body">
              <span class="ctx-name">{candidate.title}</span>
              <span class="ctx-meta">{candidate.kind} · ~{candidate.estimatedTokens} tokens</span>
              <span class="ctx-excerpt">{candidate.excerpt}</span>
            </span>
          </label>
        {/each}
      </div>
    {/if}
  </section>
  <section class="section">
    <h3 class="section-title">Model</h3>
    <div class="meta-grid">
      <span class="meta-label">Provider</span><span class="meta-value">Mock Local</span>
      <span class="meta-label">Model</span><span class="meta-value">mock-durable-context-v1</span>
      <span class="meta-label">Status</span><span class="meta-value status-mock">Mock mode</span>
    </div>
  </section>
  <section class="section">
    <h3 class="section-title">Runs</h3>
    <div class="run-list">
      {#each $aiRuns as run (run.id)}
        <div class="run-item">
          <span class="run-status">{run.status}</span>
          <span class="run-summary">{run.inputSummary || run.originType}</span>
        </div>
      {:else}
        <p class="context-hint">No chat runs yet.</p>
      {/each}
    </div>
  </section>
</div>

<style>
  .inspector-view { padding: var(--space-4); }
  .section { margin-bottom: var(--space-5); }
  .section-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); margin-bottom: var(--space-3); }
  .context-hint { font-size: var(--font-size-sm); color: var(--color-fg-muted); margin-bottom: var(--space-2); }
  .context-list, .run-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .context-item { display: flex; align-items: flex-start; gap: var(--space-2); font-size: var(--font-size-sm); color: var(--color-fg-secondary); padding: var(--space-2); background: var(--color-bg-overlay); border-radius: var(--radius-sm); cursor: pointer; }
  .context-item input { margin-top: 3px; accent-color: var(--color-accent); flex-shrink: 0; }
  .ctx-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .ctx-name { color: var(--color-fg-primary); font-weight: 600; }
  .ctx-meta { color: var(--color-fg-muted); font-size: var(--font-size-xs); }
  .ctx-excerpt { color: var(--color-fg-secondary); font-size: var(--font-size-xs); line-height: 1.35; }
  .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--space-1) var(--space-3); font-size: var(--font-size-sm); }
  .meta-label { color: var(--color-fg-muted); }
  .meta-value { color: var(--color-fg-secondary); }
  .status-mock { color: var(--color-warn); }
  .run-item { display: flex; flex-direction: column; gap: 2px; padding: var(--space-2); background: var(--color-bg-overlay); border-radius: var(--radius-sm); }
  .run-status { color: var(--color-success); font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; }
  .run-summary { color: var(--color-fg-secondary); font-size: var(--font-size-xs); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
