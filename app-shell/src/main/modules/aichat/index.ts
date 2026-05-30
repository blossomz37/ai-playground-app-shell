// ──────────────────────────────────────────────
// File:        index.ts
// Description: AI Chat module — chat interface with mock responses
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      carlo
// ──────────────────────────────────────────────

import type { Module, ModuleContext } from '@shared/module-contract'
import type { InvokeAiParams } from '@shared/ai'
import { aiOrchestrator } from '../../ai/orchestrator'

export const aiChatModule: Module = {
  manifest: {
    id: 'shell.aichat',
    name: 'AI Chat',
    version: '0.1.0',
    requiredShellVersion: '^0.1.0',
    activation: [{ on: 'userEnable' }],
    permissions: ['ai.invoke', 'documents.read', 'secrets.read', 'net.fetch'],
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
        { id: 'ai.invoke',     title: 'Invoke AI' },
        { id: 'ai.context.collect', title: 'Collect AI Context' },
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

    ctx.commands.register('ai.invoke', async (payload) => {
      return aiOrchestrator.invoke(payload as InvokeAiParams)
    })

    ctx.commands.register('ai.context.collect', async (payload) => {
      return aiOrchestrator.collectContext({
        workspaceId: ctx.workspace.id,
        ...(typeof payload === 'object' && payload !== null ? payload : {})
      })
    })

    ctx.commands.register('ai.review', async () => {
      await aiOrchestrator.invoke({
        workspaceId: ctx.workspace.id,
        moduleId: ctx.moduleId,
        originType: 'chat',
        originId: 'ai-review',
        prompt: 'Review the currently selected writing context and identify the highest-value revision opportunity.'
      })
      ctx.notify({ level: 'info', message: 'AI review run recorded.' })
    })
  }
}
