<!-- Workflow MainView — job runner with output log -->
<script lang="ts">
  import MarkdownContent from '../../shell/MarkdownContent.svelte'
  import { addToast } from '../../store/toasts'
  import { invokeAi, refreshAiContext } from '../../store/ai'

  let running = $state(false)
  let log = $state<string[]>([])

  async function runWorkflow() {
    running = true
    log = [`[${new Date().toLocaleTimeString()}] Starting prompt chain run...`]
    addToast('info', 'Workflow started: Manuscript Context Pass')

    await refreshAiContext()
    log = [...log, `[${new Date().toLocaleTimeString()}] Packed selected workspace context.`]

    const result = await invokeAi({
      moduleId: 'shell.workflow',
      originType: 'chain',
      originId: 'manuscript-context-pass',
      prompt: 'Run a first-pass manuscript workflow over the included context. Return notable signals, missing context, and the next useful prompt step.'
    })

    log = [
      ...log,
      `[${new Date().toLocaleTimeString()}] Run ${result.run.status}: ${result.run.model}`,
      result.run.error ?? result.run.outputText
    ]

    running = false
    addToast('info', 'Workflow complete: run history updated')
  }
</script>

<div class="main-view">
  <header class="runner-header">
    <h1 class="runner-title">Manuscript Context Pass</h1>
    <button class="run-btn" class:running onclick={runWorkflow} disabled={running}>
      {running ? 'Running...' : 'Run Chain'}
    </button>
  </header>
  <div class="log-area">
    {#if log.length === 0}
      <p class="log-empty">No recent runs.</p>
    {:else}
      {#each log as line, index (`${index}-${line.slice(0, 24)}`)}
        <div class="log-line">
          <MarkdownContent content={line} />
        </div>
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
  .log-area { flex: 1; overflow-y: auto; padding: var(--space-4) var(--space-6); font-size: var(--font-size-sm); }
  .log-empty { color: var(--color-fg-muted); }
  .log-line { color: var(--color-fg-secondary); padding: 2px 0; line-height: 1.6; }
</style>
