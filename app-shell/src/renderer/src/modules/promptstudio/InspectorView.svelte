<script lang="ts">
  import { onMount } from 'svelte'
  import type { AiRun } from '@shared/ai'
  import AiContextPicker from '../../shell/AiContextPicker.svelte'
  import AiModelPresetPicker from '../../shell/AiModelPresetPicker.svelte'
  import RunHistoryList from '../../shell/RunHistoryList.svelte'
  import {
    aiContextCandidates,
    aiProviders,
    aiRuns,
    aiRunSettingsForSurface,
    aiSecretNames,
    loadAiProviders,
    loadAiRuns,
    modelOptionsForProvider,
    refreshAiContext,
    selectAiSurfaceModel,
    selectAiSurfaceProvider,
    selectAiSurfaceTemperature
  } from '../../store/ai'
  import { addToast } from '../../store/toasts'

  const runSettings = aiRunSettingsForSurface('shell.promptstudio')
  let activeProvider = $derived($aiProviders.find(provider => provider.providerId === $runSettings.providerId) ?? $aiProviders[0])
  let modelOptions = $derived(modelOptionsForProvider(activeProvider, $runSettings.model))
  let requiredSecretReady = $derived(!activeProvider?.secretName || $aiSecretNames.includes(activeProvider.secretName))
  let includedContextCount = $derived($aiContextCandidates.filter(candidate => candidate.included).length)
  let runCount = $derived($aiRuns.length)
  let modelSummary = $derived(`${activeProvider?.providerName ?? 'AI provider'} / ${$runSettings.model} / temp ${$runSettings.temperature.toFixed(1)}`)

  onMount(() => {
    void loadAiProviders()
    void refreshAiContext()
    void loadAiRuns()
  })

  async function useRunSettings(run: AiRun): Promise<void> {
    await selectAiSurfaceProvider('shell.promptstudio', run.providerId)
    selectAiSurfaceModel('shell.promptstudio', run.model)
    selectAiSurfaceTemperature('shell.promptstudio', run.temperature)
    addToast('info', 'Run settings applied.')
  }
</script>

<div class="inspector-view">
  <div class="section">
    <h3>Run Readiness</h3>
    <div class="history-item">
      <div class="time">Provider status</div>
      <div class:success={requiredSecretReady} class:error={!requiredSecretReady} class="status">
        {$runSettings.providerId === 'mock-local' ? 'Mock' : requiredSecretReady ? 'Ready' : `Missing ${activeProvider?.secretName ?? 'secret'}`}
      </div>
    </div>
    <div class="history-item">
      <div class="time">Model</div>
      <div class="status">{modelSummary}</div>
    </div>
  </div>

  <details class="section disclosure">
    <summary>
      <span class="section-title">Model Settings</span>
      <span class="summary-copy">Preset, provider, model, and temperature.</span>
    </summary>
    <AiModelPresetPicker fieldId="promptstudio-model-preset" surfaceId="shell.promptstudio" />

    <div class="field">
      <label for="provider">Provider</label>
      <select
        id="provider"
        class="select-input"
        value={$runSettings.providerId}
        onchange={(event) => void selectAiSurfaceProvider('shell.promptstudio', event.currentTarget.value)}
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
        value={$runSettings.model}
        onchange={(event) => selectAiSurfaceModel('shell.promptstudio', event.currentTarget.value)}
      >
        {#each modelOptions as model (model)}
          <option value={model}>{model}</option>
        {/each}
      </select>
    </div>

    <div class="field">
      <label for="temp">Temperature: <span class="val">{$runSettings.temperature.toFixed(1)}</span></label>
      <input
        id="temp"
        type="range"
        min="0"
        max="2"
        step="0.1"
        value={$runSettings.temperature}
        oninput={(event) => selectAiSurfaceTemperature('shell.promptstudio', Number(event.currentTarget.value))}
      />
    </div>
  </details>

  <details class="section disclosure">
    <summary>
      <span class="section-title">Context</span>
      <span class="summary-copy">{includedContextCount === 0 ? 'No selected context' : `${includedContextCount} selected`}</span>
    </summary>
    <AiContextPicker />
  </details>

  <details class="section disclosure">
    <summary>
      <span class="section-title">Run History</span>
      <span class="summary-copy">{runCount === 0 ? 'No prompt runs yet' : `${runCount} recorded`}</span>
    </summary>
    <RunHistoryList runs={$aiRuns} emptyLabel="No AI runs yet." onUseSettings={useRunSettings} />
  </details>
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

  .section-title {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .disclosure {
    border-bottom: var(--border-subtle);
    padding-bottom: var(--space-3);
  }

  .disclosure summary {
    display: grid;
    gap: 3px;
    cursor: pointer;
    list-style: none;
  }

  .disclosure summary::-webkit-details-marker {
    display: none;
  }

  .disclosure summary::after {
    content: 'Show';
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .disclosure[open] summary {
    margin-bottom: var(--space-3);
  }

  .disclosure[open] summary::after {
    content: 'Hide';
  }

  .summary-copy {
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    line-height: 1.4;
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

  .select-input:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
    border-color: var(--color-accent);
  }

  input[type="range"] {
    width: 100%;
    margin-top: var(--space-2);
    accent-color: var(--color-accent);
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
