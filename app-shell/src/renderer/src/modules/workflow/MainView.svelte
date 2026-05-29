<!-- Workflow MainView — job runner with output log -->
<script lang="ts">
  import { addToast } from '../../store/toasts'

  let running = $state(false)
  let log = $state<string[]>([])

  async function runExport() {
    running = true
    log = ['[15:22:01] Starting Markdown export…']
    addToast('info', 'Export started: Markdown Export')

    // Simulate export steps
    await new Promise(r => setTimeout(r, 800))
    log = [...log, '[15:22:02] Processing 3 chapters…']
    await new Promise(r => setTimeout(r, 600))
    log = [...log, '[15:22:02] Writing output files…']
    await new Promise(r => setTimeout(r, 400))
    log = [...log, '[15:22:03] ✓ Export complete — 3 files written']

    running = false
    addToast('info', 'Export complete: 3 files written')
  }
</script>

<div class="main-view">
  <header class="runner-header">
    <h1 class="runner-title">Markdown Export</h1>
    <button class="run-btn" class:running onclick={runExport} disabled={running}>
      {running ? '⟳ Running…' : '▶ Run Export'}
    </button>
  </header>
  <div class="log-area">
    {#if log.length === 0}
      <p class="log-empty">No recent runs. Click "Run Export" to start.</p>
    {:else}
      {#each log as line}
        <div class="log-line">{line}</div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .main-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .runner-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4) var(--space-6); border-bottom: var(--border-subtle); flex-shrink: 0; }
  .runner-title { font-size: var(--font-size-xl); font-weight: 600; color: var(--color-fg-primary); }
  .run-btn {
    padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); font-size: var(--font-size-sm); font-weight: 500;
    color: var(--color-bg-base); background: var(--color-accent); cursor: pointer; transition: opacity 0.15s;
  }
  .run-btn:hover { opacity: 0.9; }
  .run-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .run-btn.running { background: var(--color-warn); }
  .log-area { flex: 1; overflow-y: auto; padding: var(--space-4) var(--space-6); font-family: var(--font-mono); font-size: var(--font-size-sm); }
  .log-empty { color: var(--color-fg-muted); }
  .log-line { color: var(--color-fg-secondary); padding: 2px 0; line-height: 1.6; }
</style>
