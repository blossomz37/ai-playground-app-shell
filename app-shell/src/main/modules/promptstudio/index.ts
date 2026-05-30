// ──────────────────────────────────────────────
// File:        index.ts
// Description: Prompt Studio module — template engineering workbench
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      carlo
// ──────────────────────────────────────────────

import type { Module, ModuleContext } from '@shared/module-contract'
import type { InvokeAiParams } from '@shared/ai'
import { aiOrchestrator } from '../../ai/orchestrator'

export const promptStudioModule: Module = {
  manifest: {
    id: 'shell.promptstudio',
    name: 'Prompt Studio',
    version: '0.1.0',
    requiredShellVersion: '^0.1.0',
    activation: [{ on: 'userEnable' }],
    permissions: ['ai.invoke', 'documents.read', 'documents.write', 'secrets.read', 'net.fetch'],
    contributes: {
      zones: {
        railEntry: { icon: 'terminal', label: 'Prompts' },
        navigation: { title: 'Templates' },
        main: { title: 'Prompt Editor' },
        inspector: { title: 'Run Settings' }
      },
      commands: [
        { id: 'promptstudio.new',    title: 'New Prompt Template' },
        { id: 'promptstudio.run',    title: 'Run Template' },
        { id: 'promptstudio.batch',  title: 'Batch Run Templates' },
        { id: 'ai.template.run',     title: 'Run AI Template' }
      ]
    }
  },

  async activate(ctx: ModuleContext): Promise<void> {
    ctx.commands.register('promptstudio.new', async () => {
      ctx.notify({ level: 'info', message: 'New prompt template created.' })
    })

    const runTemplate = async (payload?: unknown) => {
      const params = typeof payload === 'object' && payload !== null
        ? payload as Partial<InvokeAiParams>
        : {}
      const result = await aiOrchestrator.invoke({
        workspaceId: ctx.workspace.id,
        moduleId: ctx.moduleId,
        originType: 'template',
        originId: params.originId ?? 'command-template-run',
        prompt: params.prompt ?? 'Run the active prompt template against the selected context.',
        variables: params.variables,
        contextCandidates: params.contextCandidates
      })
      ctx.notify({ level: 'info', message: 'Prompt template run recorded.' })
      return result
    }

    ctx.commands.register('promptstudio.run', runTemplate)

    ctx.commands.register('ai.template.run', runTemplate)

    ctx.commands.register('promptstudio.batch', async () => {
      ctx.notify({ level: 'info', message: 'Batch run will use the shared AI job pipeline in the next pass.' })
    })
  }
}
