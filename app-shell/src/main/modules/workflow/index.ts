// ──────────────────────────────────────────────
// File:        index.ts
// Description: Workflow Runner module — export profiles, job submission
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      carlo
// ──────────────────────────────────────────────

import type { Module, ModuleContext } from '@shared/module-contract'

export const workflowModule: Module = {
  manifest: {
    id: 'shell.workflow',
    name: 'Workflow Runner',
    version: '0.1.0',
    requiredShellVersion: '^0.1.0',
    activation: [{ on: 'userEnable' }],
    permissions: ['documents.read', 'fs.write', 'jobs.submit'],
    contributes: {
      zones: {
        railEntry: { icon: 'zap', label: 'Export' },
        navigation: { title: 'Profiles' },
        main: { title: 'Runner' },
        inspector: { title: 'Profile Config' }
      },
      commands: [
        { id: 'workflow.run',       title: 'Run Export' },
        { id: 'workflow.newProfile', title: 'New Export Profile' }
      ],
      jobs: [
        { type: 'export.markdown', title: 'Export to Markdown' },
        { type: 'export.html',     title: 'Export to HTML' }
      ]
    }
  },

  async activate(ctx: ModuleContext): Promise<void> {
    ctx.commands.register('workflow.run', async () => {
      ctx.notify({ level: 'info', message: 'Export workflow started.' })
    })

    ctx.commands.register('workflow.newProfile', async () => {
      ctx.notify({ level: 'info', message: 'New export profile — coming soon.' })
    })
  }
}
