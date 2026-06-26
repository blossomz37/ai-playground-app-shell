<!-- ──────────────────────────────────────────────
  File:        ToastContainer.svelte
  Description: Stacked bottom-right toast notifications with enter/exit animations
  Version:     0.1.0
  Created:     2026-05-29
  Modified:    2026-05-29
  Author:      carlo
  ────────────────────────────────────────────── -->
<script lang="ts">
  import { toasts, dismissToast, type Toast } from '../store/toasts'

  function icon(level: Toast['level']): string {
    switch (level) {
      case 'info':  return 'ℹ'
      case 'warn':  return '⚠'
      case 'error': return '✕'
    }
  }
</script>

<div class="toast-container" aria-live="polite" aria-relevant="additions removals">
  {#each $toasts as toast (toast.id)}
    <div class="toast toast-{toast.level}" role="status">
      <span class="toast-icon">{icon(toast.level)}</span>
      <span class="toast-message">{toast.message}</span>
      <button
        class="toast-dismiss"
        title="Dismiss"
        onclick={() => dismissToast(toast.id)}
      >×</button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 40px;
    right: 16px;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
    max-width: min(400px, 90vw);
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-bg-surface) 94%, transparent);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid color-mix(in srgb, var(--color-border-strong) 70%, transparent);
    box-shadow: 0 10px 28px rgb(0 0 0 / 0.28);
    font-size: var(--font-size-sm);
    color: var(--color-fg-primary);
    pointer-events: auto;
    animation: toast-in 0.25s ease-out;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  @keyframes toast-in {
    from { opacity: 0; transform: translateX(40px) scale(0.95); }
    to   { opacity: 1; transform: translateX(0) scale(1); }
  }

  .toast-icon {
    flex-shrink: 0;
    width: 18px;
    text-align: center;
    font-size: 14px;
    line-height: 1.4;
  }

  .toast-info  .toast-icon { color: var(--color-fg-muted); }
  .toast-warn  .toast-icon { color: var(--color-warn); }
  .toast-error .toast-icon { color: var(--color-danger); }

  .toast-info  { border-left: 3px solid var(--color-border-strong); }

  .toast-warn {
    background: color-mix(in srgb, var(--color-warn) 10%, var(--color-bg-surface) 90%);
    border-color: color-mix(in srgb, var(--color-warn) 42%, var(--color-border-strong) 58%);
    border-left: 3px solid var(--color-warn);
  }

  .toast-error {
    background: color-mix(in srgb, var(--color-danger) 9%, var(--color-bg-surface) 91%);
    border-color: color-mix(in srgb, var(--color-danger) 42%, var(--color-border-strong) 58%);
    border-left: 3px solid var(--color-danger);
  }

  .toast-message {
    flex: 1;
    line-height: 1.4;
    color: var(--color-fg-primary);
    word-break: break-word;
  }

  .toast-dismiss {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: 14px;
    cursor: pointer;
    transition: color 0.1s, background 0.1s;
  }

  .toast-dismiss:hover {
    color: var(--color-fg-primary);
    background: var(--color-hover);
  }
</style>
