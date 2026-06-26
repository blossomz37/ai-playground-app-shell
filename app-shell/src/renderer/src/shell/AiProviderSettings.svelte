<script lang="ts">
  import type { AiProviderId } from '@shared/ai'
  import AiModelPresetPicker from './AiModelPresetPicker.svelte'
  import {
    aiProviders,
    aiSecretNames,
    loadAiProviders,
    modelOptionsForProvider,
    selectAiModel,
    selectAiProvider,
    selectAiTemperature,
    selectedAiModel,
    selectedAiProviderId,
    selectedAiTemperature
  } from '../store/ai'

  type Props = {
    secretNames: string[]
    markSecretStored: (name: string) => void
    loadSecrets: () => Promise<void>
  }

  let { secretNames, markSecretStored, loadSecrets }: Props = $props()

  let openAiKeyValue = $state('')
  let openAiKeySaving = $state(false)
  let openAiKeyError = $state('')
  let activeAiProvider = $derived($aiProviders.find(provider => provider.providerId === $selectedAiProviderId) ?? $aiProviders[0])
  let aiModelOptions = $derived(modelOptionsForProvider(activeAiProvider))
  let knownSecretNames = $derived(new Set([...$aiSecretNames, ...secretNames]))
  let aiProviderReady = $derived(!activeAiProvider?.secretName || knownSecretNames.has(activeAiProvider.secretName))
  let openAiKeyStored = $derived(knownSecretNames.has('OPENAI_API_KEY'))

  async function chooseAiProvider(providerId: AiProviderId) {
    openAiKeyError = ''
    await selectAiProvider(providerId)
  }

  async function saveOpenAiKey() {
    const value = openAiKeyValue.trim()
    if (!value) return
    openAiKeySaving = true
    openAiKeyError = ''
    try {
      await window.shell.secrets.set('OPENAI_API_KEY', value)
      openAiKeyValue = ''
      markSecretStored('OPENAI_API_KEY')
      await selectAiProvider('openai-responses')
      await loadSecrets()
      await loadAiProviders()
      await selectAiProvider('openai-responses')
    } catch (err) {
      openAiKeyError = err instanceof Error ? err.message : String(err)
    } finally {
      openAiKeySaving = false
    }
  }
</script>

<section class="section">
  <h3 class="section-title">AI Tools</h3>

  <div class="provider-toggle" role="radiogroup" aria-label="AI mode">
    {#each $aiProviders as provider (provider.providerId)}
      <button
        type="button"
        class="provider-option"
        class:active={$selectedAiProviderId === provider.providerId}
        onclick={() => chooseAiProvider(provider.providerId)}
        role="radio"
        aria-checked={$selectedAiProviderId === provider.providerId}
      >
        {provider.providerId === 'mock-local' ? 'Practice' : 'OpenAI'}
      </button>
    {/each}
  </div>

  <div class="provider-status">
    <span class="field-label">Current AI mode</span>
    <span
      class="status-pill"
      class:mock={$selectedAiProviderId === 'mock-local'}
      class:ready={aiProviderReady && $selectedAiProviderId !== 'mock-local'}
      class:missing={!aiProviderReady}
    >
      {$selectedAiProviderId === 'mock-local' ? 'Practice mode' : aiProviderReady ? 'Ready' : 'Needs API key'}
    </span>
  </div>

  <AiModelPresetPicker fieldId="settings-ai-model-preset" />

  <div class="openai-key-box">
    <div class="provider-status compact">
      <span class="field-label">OpenAI API key</span>
      <span class="status-pill" class:ready={openAiKeyStored} class:missing={!openAiKeyStored}>
        {openAiKeyStored ? 'Stored' : 'Missing'}
      </span>
    </div>
    <div class="secret-edit inline">
      <input
        type="password"
        class="field-input"
        bind:value={openAiKeyValue}
        placeholder="Paste API key"
        onkeydown={(e) => e.key === 'Enter' && saveOpenAiKey()}
      />
      <button
        type="button"
        class="action-btn primary"
        onclick={saveOpenAiKey}
        disabled={!openAiKeyValue.trim() || openAiKeySaving}
      >{openAiKeySaving ? 'Saving...' : 'Save & Use'}</button>
    </div>
    {#if openAiKeyError}
      <p class="error-text">{openAiKeyError}</p>
    {/if}
  </div>

  <div class="field">
    <label class="field-label" for="settings-ai-model">Model</label>
    <select
      id="settings-ai-model"
      class="field-select"
      value={$selectedAiModel}
      onchange={(event) => selectAiModel(event.currentTarget.value)}
    >
      {#each aiModelOptions as model (model)}
        <option value={model}>{model}</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <label class="field-label" for="settings-ai-custom-model">Custom model</label>
    <input
      id="settings-ai-custom-model"
      type="text"
      class="field-input"
      value={$selectedAiModel}
      oninput={(event) => selectAiModel(event.currentTarget.value)}
      placeholder="Enter model ID"
    />
  </div>

  <div class="field">
    <label class="field-label" for="settings-ai-temp">Temperature: {$selectedAiTemperature.toFixed(1)}</label>
    <input
      id="settings-ai-temp"
      class="range-input"
      type="range"
      min="0"
      max="2"
      step="0.1"
      value={$selectedAiTemperature}
      oninput={(event) => selectAiTemperature(Number(event.currentTarget.value))}
    />
  </div>
</section>

<style>
  .section {
    margin-bottom: var(--space-5);
  }

  .section-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-3);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
  }

  .field-label {
    font-size: var(--font-size-sm);
    color: var(--color-fg-secondary);
  }

  .field-select,
  .field-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-overlay);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--color-fg-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .field-input {
    cursor: text;
  }

  .field-select:focus,
  .field-input:focus {
    border-color: var(--color-accent);
  }

  .field-select option {
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
  }

  .provider-toggle {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-1);
    padding: var(--space-1);
    margin-bottom: var(--space-4);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-bg-overlay);
  }

  .provider-option {
    min-height: 34px;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .provider-option.active {
    background: var(--color-accent-dim);
    color: var(--color-fg-primary);
  }

  .range-input {
    width: 100%;
    margin-top: var(--space-1);
    accent-color: var(--color-accent);
  }

  .provider-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
  }

  .provider-status.compact {
    margin-bottom: var(--space-2);
  }

  .openai-key-box {
    margin: var(--space-3) 0 var(--space-4);
  }

  .secret-edit {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-top: var(--border-subtle);
  }

  .secret-edit.inline {
    padding: 0;
    border-top: 0;
  }

  .secret-edit .field-input {
    flex: 1;
  }

  .action-btn {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
    color: var(--color-fg-secondary);
    background: var(--color-bg-overlay);
    border: var(--border-subtle);
  }

  .action-btn.primary {
    background: var(--color-accent-dim);
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .action-btn:hover:not(:disabled) {
    opacity: 0.85;
  }

  .action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .status-pill {
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .status-pill.mock {
    color: var(--color-warn);
  }

  .status-pill.ready {
    color: var(--color-success);
  }

  .status-pill.missing {
    color: var(--color-danger);
  }

  .error-text {
    margin-top: var(--space-2);
    color: var(--color-danger);
    font-size: var(--font-size-xs);
    line-height: 1.4;
  }
</style>
