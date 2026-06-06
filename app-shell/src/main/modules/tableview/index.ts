// ──────────────────────────────────────────────
// File:        index.ts
// Description: Table View module — tabular view over documents
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      carlo
// ──────────────────────────────────────────────

import type { Module, ModuleContext } from '@shared/module-contract'

export const tableViewModule: Module = {
  manifest: {
    id: 'shell.tableview',
    name: 'Table View',
    version: '0.1.0',
    requiredShellVersion: '^0.1.0',
    activation: [{ on: 'userEnable' }],
    permissions: ['documents.read'],
    contributes: {
      zones: {
        railEntry: { icon: 'table', label: 'Table' },
        main: { title: 'Data Table' },
        inspector: { title: 'Row Detail' }
      },
      commands: [
        { id: 'tableview.refresh', title: 'Refresh Table View' },
        { id: 'tableview.export',  title: 'Export Table as CSV' }
      ]
    }
  },

  async activate(ctx: ModuleContext): Promise<void> {
    ctx.commands.register('tableview.refresh', async () => {
      ctx.notify({ level: 'info', message: 'Table view refreshed.' })
    })

    ctx.commands.register('tableview.export', async () => {
      ctx.notify({ level: 'info', message: 'CSV export — coming soon.' })
    })
  }
}
