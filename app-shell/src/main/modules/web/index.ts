// ──────────────────────────────────────────────
// File:        index.ts
// Description: Web module — embedded browser with tabs, bookmarks, and history
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
        { id: 'web.newTab', title: 'New Web Tab' },
        { id: 'web.closeTab', title: 'Close Web Tab' },
        { id: 'web.navigate', title: 'Navigate to URL' },
        { id: 'web.bookmark', title: 'Bookmark Page' },
        { id: 'web.back', title: 'Go Back' },
        { id: 'web.forward', title: 'Go Forward' },
        { id: 'web.reload', title: 'Reload Page' }
      ]
    }
  },

  async activate(ctx: ModuleContext): Promise<void> {
    ctx.commands.register('web.newTab', async () => {
      ctx.notify({ level: 'info', message: 'Open the Web module to create tabs.' })
    })

    ctx.commands.register('web.closeTab', async () => {
      ctx.notify({ level: 'info', message: 'Open the Web module to close tabs.' })
    })

    ctx.commands.register('web.navigate', async () => {
      ctx.notify({ level: 'info', message: 'Use the Web address bar to navigate.' })
    })

    ctx.commands.register('web.bookmark', async () => {
      ctx.notify({ level: 'info', message: 'Page bookmarked.' })
    })

    ctx.commands.register('web.back', async () => {
      ctx.notify({ level: 'info', message: 'Open the Web module to navigate back.' })
    })

    ctx.commands.register('web.forward', async () => {
      ctx.notify({ level: 'info', message: 'Open the Web module to navigate forward.' })
    })

    ctx.commands.register('web.reload', async () => {
      ctx.notify({ level: 'info', message: 'Open the Web module to reload.' })
    })
  }
}
