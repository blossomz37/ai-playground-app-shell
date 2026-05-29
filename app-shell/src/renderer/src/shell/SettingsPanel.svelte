<!-- ──────────────────────────────────────────────
  File:        SettingsPanel.svelte
  Description: Modal settings panel (Cmd+,) — editor font, size, spellcheck
  Version:     0.1.0
  Created:     2026-05-29
  Modified:    2026-05-29
  Author:      carlo
  ────────────────────────────────────────────── -->
<script lang="ts">
  import { editorSettings, type EditorSettings } from '../store'

  let open = $state(false)

  // Local copy for live editing
  let fontFamily = $state($editorSettings.fontFamily)
  let fontSize = $state($editorSettings.fontSize)
  let spellcheck = $state($editorSettings.spellcheck)

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

  export function toggle() {
    open = !open
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
</style>
