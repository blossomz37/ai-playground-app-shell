// ──────────────────────────────────────────────
// File:        index.ts
// Description: AI Chat module — chat interface with mock responses
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      carlo
// ──────────────────────────────────────────────

import type { Module, ModuleContext } from '@shared/module-contract'

export const aiChatModule: Module = {
  manifest: {
    id: 'shell.aichat',
    name: 'AI Chat',
    version: '0.1.0',
    requiredShellVersion: '^0.1.0',
    activation: [{ on: 'userEnable' }],
    permissions: ['ai.invoke', 'documents.read'],
    contributes: {
      zones: {
        railEntry: { icon: 'bot', label: 'AI' },
        navigation: { title: 'Conversations' },
        main: { title: 'Chat' },
        inspector: { title: 'Context' }
      },
      commands: [
        { id: 'aichat.new',    title: 'New AI Conversation' },
        { id: 'aichat.clear',  title: 'Clear Chat' },
        { id: 'ai.review',     title: 'Run AI Review' }
      ]
    }
  },

  async activate(ctx: ModuleContext): Promise<void> {
    ctx.commands.register('aichat.new', async () => {
      ctx.notify({ level: 'info', message: 'New AI conversation started.' })
    })

    ctx.commands.register('aichat.clear', async () => {
      ctx.notify({ level: 'info', message: 'Chat cleared.' })
    })

    ctx.commands.register('ai.review', async () => {
      ctx.notify({ level: 'info', message: 'AI review — model integration coming soon.' })
    })
  }
}
