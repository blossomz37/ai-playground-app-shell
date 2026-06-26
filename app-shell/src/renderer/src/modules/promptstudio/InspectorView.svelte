<script lang="ts">
  import { onMount } from 'svelte'
  import RunHistoryList from '../../shell/RunHistoryList.svelte'
  import {
    aiContextCandidates,
    aiProviders,
    aiRuns,
    aiSecretNames,
    loadAiProviders,
    loadAiRuns,
    modelOptionsForProvider,
    refreshAiContext,
    selectAiModel,
    selectAiProvider,
    selectAiTemperature,
    selectedAiModel,
    selectedAiProviderId,
    selectedAiTemperature
  } from '../../store/ai'

  let activeProvider = $derived($aiProviders.find(provider => provider.providerId === $selectedAiProviderId) ?? $aiProviders[0])
  let modelOptions = $derived(modelOptionsForProvider(activeProvider))
  let requiredSecretReady = $derived(!activeProvider?.secretName || $aiSecretNames.includes(activeProvider.secretName))

  onMount(() => {
    void loadAiProviders()
    void refreshAiContext()
    void loadAiRuns('shell.promptstudio')
  })
</script>

<div class="inspector-view">
  <div class="section">
    <h3>Run Settings</h3>
    
    <div class="field">
      <label for="provider">Provider</label>
      <select
        id="provider"
        class="select-input"
        value={$selectedAiProviderId}
        onchange={(event) => selectAiProvider(event.currentTarget.value)}
      >
        {#each $aiProviders as provider (provider.providerId)}
          <option value={provider.providerId}>{provider.providerName}</option>
        {/each}
      </select>
    </div>

    <div class="field">
      <label for="model">Model</label>
      <select
        id="model"
        class="select-input"
        value={$selectedAiModel}
        onchange={(event) => selectAiModel(event.currentTarget.value)}
      >
        {#each modelOptions as model (model)}
          <option value={model}>{model}</option>
        {/each}
      </select>
    </div>

    <div class="field">
      <label for="temp">Temperature: <span class="val">{$selectedAiTemperature.toFixed(1)}</span></label>
      <input
        id="temp"
        type="range"
        min="0"
        max="2"
        step="0.1"
        value={$selectedAiTemperature}
        oninput={(event) => selectAiTemperature(Number(event.currentTarget.value))}
      />
    </div>

    <div class="history-item">
      <div class="time">Provider status</div>
      <div class:success={requiredSecretReady} class:error={!requiredSecretReady} class="status">
        {$selectedAiProviderId === 'mock-local' ? 'Mock' : requiredSecretReady ? 'Ready' : `Missing ${activeProvider?.secretName ?? 'secret'}`}
      </div>
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
    <RunHistoryList runs={$aiRuns} emptyLabel="No prompt runs yet." />
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
