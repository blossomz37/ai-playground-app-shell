<script lang="ts">
  import { loadAiProviders } from '../store/ai'

  type Props = {
    secretNames: string[]
    secretsLoading: boolean
    loadSecrets: () => Promise<void>
  }

  let { secretNames, secretsLoading, loadSecrets }: Props = $props()

  let newSecretName = $state('')
  let newSecretValue = $state('')
  let editingSecret = $state<string | null>(null)
  let editSecretValue = $state('')

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
</script>

<section class="section">
  <h3 class="section-title">Secrets & Credentials</h3>
  <p class="section-desc">
    Encrypted with OS keychain. Values are never stored in plaintext.
  </p>

  {#if secretsLoading}
    <p class="loading-text">Loading...</p>
  {:else}
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
                  placeholder="Enter new value..."
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

  .section-desc {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    margin-bottom: var(--space-3);
    line-height: 1.4;
  }

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
    cursor: text;
    transition: border-color 0.15s;
  }

  .field-input:focus {
    border-color: var(--color-accent);
  }

  .secrets-list {
    list-style: none;
    margin: 0 0 var(--space-4);
    padding: 0;
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
