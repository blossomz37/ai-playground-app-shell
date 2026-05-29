// ──────────────────────────────────────────────
// File:        index.ts
// Description: Journal module — daily entries, today view, tasks
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      carlo
// ──────────────────────────────────────────────

import type { Module, ModuleContext } from '@shared/module-contract'

export const journalModule: Module = {
  manifest: {
    id: 'shell.journal',
    name: 'Journal',
    version: '0.1.0',
    requiredShellVersion: '^0.1.0',
    activation: [{ on: 'userEnable' }],
    permissions: ['documents.read', 'documents.write'],
    contributes: {
      zones: {
        railEntry: { icon: 'journal', label: 'Journal' },
        navigation: { title: 'Entries' },
        main: { title: 'Entry' },
        inspector: { title: 'Entry Details' }
      },
      commands: [
        { id: 'journal.newEntry', title: 'New Journal Entry' },
        { id: 'journal.today',   title: 'Go to Today' }
      ],
      documentTypes: [
        { kind: 'journal-entry', label: 'Journal Entry', icon: 'edit' }
      ]
    }
  },

  async activate(ctx: ModuleContext): Promise<void> {
    ctx.commands.register('journal.newEntry', async () => {
      ctx.notify({ level: 'info', message: 'New journal entry created.' })
    })

    ctx.commands.register('journal.today', async () => {
      ctx.notify({ level: 'info', message: 'Navigated to today.' })
    })
  }
}
