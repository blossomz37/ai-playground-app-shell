// ──────────────────────────────────────────────
// File:        index.ts
// Description: Assets module — image/file gallery with metadata
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      carlo
// ──────────────────────────────────────────────

import type { Module, ModuleContext } from '@shared/module-contract'

export const assetsModule: Module = {
  manifest: {
    id: 'shell.assets',
    name: 'Assets',
    version: '0.1.0',
    requiredShellVersion: '^0.1.0',
    activation: [{ on: 'userEnable' }],
    permissions: ['fs.read', 'fs.write'],
    contributes: {
      zones: {
        railEntry: { icon: 'image', label: 'Assets' },
        navigation: { title: 'Library' },
        main: { title: 'Asset Viewer' },
        inspector: { title: 'Asset Info' }
      },
      commands: [
        { id: 'assets.import', title: 'Import Asset' },
        { id: 'assets.search', title: 'Search Assets' }
      ]
    }
  },

  async activate(ctx: ModuleContext): Promise<void> {
    ctx.commands.register('assets.import', async () => {
      ctx.notify({ level: 'info', message: 'Asset import — coming soon.' })
    })

    ctx.commands.register('assets.search', async () => {
      ctx.notify({ level: 'info', message: 'Asset search — coming soon.' })
    })
  }
}
