// ──────────────────────────────────────────────
// File:        index.ts
// Description: Workflow Runner module — export profiles, job submission
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      carlo
// ──────────────────────────────────────────────

import type { Module, ModuleContext } from '@shared/module-contract'
import type { InvokeAiParams } from '@shared/ai'
import { aiOrchestrator } from '../../ai/orchestrator'

export const workflowModule: Module = {
  manifest: {
    id: 'shell.workflow',
    name: 'Workflow Runner',
    version: '0.1.0',
    requiredShellVersion: '^0.1.0',
    activation: [{ on: 'userEnable' }],
    permissions: ['ai.invoke', 'documents.read', 'fs.write', 'jobs.submit', 'secrets.read', 'net.fetch'],
    contributes: {
      zones: {
        railEntry: { icon: 'zap', label: 'Workflow' },
        navigation: { title: 'Chains' },
        main: { title: 'Runner' },
        inspector: { title: 'Chain Config' }
      },
      commands: [
        { id: 'workflow.run',       title: 'Run Workflow Chain' },
        { id: 'workflow.newProfile', title: 'New Workflow Chain' },
        { id: 'ai.chain.run',       title: 'Run AI Chain' }
      ],
      jobs: [
        { type: 'ai.chain.run',    title: 'Run AI Chain' },
        { type: 'export.markdown', title: 'Export to Markdown' },
        { type: 'export.html',     title: 'Export to HTML' }
      ]
    }
  },

  async activate(ctx: ModuleContext): Promise<void> {
    const runChain = async (payload?: unknown) => {
      const params = typeof payload === 'object' && payload !== null
        ? payload as Partial<InvokeAiParams>
        : {}
      const result = await aiOrchestrator.invoke({
        workspaceId: ctx.workspace.id,
        moduleId: ctx.moduleId,
        originType: 'chain',
        originId: params.originId ?? 'command-chain-run',
        prompt: params.prompt ?? 'Run the active workflow chain against the selected context.',
        variables: params.variables,
        providerId: params.providerId,
        model: params.model,
        temperature: params.temperature,
        contextCandidates: params.contextCandidates
      })
      if (result.run.status === 'failed') {
        throw new Error(result.run.error ?? 'Workflow chain failed.')
      }
      ctx.notify({ level: 'info', message: 'Workflow chain run recorded.' })
      return result
    }

    ctx.commands.register('workflow.run', runChain)

    ctx.commands.register('ai.chain.run', runChain)

    ctx.jobs.defineRunner('ai.chain.run', async (payload, handle) => {
      handle.progress(10, 'Packing context')
      await new Promise(resolve => setTimeout(resolve, 300))
      if (handle.cancelled) return
      handle.progress(35, 'Running prompt chain')
      const result = await runChain(payload)
      if (handle.cancelled) return
      handle.progress(80, 'Saving run history')
      await new Promise(resolve => setTimeout(resolve, 300))
      handle.progress(100, `Completed ${result.run.id}`)
    })

    ctx.commands.register('workflow.newProfile', async () => {
      ctx.notify({ level: 'info', message: 'New workflow chain — coming soon.' })
    })
  }
}
