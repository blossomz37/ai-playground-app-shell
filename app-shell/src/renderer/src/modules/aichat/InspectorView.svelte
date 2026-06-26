<!-- AI Chat InspectorView — context and settings -->
<script lang="ts">
  import { onMount } from 'svelte'
  import type { AiRun } from '@shared/ai'
  import AiContextPicker from '../../shell/AiContextPicker.svelte'
  import RunHistoryList from '../../shell/RunHistoryList.svelte'
  import {
    aiProviders,
    aiRuns,
    aiRunSettingsForSurface,
    aiSecretNames,
    loadAiRuns,
    loadAiProviders,
    modelOptionsForProvider,
    refreshAiContext,
    selectAiSurfaceModel,
    selectAiSurfaceProvider,
    selectAiSurfaceTemperature
  } from '../../store/ai'
  import { addToast } from '../../store/toasts'

  const runSettings = aiRunSettingsForSurface('shell.aichat')
  let activeProvider = $derived($aiProviders.find(provider => provider.providerId === $runSettings.providerId) ?? $aiProviders[0])
  let modelOptions = $derived(modelOptionsForProvider(activeProvider, $runSettings.model))
  let requiredSecretReady = $derived(!activeProvider?.secretName || $aiSecretNames.includes(activeProvider.secretName))
  let includedRunCount = $derived($aiRuns.length)
  let modelSummary = $derived(`${activeProvider?.providerName ?? 'AI provider'} / ${$runSettings.model} / temp ${$runSettings.temperature.toFixed(1)}`)

  onMount(() => {
    void loadAiProviders()
    void refreshAiContext()
    void loadAiRuns()
  })

  async function useRunSettings(run: AiRun): Promise<void> {
    await selectAiSurfaceProvider('shell.aichat', run.providerId)
    selectAiSurfaceModel('shell.aichat', run.model)
    selectAiSurfaceTemperature('shell.aichat', run.temperature)
    addToast('info', 'Run settings applied.')
  }
</script>

<div class="inspector-view">
  <details class="section disclosure">
    <summary>
      <span class="section-title">Context</span>
      <span class="summary-copy">Choose manuscript material for this conversation.</span>
    </summary>
    <AiContextPicker />
  </details>
  <details class="section disclosure">
    <summary>
      <span class="section-title">Model</span>
      <span class="summary-copy">{modelSummary}</span>
    </summary>
    <div class="field">
      <label for="chat-provider">Provider</label>
      <select
        id="chat-provider"
        class="select-input"
        value={$runSettings.providerId}
        onchange={(event) => void selectAiSurfaceProvider('shell.aichat', event.currentTarget.value)}
      >
        {#each $aiProviders as provider (provider.providerId)}
          <option value={provider.providerId}>{provider.providerName}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="chat-model">Model</label>
      <select
        id="chat-model"
        class="select-input"
        value={$runSettings.model}
        onchange={(event) => selectAiSurfaceModel('shell.aichat', event.currentTarget.value)}
      >
        {#each modelOptions as model (model)}
          <option value={model}>{model}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="chat-temperature">Temperature: <span>{$runSettings.temperature.toFixed(1)}</span></label>
      <input
        id="chat-temperature"
        type="range"
        min="0"
        max="2"
        step="0.1"
        value={$runSettings.temperature}
        oninput={(event) => selectAiSurfaceTemperature('shell.aichat', Number(event.currentTarget.value))}
      />
    </div>
    <div class="meta-grid">
      <span class="meta-label">Status</span>
      <span class="meta-value" class:status-mock={$runSettings.providerId === 'mock-local'} class:status-live={requiredSecretReady && $runSettings.providerId !== 'mock-local'} class:status-error={!requiredSecretReady}>
        {$runSettings.providerId === 'mock-local' ? 'Mock mode' : requiredSecretReady ? 'Live ready' : `Missing ${activeProvider?.secretName ?? 'secret'}`}
      </span>
    </div>
  </details>
  <details class="section disclosure">
    <summary>
      <span class="section-title">Runs</span>
      <span class="summary-copy">{includedRunCount === 0 ? 'No chat runs yet' : `${includedRunCount} recorded`}</span>
    </summary>
    <RunHistoryList runs={$aiRuns} emptyLabel="No AI runs yet." onUseSettings={useRunSettings} />
  </details>
</div>

<style>
  .inspector-view { padding: var(--space-4); }
  .section { margin-bottom: var(--space-5); }
  .section-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); margin-bottom: var(--space-3); }
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
  .disclosure summary::-webkit-details-marker { display: none; }
  .disclosure summary::after {
    content: 'Show';
    grid-column: 1;
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
  .field { display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-3); }
  label { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-fg-primary); }
  .select-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-base);
    color: var(--color-fg-primary);
    font-size: var(--font-size-sm);
  }
  .select-input:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
    border-color: var(--color-accent);
  }
  input[type="range"] { width: 100%; margin-top: var(--space-1); accent-color: var(--color-accent); }
  .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--space-1) var(--space-3); font-size: var(--font-size-sm); }
  .meta-label { color: var(--color-fg-muted); }
  .meta-value { color: var(--color-fg-secondary); }
  .status-mock { color: var(--color-warn); }
  .status-live { color: var(--color-success); }
  .status-error { color: var(--color-danger); }
</style>
