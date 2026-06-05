<!-- Workflow MainView — job runner with output log -->
<script lang="ts">
  import InlineRename from '../../shell/InlineRename.svelte'
  import MarkdownContent from '../../shell/MarkdownContent.svelte'
  import { addToast } from '../../store/toasts'
  import { refreshAiContext, includedAiContextCandidates } from '../../store/ai'
  import { submitJob } from '../../store/jobs'
  import { renameWorkflowProfile, selectedWorkflowProfile } from './state'

  let running = $state(false)
  let log = $state<string[]>([])
  let renamingProfile = $state(false)

  async function runWorkflow() {
    running = true
    log = [`[${new Date().toLocaleTimeString()}] Starting prompt chain run...`]
    addToast('info', `Workflow started: ${$selectedWorkflowProfile.name}`)

    await refreshAiContext()
    log = [...log, `[${new Date().toLocaleTimeString()}] Packed selected workspace context.`]

    const job = await submitJob('ai.chain.mock', {
      originId: $selectedWorkflowProfile.id,
      prompt: $selectedWorkflowProfile.prompt,
      contextCandidates: includedAiContextCandidates()
    })

    log = [
      ...log,
      `[${new Date().toLocaleTimeString()}] Job queued: ${job?.title ?? 'Workflow chain'}`
    ]

    running = false
    addToast('info', 'Workflow job queued')
  }

  function commitRename(id: string, name: string): void {
    if (!name) {
      addToast('warn', 'Prompt chain name cannot be blank.')
      renamingProfile = false
      return
    }
    renameWorkflowProfile(id, name)
    renamingProfile = false
  }
</script>

<div class="main-view">
  <header class="zone-header runner-header">
    {#if renamingProfile}
      <InlineRename
        value={$selectedWorkflowProfile.name}
        ariaLabel="Rename prompt chain"
        onCommit={(name) => commitRename($selectedWorkflowProfile.id, name)}
        onCancel={() => renamingProfile = false}
      />
    {:else}
      <button type="button" class="runner-title" onclick={() => renamingProfile = true}>
        {$selectedWorkflowProfile.name}
      </button>
    {/if}
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
  .runner-header { justify-content: space-between; gap: var(--space-3); padding: 0 var(--space-6); }
  .runner-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; font-size: var(--font-size-md); font-weight: 700; color: var(--color-fg-primary); }
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
