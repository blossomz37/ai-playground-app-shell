<script lang="ts">
  import { editorSettings, type EditorSettings } from '../store'

  const fontOptions = [
    { label: 'System Serif', value: 'var(--font-serif)' },
    { label: 'System Sans', value: 'var(--font-sans)' },
    { label: 'Monospace', value: 'var(--font-mono)' }
  ]

  const sizeOptions = [
    { label: 'Small (14px)', value: 'var(--font-size-md)' },
    { label: 'Medium (16px)', value: 'var(--font-size-lg)' },
    { label: 'Large (20px)', value: 'var(--font-size-xl)' },
    { label: 'Extra Large (24px)', value: 'var(--font-size-2xl)' }
  ]

  function apply(key: keyof EditorSettings, value: string | boolean) {
    editorSettings.update(settings => ({ ...settings, [key]: value }))
    window.shell.settings.set(`editor.${key}`, value)
  }
</script>

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

  .field-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .field-label {
    font-size: var(--font-size-sm);
    color: var(--color-fg-secondary);
  }

  .field-select {
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

  .field-select:focus {
    border-color: var(--color-accent);
  }

  .field-select option {
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
  }

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
</style>
