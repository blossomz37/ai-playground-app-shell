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
  import { editorSettings, type EditorSettings, themeMode, setThemePreference, type ThemeMode } from '../store'

  let open = $state(false)

  // Theme state
  let currentTheme = $state<ThemeMode>($themeMode)
  $effect(() => { currentTheme = $themeMode })

  const themeOptions: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light', label: 'Light', icon: '☀️' },
    { mode: 'dark',  label: 'Dark',  icon: '🌙' },
    { mode: 'system', label: 'System', icon: '💻' },
  ]

  async function selectTheme(mode: ThemeMode) {
    currentTheme = mode
    await setThemePreference(mode)
  }

  // Local copy for live editing
  let fontFamily = $state($editorSettings.fontFamily)
  let fontSize = $state($editorSettings.fontSize)
  let spellcheck = $state($editorSettings.spellcheck)

  // Secrets state
  let secretNames = $state<string[]>([])
  let newSecretName = $state('')
  let newSecretValue = $state('')
  let editingSecret = $state<string | null>(null)
  let editSecretValue = $state('')
  let secretsLoading = $state(false)

  // Sync when store changes externally
  $effect(() => {
    fontFamily = $editorSettings.fontFamily
    fontSize = $editorSettings.fontSize
    spellcheck = $editorSettings.spellcheck
  })

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
    } catch {
      secretNames = []
    }
    secretsLoading = false
  }

  async function addSecret() {
    const name = newSecretName.trim()
    const value = newSecretValue
    if (!name || !value) return
    await window.shell.secrets.set(name, value)
    newSecretName = ''
    newSecretValue = ''
    await loadSecrets()
  }

  async function updateSecret(name: string) {
    if (!editSecretValue) return
    await window.shell.secrets.set(name, editSecretValue)
    editingSecret = null
    editSecretValue = ''
  }

  async function deleteSecret(name: string) {
    await window.shell.secrets.delete(name)
    if (editingSecret === name) editingSecret = null
    await loadSecrets()
  }

  export function toggle() {
    open = !open
    if (open) loadSecrets()
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
        <!-- Appearance section -->
        <section class="section">
          <h3 class="section-title">Appearance</h3>

          <div class="field">
            <span class="field-label" id="theme-label">Theme</span>
            <div class="theme-selector" role="radiogroup" aria-labelledby="theme-label">
              {#each themeOptions as opt}
                <button
                  class="theme-btn"
                  class:active={currentTheme === opt.mode}
                  onclick={() => selectTheme(opt.mode)}
                  title={opt.label}
                  role="radio"
                  aria-checked={currentTheme === opt.mode}
                >
                  <span class="theme-icon">{opt.icon}</span>
                  <span class="theme-label">{opt.label}</span>
                </button>
              {/each}
            </div>
          </div>
        </section>

        <!-- Editor section -->
        <section class="section">
          <h3 class="section-title">Editor</h3>

          <div class="field">
            <label class="field-label" for="settings-font">Font Family</label>
            <select
              id="settings-font"
              class="field-select"
              bind:value={fontFamily}
              onchange={() => apply('fontFamily', fontFamily)}
            >
              {#each fontOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>

          <div class="field">
            <label class="field-label" for="settings-size">Font Size</label>
            <select
              id="settings-size"
              class="field-select"
              bind:value={fontSize}
              onchange={() => apply('fontSize', fontSize)}
            >
              {#each sizeOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>

          <div class="field field-row">
            <label class="field-label" for="settings-spellcheck">Spellcheck</label>
            <button
              id="settings-spellcheck"
              class="toggle-btn"
              class:active={spellcheck}
              onclick={() => { spellcheck = !spellcheck; apply('spellcheck', spellcheck) }}
              role="switch"
              aria-checked={spellcheck}
              aria-label="Toggle spellcheck"
            >
              <span class="toggle-knob"></span>
            </button>
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
                          class="secret-btn"
                          onclick={() => {
                            editingSecret = editingSecret === name ? null : name
                            editSecretValue = ''
                          }}
                          title="Edit"
                        >✎</button>
                        <button
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

  /* ── Theme selector (segmented control) ──────────────────────────────── */
  .theme-selector {
    display: flex;
    gap: 2px;
    background: var(--color-bg-overlay);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 2px;
  }

  .theme-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    color: var(--color-fg-muted);
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }

  .theme-btn:hover {
    color: var(--color-fg-secondary);
  }

  .theme-btn.active {
    background: var(--color-bg-surface);
    color: var(--color-accent);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }

  .theme-icon {
    font-size: 14px;
    line-height: 1;
  }

  .theme-label {
    font-weight: 500;
  }
</style>
