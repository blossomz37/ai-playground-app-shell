<!-- AI Chat InspectorView — context and settings -->
<script lang="ts">
  import { onMount } from 'svelte'
  import type { AiRun } from '@shared/ai'
  import AiContextPicker from '../../shell/AiContextPicker.svelte'
  import RunHistoryList from '../../shell/RunHistoryList.svelte'
  import {
    aiProviders,
    aiRuns,
    aiSecretNames,
    loadAiRuns,
    loadAiProviders,
    modelOptionsForProvider,
    refreshAiContext,
    selectAiModel,
    selectAiProvider,
    selectAiTemperature,
    selectedAiModel,
    selectedAiProviderId,
    selectedAiTemperature
  } from '../../store/ai'
  import { addToast } from '../../store/toasts'

  let activeProvider = $derived($aiProviders.find(provider => provider.providerId === $selectedAiProviderId) ?? $aiProviders[0])
  let modelOptions = $derived(modelOptionsForProvider(activeProvider))
  let requiredSecretReady = $derived(!activeProvider?.secretName || $aiSecretNames.includes(activeProvider.secretName))

  onMount(() => {
    void loadAiProviders()
    void refreshAiContext()
    void loadAiRuns('shell.aichat')
  })

  async function useRunSettings(run: AiRun): Promise<void> {
    await selectAiProvider(run.providerId)
    await selectAiModel(run.model)
    await selectAiTemperature(run.temperature)
    addToast('info', 'Run settings applied.')
  }
</script>

<div class="inspector-view">
  <section class="section">
    <h3 class="section-title">Context</h3>
    <AiContextPicker />
  </section>
  <section class="section">
    <h3 class="section-title">Model</h3>
    <div class="field">
      <label for="chat-provider">Provider</label>
      <select
        id="chat-provider"
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
      <label for="chat-model">Model</label>
      <select
        id="chat-model"
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
      <label for="chat-temperature">Temperature: <span>{$selectedAiTemperature.toFixed(1)}</span></label>
      <input
        id="chat-temperature"
        type="range"
        min="0"
        max="2"
        step="0.1"
        value={$selectedAiTemperature}
        oninput={(event) => selectAiTemperature(Number(event.currentTarget.value))}
      />
    </div>
    <div class="meta-grid">
      <span class="meta-label">Status</span>
      <span class="meta-value" class:status-mock={$selectedAiProviderId === 'mock-local'} class:status-live={requiredSecretReady && $selectedAiProviderId !== 'mock-local'} class:status-error={!requiredSecretReady}>
        {$selectedAiProviderId === 'mock-local' ? 'Mock mode' : requiredSecretReady ? 'Live ready' : `Missing ${activeProvider?.secretName ?? 'secret'}`}
      </span>
    </div>
  </section>
  <section class="section">
    <h3 class="section-title">Runs</h3>
    <RunHistoryList runs={$aiRuns} emptyLabel="No chat runs yet." onUseSettings={useRunSettings} />
  </section>
</div>

<style>
  .inspector-view { padding: var(--space-4); }
  .section { margin-bottom: var(--space-5); }
  .section-title { font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-fg-muted); margin-bottom: var(--space-3); }
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
  .select-input:focus { outline: none; border-color: var(--color-accent); }
  input[type="range"] { width: 100%; margin-top: var(--space-1); accent-color: var(--color-accent); }
  .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--space-1) var(--space-3); font-size: var(--font-size-sm); }
  .meta-label { color: var(--color-fg-muted); }
  .meta-value { color: var(--color-fg-secondary); }
  .status-mock { color: var(--color-warn); }
  .status-live { color: var(--color-success); }
  .status-error { color: var(--color-danger); }
</style>
