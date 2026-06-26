<!-- Workflow MainView — job runner with output log -->
<script lang="ts">
  import InlineRename from '../../shell/InlineRename.svelte'
  import MarkdownContent from '../../shell/MarkdownContent.svelte'
  import { activeDoc } from '../../store'
  import { addToast } from '../../store/toasts'
  import { aiRunSettingsForSurface, createAiProposalFromInvocation, refreshAiContext, includedAiContextCandidates } from '../../store/ai'
  import { submitJob } from '../../store/jobs'
  import {
    renameWorkflowProfile,
    selectedWorkflowProfile,
    workflowCreateProposal,
    workflowIncludeActiveDocument,
    workflowIncludeDescendants
  } from './state'

  let running = $state(false)
  let log = $state<string[]>([])
  let renamingProfile = $state(false)
  const runSettings = aiRunSettingsForSurface('shell.workflow')
  let promptSummary = $derived($selectedWorkflowProfile.prompt.length > 170
    ? `${$selectedWorkflowProfile.prompt.slice(0, 170).trim()}...`
    : $selectedWorkflowProfile.prompt
  )
  let contextSummary = $derived([
    $workflowIncludeActiveDocument ? 'active document' : null,
    $workflowIncludeDescendants ? 'descendants' : null,
    $workflowCreateProposal ? 'proposal output' : null
  ].filter(Boolean).join(', ') || 'manual context')

  async function runWorkflow() {
    running = true
    log = [`[${new Date().toLocaleTimeString()}] Starting workflow prompt...`]
    addToast('info', `Workflow started: ${$selectedWorkflowProfile.name}`)

    try {
      await refreshAiContext()
      log = [...log, `[${new Date().toLocaleTimeString()}] Packed selected workspace context.`]

      if ($workflowCreateProposal && $activeDoc) {
        const proposal = await createAiProposalFromInvocation({
          targetDocumentId: $activeDoc.id,
          proposalType: 'append-note',
          sourceText: '',
          runParams: {
            moduleId: 'shell.workflow',
            originType: 'workflow',
            originId: $selectedWorkflowProfile.id,
            prompt: $selectedWorkflowProfile.prompt,
            providerId: $runSettings.providerId,
            model: $runSettings.model,
            temperature: $runSettings.temperature
          }
        })
        log = [
          ...log,
          `[${new Date().toLocaleTimeString()}] Proposal created: ${proposal.id}`
        ]
        addToast('info', 'Workflow proposal created.')
        return
      }

      const job = await submitJob('ai.chain.run', {
        originId: $selectedWorkflowProfile.id,
        prompt: $selectedWorkflowProfile.prompt,
        providerId: $runSettings.providerId,
        model: $runSettings.model,
        temperature: $runSettings.temperature,
        contextCandidates: includedAiContextCandidates()
      })

      log = [
        ...log,
        `[${new Date().toLocaleTimeString()}] Job queued: ${job?.title ?? 'Workflow prompt'}`
      ]

      addToast('info', 'Workflow job queued')
    } catch (error) {
      addToast('warn', error instanceof Error ? error.message : 'Workflow could not run.')
    } finally {
      running = false
    }
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
      <section class="workflow-empty" aria-label="Selected chain summary">
        <div class="workflow-status-row">
          <span class="format-pill">{$selectedWorkflowProfile.format}</span>
          <span class="status-pill" class:draft={$selectedWorkflowProfile.status === 'draft'}>
            {$selectedWorkflowProfile.status}
          </span>
        </div>
        <h2>{$selectedWorkflowProfile.name}</h2>
        <p>{promptSummary}</p>
        <dl class="workflow-meta">
          <div>
            <dt>Context</dt>
            <dd>{contextSummary}</dd>
          </div>
          <div>
            <dt>Next step</dt>
            <dd>Run this chain to queue the first job.</dd>
          </div>
        </dl>
      </section>
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
  .log-line { color: var(--color-fg-secondary); padding: 2px 0; line-height: 1.6; }
  .workflow-empty {
    max-width: 620px;
    display: grid;
    gap: var(--space-3);
    padding-top: clamp(var(--space-4), 8vh, 72px);
    color: var(--color-fg-secondary);
  }
  .workflow-status-row { display: flex; align-items: center; gap: var(--space-2); }
  .format-pill,
  .status-pill {
    display: inline-flex;
    align-items: center;
    min-height: 22px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 750;
  }
  .format-pill {
    background: var(--color-bg-overlay);
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
  }
  .status-pill {
    background: color-mix(in srgb, var(--color-success) 16%, transparent);
    color: var(--color-success);
    text-transform: uppercase;
  }
  .status-pill.draft {
    background: color-mix(in srgb, var(--color-warn) 18%, transparent);
    color: var(--color-warn);
  }
  .workflow-empty h2 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: var(--font-size-xl);
    font-weight: 700;
  }
  .workflow-empty p {
    max-width: 58ch;
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.6;
  }
  .workflow-meta {
    display: grid;
    gap: var(--space-2);
    margin: var(--space-2) 0 0;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-bg-surface) 72%, transparent);
  }
  .workflow-meta div { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: var(--space-3); }
  .workflow-meta dt {
    color: var(--color-fg-muted);
    font-size: var(--font-size-xs);
    font-weight: 750;
    text-transform: uppercase;
  }
  .workflow-meta dd { margin: 0; color: var(--color-fg-secondary); }
</style>
