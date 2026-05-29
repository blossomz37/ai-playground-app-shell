// ──────────────────────────────────────────────
// File:        index.ts
// Description: Web module — embedded browser with bookmarks
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      carlo
// ──────────────────────────────────────────────

import type { Module, ModuleContext } from '@shared/module-contract'

export const webModule: Module = {
  manifest: {
    id: 'shell.web',
    name: 'Web',
    version: '0.1.0',
    requiredShellVersion: '^0.1.0',
    activation: [{ on: 'userEnable' }],
    permissions: ['net.fetch'],
    contributes: {
      zones: {
        railEntry: { icon: 'globe', label: 'Web' },
        navigation: { title: 'Bookmarks' },
        main: { title: 'Browser' },
        inspector: { title: 'Page Info' }
      },
      commands: [
        { id: 'web.navigate', title: 'Navigate to URL' },
        { id: 'web.bookmark', title: 'Bookmark Page' },
        { id: 'web.back',     title: 'Go Back' }
      ]
    }
  },

  async activate(ctx: ModuleContext): Promise<void> {
    ctx.commands.register('web.navigate', async () => {
      ctx.notify({ level: 'info', message: 'Web navigation — coming soon.' })
    })

    ctx.commands.register('web.bookmark', async () => {
      ctx.notify({ level: 'info', message: 'Page bookmarked.' })
    })

    ctx.commands.register('web.back', async () => {
      ctx.notify({ level: 'info', message: 'Navigating back.' })
    })
  }
}
