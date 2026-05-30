<script lang="ts">
  import { onMount } from 'svelte'
  import { aiContextCandidates, aiRuns, loadAiRuns, refreshAiContext } from '../../store/ai'

  onMount(() => {
    void refreshAiContext()
    void loadAiRuns('shell.promptstudio')
  })
</script>

<div class="inspector-view">
  <div class="section">
    <h3>Run Settings</h3>
    
    <div class="field">
      <label for="provider">Provider</label>
      <select id="provider" class="select-input">
        <option>Mock Local</option>
      </select>
    </div>

    <div class="field">
      <label for="model">Model</label>
      <select id="model" class="select-input">
        <option>mock-durable-context-v1</option>
      </select>
    </div>

    <div class="field">
      <label for="temp">Temperature: <span class="val">0.7</span></label>
      <input id="temp" type="range" min="0" max="2" step="0.1" value="0.7" />
    </div>
  </div>

  <div class="section">
    <h3>Context</h3>
    <div class="history-list">
      {#each $aiContextCandidates.filter(candidate => candidate.included) as candidate (candidate.id)}
        <div class="history-item">
          <div class="time">{candidate.title}</div>
          <div class="status success">~{candidate.estimatedTokens}</div>
        </div>
      {:else}
        <div class="history-item">
          <div class="time">No context selected</div>
          <div class="status">Idle</div>
        </div>
      {/each}
    </div>
  </div>

  <div class="section">
    <h3>Run History</h3>
    <div class="history-list">
      {#each $aiRuns as run (run.id)}
        <div class="history-item">
          <div class="time">{run.inputSummary || run.originType}</div>
          <div class:success={run.status === 'completed'} class:error={run.status === 'failed'} class="status">{run.status}</div>
        </div>
      {:else}
        <div class="history-item">
          <div class="time">No runs yet</div>
          <div class="status">Ready</div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .inspector-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    padding: var(--space-4);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  h3 {
    margin: 0;
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: var(--border-subtle);
    padding-bottom: var(--space-2);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    display: flex;
    justify-content: space-between;
    color: var(--color-fg-primary);
  }

  .val {
    color: var(--color-fg-muted);
  }

  .select-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-base);
    color: var(--color-fg-primary);
    font-size: var(--font-size-sm);
    line-height: 1.4;
  }

  .select-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  input[type="range"] {
    width: 100%;
    margin-top: var(--space-2);
    accent-color: var(--color-accent);
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-base);
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    font-size: var(--font-size-xs);
  }

  .time {
    color: var(--color-fg-muted);
  }

  .status {
    font-weight: 600;
  }

  .status.success {
    color: var(--color-success, #2da44e);
  }

  .status.error {
    color: var(--color-error, #cf222e);
  }
</style>
