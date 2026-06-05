<script lang="ts">
  import { themeMode, setThemePreference, type ThemeMode } from '../store'

  const themeOptions: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light', label: 'Light', icon: '☀️' },
    { mode: 'dark', label: 'Dark', icon: '🌙' },
    { mode: 'gray', label: 'Gray', icon: '◼' },
    { mode: 'system', label: 'System', icon: '💻' }
  ]

  async function selectTheme(mode: ThemeMode) {
    await setThemePreference(mode)
  }
</script>

<section class="section">
  <h3 class="section-title">Appearance</h3>

  <div class="field">
    <span class="field-label" id="theme-label">Theme</span>
    <div class="theme-selector" role="radiogroup" aria-labelledby="theme-label">
      {#each themeOptions as opt (opt.mode)}
        <button
          class="theme-btn"
          class:active={$themeMode === opt.mode}
          onclick={() => selectTheme(opt.mode)}
          title={opt.label}
          role="radio"
          aria-checked={$themeMode === opt.mode}
        >
          <span class="theme-icon">{opt.icon}</span>
          <span class="theme-label">{opt.label}</span>
        </button>
      {/each}
    </div>
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
