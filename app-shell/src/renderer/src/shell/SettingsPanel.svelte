<!-- ──────────────────────────────────────────────
  File:        SettingsPanel.svelte
  Description: Modal settings panel (Cmd+,) — editor, appearance, secrets
  Version:     0.3.0
  Created:     2026-05-29
  Modified:    2026-05-29
  Author:      carlo
  ────────────────────────────────────────────── -->
<script lang="ts">
  import { aiSecretNames, loadAiProviders } from '../store/ai'
  import AiProviderSettings from './AiProviderSettings.svelte'
  import AppearanceSettings from './AppearanceSettings.svelte'
  import EditorSettings from './EditorSettings.svelte'
  import SecretsSettings from './SecretsSettings.svelte'

  let open = $state(false)

  let secretNames = $state<string[]>([])
  let secretsLoading = $state(false)

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
        <EditorSettings />
        <AiProviderSettings {secretNames} {markSecretStored} {loadSecrets} />
        <SecretsSettings {secretNames} {secretsLoading} {loadSecrets} />
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

</style>
