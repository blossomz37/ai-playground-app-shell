<!-- Workflow InspectorView — chain configuration -->
<script lang="ts">
  import { onMount } from 'svelte'
  import {
    aiProviders,
    aiSecretNames,
    loadAiProviders,
    modelOptionsForProvider,
    selectAiModel,
    selectAiProvider,
    selectedAiModel,
    selectedAiProviderId
  } from '../../store/ai'
  import {
    selectedWorkflowProfile,
    workflowCreateProposal,
    workflowIncludeActiveDocument,
    workflowIncludeDescendants
  } from './state'

  let activeProvider = $derived($aiProviders.find(provider => provider.providerId === $selectedAiProviderId) ?? $aiProviders[0])
  let modelOptions = $derived(modelOptionsForProvider(activeProvider))
  let requiredSecretReady = $derived(!activeProvider?.secretName || $aiSecretNames.includes(activeProvider.secretName))

  onMount(() => {
    void loadAiProviders()
  })
</script>

<div class="inspector-view">
  <section class="section">
    <h3 class="section-title">Chain Config</h3>
    <div class="field">
      <label for="workflow-provider">Provider</label>
      <select
        id="workflow-provider"
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
      <label for="workflow-model">Model</label>
      <select
        id="workflow-model"
        class="select-input"
        value={$selectedAiModel}
        onchange={(event) => selectAiModel(event.currentTarget.value)}
      >
        {#each modelOptions as model (model)}
          <option value={model}>{model}</option>
        {/each}
      </select>
    </div>
    <div class="meta-grid">
      <span class="meta-label">Status</span><span class="meta-value" class:status-live={requiredSecretReady && $selectedAiProviderId !== 'mock-local'} class:status-mock={$selectedAiProviderId === 'mock-local'} class:status-error={!requiredSecretReady}>{$selectedAiProviderId === 'mock-local' ? 'Mock mode' : requiredSecretReady ? 'Live ready' : `Missing ${activeProvider?.secretName ?? 'secret'}`}</span>
      <span class="meta-label">Context</span><span class="meta-value">Selected candidates</span>
      <span class="meta-label">Chain</span><span class="meta-value">{$selectedWorkflowProfile.status}</span>
    </div>
  </section>
  <section class="section">
    <h3 class="section-title">Options</h3>
    <label class="option"><input type="checkbox" bind:checked={$workflowIncludeActiveDocument} /> Include active document</label>
    <label class="option"><input type="checkbox" bind:checked={$workflowIncludeDescendants} /> Include descendants</label>
    <label class="option"><input type="checkbox" bind:checked={$workflowCreateProposal} /> Create proposal</label>
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
  .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: var(--space-1) var(--space-3); font-size: var(--font-size-sm); }
  .meta-label { color: var(--color-fg-muted); }
  .meta-value { color: var(--color-fg-secondary); }
  .status-mock { color: var(--color-warn); }
  .status-live { color: var(--color-success); }
  .status-error { color: var(--color-danger); }
  .option { display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); color: var(--color-fg-secondary); padding: var(--space-1) 0; cursor: pointer; }
  .option input { accent-color: var(--color-accent); }
</style>
