<!-- ──────────────────────────────────────────────
  File:        SettingsPanel.svelte
  Description: Modal settings panel (Cmd+,) — editor, appearance, secrets
  Version:     0.3.0
  Created:     2026-05-29
  Modified:    2026-05-29
  Author:      carlo
  ────────────────────────────────────────────── -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { editorSettings, type EditorSettings } from '../store'
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
  import AppearanceSettings from './AppearanceSettings.svelte'

  let open = $state(false)

  // Secrets state
  let secretNames = $state<string[]>([])
  let newSecretName = $state('')
  let newSecretValue = $state('')
  let editingSecret = $state<string | null>(null)
  let editSecretValue = $state('')
  let secretsLoading = $state(false)
  let openAiKeyValue = $state('')
  let openAiKeySaving = $state(false)
  let openAiKeyError = $state('')
  let activeAiProvider = $derived($aiProviders.find(provider => provider.providerId === $selectedAiProviderId) ?? $aiProviders[0])
  let aiModelOptions = $derived(modelOptionsForProvider(activeAiProvider))
  let knownSecretNames = $derived(new Set([...$aiSecretNames, ...secretNames]))
  let aiProviderReady = $derived(!activeAiProvider?.secretName || knownSecretNames.has(activeAiProvider.secretName))
  let openAiKeyStored = $derived(knownSecretNames.has('OPENAI_API_KEY'))

  const fontOptions = [
    { label: 'System Serif', value: "var(--font-serif)" },
    { label: 'System Sans', value: "var(--font-sans)" },
    { label: 'Monospace', value: "var(--font-mono)" },
  ]

  const sizeOptions = [
    { label: 'Small (14px)', value: 'var(--font-size-md)' },
    { label: 'Medium (16px)', value: 'var(--font-size-lg)' },
    { label: 'Large (20px)', value: 'var(--font-size-xl)' },
    { label: 'Extra Large (24px)', value: 'var(--font-size-2xl)' },
  ]

  function apply(key: keyof EditorSettings, value: string | boolean) {
    editorSettings.update(s => ({ ...s, [key]: value }))
    // Persist via IPC
    window.shell.settings.set(`editor.${key}`, value)
  }

  // --- Secrets actions ---
  async function loadSecrets() {
    secretsLoading = true
    try {
      secretNames = await window.shell.secrets.list()
      aiSecretNames.set(secretNames)
    } catch {
      secretNames = []
      aiSecretNames.set([])
    }
    secretsLoading = false
  }

  function markSecretStored(name: string) {
    if (!secretNames.includes(name)) {
      secretNames = [...secretNames, name].sort()
    }
    aiSecretNames.update(names =>
      names.includes(name) ? names : [...names, name].sort()
    )
  }

  async function addSecret() {
    const name = newSecretName.trim()
    const value = newSecretValue
    if (!name || !value) return
    await window.shell.secrets.set(name, value)
    newSecretName = ''
    newSecretValue = ''
    await loadSecrets()
    await loadAiProviders()
  }

  async function updateSecret(name: string) {
    if (!editSecretValue) return
    await window.shell.secrets.set(name, editSecretValue)
    editingSecret = null
    editSecretValue = ''
    await loadSecrets()
    await loadAiProviders()
  }

  async function deleteSecret(name: string) {
    await window.shell.secrets.delete(name)
    if (editingSecret === name) editingSecret = null
    await loadSecrets()
    await loadAiProviders()
  }

  async function chooseAiProvider(providerId: string) {
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

  export function toggle() {
    open = !open
    if (open) {
      void loadSecrets()
      void loadAiProviders()
    }
  }
</script>

{#if open}
  <div class="settings-backdrop" onclick={() => (open = false)} role="presentation">
    <div
      class="settings-panel"
      role="dialog"
      aria-label="Settings"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.key === 'Escape' && (open = false)}
    >
      <header class="settings-header">
        <h2>Settings</h2>
        <button class="close-btn" onclick={() => (open = false)} title="Close">×</button>
      </header>

      <div class="settings-body">
        <AppearanceSettings />

        <!-- Editor section -->
        <section class="section">
          <h3 class="section-title">Editor</h3>

          <div class="field">
            <label class="field-label" for="settings-font">Font Family</label>
            <select
              id="settings-font"
              class="field-select"
              value={$editorSettings.fontFamily}
              onchange={(event) => apply('fontFamily', event.currentTarget.value)}
            >
              {#each fontOptions as opt (opt.value)}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>

          <div class="field">
            <label class="field-label" for="settings-size">Font Size</label>
            <select
              id="settings-size"
              class="field-select"
              value={$editorSettings.fontSize}
              onchange={(event) => apply('fontSize', event.currentTarget.value)}
            >
              {#each sizeOptions as opt (opt.value)}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>

          <div class="field field-row">
            <label class="field-label" for="settings-spellcheck">Spellcheck</label>
            <button
              id="settings-spellcheck"
              class="toggle-btn"
              class:active={$editorSettings.spellcheck}
              onclick={() => apply('spellcheck', !$editorSettings.spellcheck)}
              role="switch"
              aria-checked={$editorSettings.spellcheck}
              aria-label="Toggle spellcheck"
            >
              <span class="toggle-knob"></span>
            </button>
          </div>
        </section>

        <!-- AI Provider section -->
        <section class="section">
          <h3 class="section-title">AI Provider</h3>

          <div class="provider-toggle" role="radiogroup" aria-label="AI provider mode">
            {#each $aiProviders as provider (provider.providerId)}
              <button
                type="button"
                class="provider-option"
                class:active={$selectedAiProviderId === provider.providerId}
                onclick={() => chooseAiProvider(provider.providerId)}
                role="radio"
                aria-checked={$selectedAiProviderId === provider.providerId}
              >
                {provider.providerId === 'mock-local' ? 'Mock Local' : 'OpenAI'}
              </button>
            {/each}
          </div>

          <div class="provider-status">
            <span class="field-label">Active mode</span>
            <span
              class="status-pill"
              class:mock={$selectedAiProviderId === 'mock-local'}
              class:ready={aiProviderReady && $selectedAiProviderId !== 'mock-local'}
              class:missing={!aiProviderReady}
            >
              {$selectedAiProviderId === 'mock-local' ? 'Mock mode' : aiProviderReady ? 'Live ready' : `Missing ${activeAiProvider?.secretName ?? 'secret'}`}
            </span>
          </div>

          <div class="openai-key-box">
            <div class="provider-status compact">
              <span class="field-label">OpenAI key</span>
              <span class="status-pill" class:ready={openAiKeyStored} class:missing={!openAiKeyStored}>
                {openAiKeyStored ? 'Stored' : 'Missing'}
              </span>
            </div>
            <div class="secret-edit inline">
              <input
                type="password"
                class="field-input"
                bind:value={openAiKeyValue}
                placeholder="Paste OpenAI API key"
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
              placeholder="Enter model id"
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

        <!-- Secrets section -->
        <section class="section">
          <h3 class="section-title">Secrets & Credentials</h3>
          <p class="section-desc">
            Encrypted with OS keychain. Values are never stored in plaintext.
          </p>

          {#if secretsLoading}
            <p class="loading-text">Loading…</p>
          {:else}
            <!-- Existing secrets -->
            {#if secretNames.length > 0}
              <ul class="secrets-list">
                {#each secretNames as name (name)}
                  <li class="secret-entry">
                    <div class="secret-header">
                      <span class="secret-name">{name}</span>
                      <span class="secret-value-mask">••••••••</span>
                      <div class="secret-actions">
                        <button
                          type="button"
                          class="secret-btn"
                          onclick={() => {
                            editingSecret = editingSecret === name ? null : name
                            editSecretValue = ''
                          }}
                          title="Edit"
                        >✎</button>
                        <button
                          type="button"
                          class="secret-btn danger"
                          onclick={() => deleteSecret(name)}
                          title="Delete"
                        >✕</button>
                      </div>
                    </div>
                    {#if editingSecret === name}
                      <div class="secret-edit">
                        <input
                          type="password"
                          class="field-input"
                          bind:value={editSecretValue}
                          placeholder="Enter new value…"
                          onkeydown={(e) => e.key === 'Enter' && updateSecret(name)}
                        />
                        <button
                          type="button"
                          class="action-btn"
                          onclick={() => updateSecret(name)}
                          disabled={!editSecretValue}
                        >Update</button>
                      </div>
                    {/if}
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="empty-text">No secrets stored yet.</p>
            {/if}

            <!-- Add new secret -->
            <div class="add-secret">
              <input
                type="text"
                class="field-input"
                bind:value={newSecretName}
                placeholder="Secret name (e.g. OPENAI_API_KEY)"
              />
              <input
                type="password"
                class="field-input"
                bind:value={newSecretValue}
                placeholder="Secret value"
                onkeydown={(e) => e.key === 'Enter' && addSecret()}
              />
              <button
                type="button"
                class="action-btn primary"
                onclick={addSecret}
                disabled={!newSecretName.trim() || !newSecretValue}
              >Add Secret</button>
            </div>
          {/if}
        </section>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 10vh;
    z-index: 1100;
  }

  .settings-panel {
    width: min(480px, 90vw);
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-surface);
    border: var(--border-subtle);
    border-radius: var(--radius-lg);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    animation: panel-in 0.15s ease-out;
  }

  @keyframes panel-in {
    from { opacity: 0; transform: translateY(-8px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: var(--border-subtle);
  }

  .settings-header h2 {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-fg-primary);
  }

  .close-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: 18px;
    cursor: pointer;
    transition: color 0.1s, background 0.1s;
  }

  .close-btn:hover {
    color: var(--color-fg-primary);
    background: var(--color-bg-overlay);
  }

  .settings-body {
    padding: var(--space-4) var(--space-5);
    overflow-y: auto;
  }

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

  .section-desc {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    margin-bottom: var(--space-3);
    line-height: 1.4;
  }

  .error-text {
    margin-top: var(--space-2);
    color: var(--color-danger);
    font-size: var(--font-size-xs);
    line-height: 1.4;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
  }

  .field-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
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

  /* Toggle switch */
  .toggle-btn {
    position: relative;
    width: 40px;
    height: 22px;
    border-radius: 11px;
    background: var(--color-bg-overlay);
    border: 1px solid var(--color-border);
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
    flex-shrink: 0;
  }

  .toggle-btn.active {
    background: var(--color-accent-dim);
    border-color: var(--color-accent);
  }

  .toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-fg-muted);
    transition: transform 0.2s, background 0.2s;
  }

  .toggle-btn.active .toggle-knob {
    transform: translateX(18px);
    background: var(--color-accent);
  }

  /* AI provider section */
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

  .secret-edit.inline {
    padding: 0;
    border-top: 0;
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

  /* Secrets section */
  .secrets-list {
    list-style: none;
    margin: 0;
    padding: 0;
    margin-bottom: var(--space-4);
  }

  .secret-entry {
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-2);
    overflow: hidden;
  }

  .secret-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-overlay);
  }

  .secret-name {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-fg-primary);
    font-weight: 500;
  }

  .secret-value-mask {
    flex: 1;
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    text-align: right;
  }

  .secret-actions {
    display: flex;
    gap: var(--space-1);
    flex-shrink: 0;
  }

  .secret-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--color-fg-muted);
    cursor: pointer;
    transition: color 0.1s, background 0.1s;
  }

  .secret-btn:hover {
    color: var(--color-fg-primary);
    background: var(--color-bg-surface);
  }

  .secret-btn.danger:hover {
    color: var(--color-danger);
  }

  .secret-edit {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-top: var(--border-subtle);
  }

  .secret-edit .field-input {
    flex: 1;
  }

  .add-secret {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
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

  .loading-text,
  .empty-text {
    font-size: var(--font-size-sm);
    color: var(--color-fg-muted);
    padding: var(--space-2) 0;
  }

</style>
