<script lang="ts">
  import { demoModeEnabled, setDemoModePreference } from '../store'
  import { loadAiProviders } from '../store/ai'

  let saving = $state(false)

  async function toggleDemoMode(): Promise<void> {
    saving = true
    try {
      await setDemoModePreference(!$demoModeEnabled)
      await loadAiProviders()
    } finally {
      saving = false
    }
  }
</script>

<section class="section">
  <h3 class="section-title">Demo Mode</h3>

  <div class="field field-row">
    <div class="field-copy">
      <span class="field-label">Enable sample content and mock AI</span>
      <span class="field-hint">Use for training, screenshots, and offline testing. Existing user content is never deleted.</span>
    </div>
    <button
      class="toggle-btn"
      class:active={$demoModeEnabled}
      type="button"
      role="switch"
      aria-checked={$demoModeEnabled}
      aria-label="Toggle demo mode"
      disabled={saving}
      onclick={toggleDemoMode}
    >
      <span class="toggle-knob"></span>
    </button>
  </div>

  <p class="reload-note">Browser preview demo content updates after reload.</p>
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

  .field-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    margin-bottom: var(--space-2);
  }

  .field-copy {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  .field-label {
    color: var(--color-fg-secondary);
    font-size: var(--font-size-sm);
  }

  .field-hint,
  .reload-note {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    line-height: 1.45;
  }

  .reload-note {
    margin: 0;
  }

  .toggle-btn {
    position: relative;
    width: 40px;
    height: 22px;
    flex-shrink: 0;
    border: 1px solid var(--color-border);
    border-radius: 11px;
    background: var(--color-bg-overlay);
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .toggle-btn.active {
    background: var(--color-accent-dim);
    border-color: var(--color-accent);
  }

  .toggle-btn:disabled {
    cursor: wait;
    opacity: 0.65;
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
</style>
