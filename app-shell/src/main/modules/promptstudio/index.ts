// ──────────────────────────────────────────────
// File:        index.ts
// Description: Prompt Studio module — template engineering workbench
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      carlo
// ──────────────────────────────────────────────

import type { Module, ModuleContext } from '@shared/module-contract'

export const promptStudioModule: Module = {
  manifest: {
    id: 'shell.promptstudio',
    name: 'Prompt Studio',
    version: '0.1.0',
    requiredShellVersion: '^0.1.0',
    activation: [{ on: 'userEnable' }],
    permissions: ['ai.invoke', 'documents.read', 'documents.write'],
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
        { id: 'promptstudio.batch',  title: 'Batch Run Templates' }
      ]
    }
  },

  async activate(ctx: ModuleContext): Promise<void> {
    ctx.commands.register('promptstudio.new', async () => {
      ctx.notify({ level: 'info', message: 'New prompt template created.' })
    })

    ctx.commands.register('promptstudio.run', async () => {
      ctx.notify({ level: 'info', message: 'Running prompt template... (Mock)' })
    })

    ctx.commands.register('promptstudio.batch', async () => {
      ctx.notify({ level: 'info', message: 'Batch run feature coming soon.' })
    })
  }
}
