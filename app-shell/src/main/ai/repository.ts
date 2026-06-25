import { randomUUID } from 'crypto'
import type {
  AiContextCandidate,
  AiContextPack,
  AiChatMessage,
  AiConversation,
  AiProvider,
  AiPromptTemplate,
  AiPromptTemplateLifecycleParams,
  AiRun,
  AiRunStatus,
  AppendAiMessageParams,
  AiConversationLifecycleParams,
  AiProposal,
  CreateAiConversationParams,
  InvokeAiParams,
  ListAiProposalsParams,
  ListAiRunsParams,
  RenameAiConversationParams,
  RenameAiPromptTemplateParams,
  ResolveAiProposalParams
} from '@shared/ai'
import {
  DOCUMENTS_AI_PROMPT_DEFINITIONS,
  MOP_PROMPT_DEFINITIONS,
  createDocumentsAiPromptTemplate,
  createMopPromptTemplate
} from '@shared/ai-writing-prompts'
import { getDb } from '../core/db'
import { DEMO_MODE_SETTING_KEY, isDemoModeEnabled } from '@shared/demo-mode'

function demoModeEnabled(): boolean {
  const row = getDb()
    .prepare('SELECT value FROM shell_settings WHERE key = ?')
    .get(`shell.${DEMO_MODE_SETTING_KEY}`) as { value: string } | undefined
  if (!row) return false

  try {
    return isDemoModeEnabled(JSON.parse(row.value))
  } catch {
    return false
  }
}

function preferredProviderId(): string {
  return demoModeEnabled() ? 'mock-local' : 'openai-responses'
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function runFromRow(row: Record<string, unknown>): AiRun {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    moduleId: String(row.moduleId),
    originType: row.originType as AiRun['originType'],
    originId: String(row.originId),
    providerId: String(row.providerId),
    model: String(row.model),
    temperature: Number(row.temperature),
    status: row.status as AiRunStatus,
    inputSummary: String(row.inputSummary),
    outputText: String(row.outputText ?? ''),
    error: row.error === null ? null : String(row.error),
    createdAt: String(row.createdAt),
    completedAt: row.completedAt === null ? null : String(row.completedAt)
  }
}

function templateFromRow(row: Record<string, unknown>): AiPromptTemplate {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    name: String(row.name),
    description: String(row.description ?? ''),
    body: String(row.body),
    variables: parseJson(String(row.variablesJson), []),
    defaultModel: String(row.defaultModel),
    defaultTemperature: Number(row.defaultTemperature),
    contextPolicy: parseJson(String(row.contextPolicyJson), {}),
    tags: parseJson(String(row.tagsJson), []),
    isProtected: Number(row.isProtected ?? 0) === 1,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    archivedAt: row.archivedAt == null ? null : String(row.archivedAt)
  }
}

function proposalFromRow(row: Record<string, unknown>): AiProposal {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    runId: String(row.runId),
    targetDocumentId: String(row.targetDocumentId),
    proposalType: row.proposalType as AiProposal['proposalType'],
    sourceText: String(row.sourceText),
    proposedText: String(row.proposedText),
    status: row.status as AiProposal['status'],
    createdAt: String(row.createdAt),
    resolvedAt: row.resolvedAt === null ? null : String(row.resolvedAt)
  }
}

function providerFromRow(row: Record<string, unknown>): AiProvider {
  return {
    providerId: String(row.id),
    providerName: String(row.name),
    secretName: row.secretName === null ? null : String(row.secretName),
    baseUrl: row.baseUrl === null ? null : String(row.baseUrl),
    defaultModel: String(row.defaultModel),
    availableModels: parseJson(String(row.availableModelsJson), []),
    supportsStreaming: Number(row.supportsStreaming) === 1,
    supportsTools: Number(row.supportsTools) === 1
  }
}

function messageFromRow(row: Record<string, unknown>): AiChatMessage {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    conversationId: String(row.conversationId),
    role: row.role as AiChatMessage['role'],
    content: String(row.content),
    runId: row.runId === null ? null : String(row.runId),
    createdAt: String(row.createdAt)
  }
}

function conversationFromRow(row: Record<string, unknown>, messages: AiChatMessage[]): AiConversation {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    title: String(row.title),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    archivedAt: row.archivedAt == null ? null : String(row.archivedAt),
    messages
  }
}

function titleFromMessage(content: string): string {
  const title = content.trim().replace(/\s+/g, ' ').slice(0, 48)
  return title || 'New conversation'
}

export const aiRepository = {
  ensureDefaults(workspaceId: string): void {
    const db = getDb()
    const now = new Date().toISOString()
    const demoMode = demoModeEnabled()

    const upsertProvider = db.prepare(`
      INSERT INTO ai_providers
        (id, workspaceId, name, secretName, baseUrl, defaultModel, availableModelsJson, supportsStreaming, supportsTools, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        workspaceId = excluded.workspaceId,
        name = excluded.name,
        secretName = excluded.secretName,
        baseUrl = excluded.baseUrl,
        defaultModel = excluded.defaultModel,
        availableModelsJson = excluded.availableModelsJson,
        supportsStreaming = excluded.supportsStreaming,
        supportsTools = excluded.supportsTools,
        updatedAt = excluded.updatedAt
    `)

    if (demoMode) {
      upsertProvider.run(
        'mock-local',
        workspaceId,
        'Mock Local Provider',
        null,
        null,
        'mock-durable-context-v1',
        JSON.stringify(['mock-durable-context-v1']),
        0,
        0,
        now,
        now
      )
    } else {
      db.prepare('DELETE FROM ai_providers WHERE workspaceId = ? AND id = ?')
        .run(workspaceId, 'mock-local')
    }

    upsertProvider.run(
      'openai-responses',
      workspaceId,
      'OpenAI Responses API',
      'OPENAI_API_KEY',
      'https://api.openai.com/v1/responses',
      'gpt-4.1-mini',
      JSON.stringify([
        'gpt-5.2',
        'gpt-5-mini',
        'gpt-5-nano',
        'gpt-4.1',
        'gpt-4.1-mini',
        'gpt-4.1-nano'
      ]),
      0,
      0,
      now,
      now
    )

    const templateCount = db
      .prepare('SELECT COUNT(*) as n FROM ai_prompt_templates WHERE workspaceId = ?')
      .get(workspaceId) as { n: number }

    if (demoMode && templateCount.n === 0) {
      this.saveTemplate({
        id: randomUUID(),
        workspaceId,
        name: 'Summarize Document',
        description: 'Produce a concise summary using selected manuscript context.',
        body: 'Summarize the included context in 3 useful bullet points.\n\n{{text}}',
        variables: ['text'],
        defaultModel: 'mock-durable-context-v1',
        defaultTemperature: 0.7,
        contextPolicy: { includeActiveDocument: true },
        tags: ['starter', 'summary'],
        isProtected: false,
        createdAt: now,
        updatedAt: now,
        archivedAt: null
      })
    }

    for (const definition of DOCUMENTS_AI_PROMPT_DEFINITIONS) {
      const template = createDocumentsAiPromptTemplate({
        workspaceId,
        action: definition.action,
        now,
        defaultModel: demoMode ? 'mock-durable-context-v1' : 'gpt-4.1-mini'
      })
      this.ensureProtectedTemplate(template)
    }

    this.ensureMopTemplates(workspaceId, now, demoMode ? 'mock-durable-context-v1' : 'gpt-4.1-mini')
  },

  ensureMopTemplates(workspaceId: string, now: string, defaultModel: string): void {
    const db = getDb()
    const seedKey = `ai.mopTemplatesSeeded.${workspaceId}`
    const seeded = db
      .prepare('SELECT value FROM shell_settings WHERE key = ?')
      .get(seedKey) as { value: string } | undefined
    if (seeded) return

    const insert = db.prepare(`
      INSERT OR IGNORE INTO ai_prompt_templates
        (id, workspaceId, name, description, body, variablesJson, defaultModel, defaultTemperature, contextPolicyJson, tagsJson, isProtected, createdAt, updatedAt, archivedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const definition of MOP_PROMPT_DEFINITIONS) {
      const template = createMopPromptTemplate({ workspaceId, definition, now, defaultModel })
      insert.run(
        template.id,
        template.workspaceId,
        template.name,
        template.description,
        template.body,
        JSON.stringify(template.variables),
        template.defaultModel,
        template.defaultTemperature,
        JSON.stringify(template.contextPolicy),
        JSON.stringify(template.tags),
        0,
        template.createdAt,
        template.updatedAt,
        template.archivedAt
      )
    }

    db.prepare('INSERT OR REPLACE INTO shell_settings (key, value) VALUES (?, ?)')
      .run(seedKey, JSON.stringify({ seededAt: now }))
  },

  ensureProtectedTemplate(template: AiPromptTemplate): void {
    const db = getDb()
    db.prepare(`
      INSERT INTO ai_prompt_templates
        (id, workspaceId, name, description, body, variablesJson, defaultModel, defaultTemperature, contextPolicyJson, tagsJson, isProtected, createdAt, updatedAt, archivedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        isProtected = 1,
        archivedAt = NULL
    `).run(
      template.id,
      template.workspaceId,
      template.name,
      template.description,
      template.body,
      JSON.stringify(template.variables),
      template.defaultModel,
      template.defaultTemperature,
      JSON.stringify(template.contextPolicy),
      JSON.stringify(template.tags),
      1,
      template.createdAt,
      template.updatedAt,
      null
    )
  },

  listProviders(workspaceId: string): AiProvider[] {
    this.ensureDefaults(workspaceId)
    const preferred = preferredProviderId()
    return getDb()
      .prepare('SELECT * FROM ai_providers WHERE workspaceId = ? ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, name ASC')
      .all(workspaceId, preferred)
      .map(row => providerFromRow(row as Record<string, unknown>))
  },

  getProvider(workspaceId: string, providerId: string): AiProvider | undefined {
    if (providerId === 'mock-local' && !demoModeEnabled()) return undefined
    this.ensureDefaults(workspaceId)
    const row = getDb()
      .prepare('SELECT * FROM ai_providers WHERE workspaceId = ? AND id = ?')
      .get(workspaceId, providerId) as Record<string, unknown> | undefined

    return row ? providerFromRow(row) : undefined
  },

  listConversations(workspaceId: string): AiConversation[] {
    const db = getDb()
    const rows = db
      .prepare('SELECT * FROM ai_conversations WHERE workspaceId = ? AND archivedAt IS NULL ORDER BY updatedAt DESC')
      .all(workspaceId) as Array<Record<string, unknown>>

    const messageRows = db
      .prepare('SELECT * FROM ai_messages WHERE workspaceId = ? ORDER BY createdAt ASC')
      .all(workspaceId) as Array<Record<string, unknown>>

    const messagesByConversation = new Map<string, AiChatMessage[]>()
    for (const row of messageRows) {
      const message = messageFromRow(row)
      const messages = messagesByConversation.get(message.conversationId) ?? []
      messages.push(message)
      messagesByConversation.set(message.conversationId, messages)
    }

    return rows.map(row => conversationFromRow(row, messagesByConversation.get(String(row.id)) ?? []))
  },

  createConversation(params: CreateAiConversationParams): AiConversation {
    const db = getDb()
    const now = new Date().toISOString()
    const conversation: AiConversation = {
      id: randomUUID(),
      workspaceId: params.workspaceId,
      title: params.title ?? 'New conversation',
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      messages: []
    }

    db.prepare(`
      INSERT INTO ai_conversations (id, workspaceId, title, createdAt, updatedAt, archivedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      conversation.id,
      conversation.workspaceId,
      conversation.title,
      conversation.createdAt,
      conversation.updatedAt,
      conversation.archivedAt
    )

    return conversation
  },

  renameConversation(params: RenameAiConversationParams): AiConversation {
    const title = params.title.trim()
    if (!title) throw new Error('Conversation title cannot be blank.')

    const db = getDb()
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE ai_conversations
      SET title = ?, updatedAt = ?
      WHERE id = ? AND workspaceId = ?
    `).run(title, now, params.id, params.workspaceId)

    const row = db
      .prepare('SELECT * FROM ai_conversations WHERE id = ? AND workspaceId = ?')
      .get(params.id, params.workspaceId) as Record<string, unknown> | undefined
    if (!row) throw new Error('Conversation not found.')

    const messages = db
      .prepare('SELECT * FROM ai_messages WHERE workspaceId = ? AND conversationId = ? ORDER BY createdAt ASC')
      .all(params.workspaceId, params.id)
      .map(messageRow => messageFromRow(messageRow as Record<string, unknown>))

    return conversationFromRow(row, messages)
  },

  listArchivedConversations(workspaceId: string): AiConversation[] {
    const db = getDb()
    const rows = db
      .prepare('SELECT * FROM ai_conversations WHERE workspaceId = ? AND archivedAt IS NOT NULL ORDER BY archivedAt DESC, updatedAt DESC')
      .all(workspaceId) as Array<Record<string, unknown>>

    const messageRows = db
      .prepare(`
        SELECT ai_messages.*
        FROM ai_messages
        JOIN ai_conversations ON ai_conversations.id = ai_messages.conversationId
        WHERE ai_conversations.workspaceId = ? AND ai_conversations.archivedAt IS NOT NULL
        ORDER BY ai_messages.createdAt ASC
      `)
      .all(workspaceId) as Array<Record<string, unknown>>

    const messagesByConversation = new Map<string, AiChatMessage[]>()
    for (const row of messageRows) {
      const message = messageFromRow(row)
      const messages = messagesByConversation.get(message.conversationId) ?? []
      messages.push(message)
      messagesByConversation.set(message.conversationId, messages)
    }

    return rows.map(row => conversationFromRow(row, messagesByConversation.get(String(row.id)) ?? []))
  },

  archiveConversation(params: AiConversationLifecycleParams): AiConversation {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE ai_conversations
      SET archivedAt = ?, updatedAt = ?
      WHERE id = ? AND workspaceId = ?
    `).run(now, now, params.id, params.workspaceId)

    return this.requireConversation(params)
  },

  restoreConversation(params: AiConversationLifecycleParams): AiConversation {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE ai_conversations
      SET archivedAt = NULL, updatedAt = ?
      WHERE id = ? AND workspaceId = ?
    `).run(now, params.id, params.workspaceId)

    return this.requireConversation(params)
  },

  deleteConversation(params: AiConversationLifecycleParams): { id: string } {
    const db = getDb()
    const existing = db
      .prepare('SELECT id FROM ai_conversations WHERE id = ? AND workspaceId = ?')
      .get(params.id, params.workspaceId) as Record<string, unknown> | undefined
    if (!existing) throw new Error('Conversation not found.')

    db.transaction(() => {
      db.prepare('DELETE FROM ai_messages WHERE workspaceId = ? AND conversationId = ?').run(params.workspaceId, params.id)
      db.prepare('DELETE FROM ai_conversations WHERE id = ? AND workspaceId = ?').run(params.id, params.workspaceId)
    })()

    return { id: params.id }
  },

  requireConversation(params: AiConversationLifecycleParams): AiConversation {
    const db = getDb()
    const row = db
      .prepare('SELECT * FROM ai_conversations WHERE id = ? AND workspaceId = ?')
      .get(params.id, params.workspaceId) as Record<string, unknown> | undefined
    if (!row) throw new Error('Conversation not found.')

    const messages = db
      .prepare('SELECT * FROM ai_messages WHERE workspaceId = ? AND conversationId = ? ORDER BY createdAt ASC')
      .all(params.workspaceId, params.id)
      .map(messageRow => messageFromRow(messageRow as Record<string, unknown>))

    return conversationFromRow(row, messages)
  },

  appendMessage(params: AppendAiMessageParams): AiChatMessage {
    const db = getDb()
    const now = new Date().toISOString()
    const message: AiChatMessage = {
      id: randomUUID(),
      workspaceId: params.workspaceId,
      conversationId: params.conversationId,
      role: params.role,
      content: params.content,
      runId: params.runId ?? null,
      createdAt: now
    }

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO ai_messages (id, workspaceId, conversationId, role, content, runId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        message.id,
        message.workspaceId,
        message.conversationId,
        message.role,
        message.content,
        message.runId,
        message.createdAt
      )

      const conversation = db
        .prepare('SELECT title FROM ai_conversations WHERE id = ? AND workspaceId = ?')
        .get(params.conversationId, params.workspaceId) as { title: string } | undefined

      const shouldRetitle = params.role === 'user' && conversation?.title === 'New conversation'
      db.prepare(`
        UPDATE ai_conversations
        SET title = CASE WHEN ? THEN ? ELSE title END, updatedAt = ?
        WHERE id = ? AND workspaceId = ?
      `).run(
        shouldRetitle ? 1 : 0,
        titleFromMessage(params.content),
        now,
        params.conversationId,
        params.workspaceId
      )
    })

    tx()
    return message
  },

  createRun(params: InvokeAiParams): AiRun {
    const db = getDb()
    const now = new Date().toISOString()
    const run: AiRun = {
      id: randomUUID(),
      workspaceId: params.workspaceId,
      moduleId: params.moduleId,
      originType: params.originType,
      originId: params.originId ?? randomUUID(),
      providerId: params.providerId ?? preferredProviderId(),
      model: params.model ?? (demoModeEnabled() ? 'mock-durable-context-v1' : 'gpt-4.1-mini'),
      temperature: params.temperature ?? 0.7,
      status: 'running',
      inputSummary: params.prompt.trim().slice(0, 240),
      outputText: '',
      error: null,
      createdAt: now,
      completedAt: null
    }

    db.prepare(`
      INSERT INTO ai_runs
        (id, workspaceId, moduleId, originType, originId, providerId, model, temperature, status, inputSummary, outputText, error, createdAt, completedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      run.id,
      run.workspaceId,
      run.moduleId,
      run.originType,
      run.originId,
      run.providerId,
      run.model,
      run.temperature,
      run.status,
      run.inputSummary,
      run.outputText,
      run.error,
      run.createdAt,
      run.completedAt
    )

    return run
  },

  completeRun(id: string, outputText: string): AiRun {
    const db = getDb()
    const completedAt = new Date().toISOString()
    db.prepare(`
      UPDATE ai_runs
      SET status = 'completed', outputText = ?, error = NULL, completedAt = ?
      WHERE id = ?
    `).run(outputText, completedAt, id)

    return runFromRow(db.prepare('SELECT * FROM ai_runs WHERE id = ?').get(id) as Record<string, unknown>)
  },

  failRun(id: string, error: string): AiRun {
    const db = getDb()
    const completedAt = new Date().toISOString()
    db.prepare(`
      UPDATE ai_runs
      SET status = 'failed', error = ?, completedAt = ?
      WHERE id = ?
    `).run(error, completedAt, id)

    return runFromRow(db.prepare('SELECT * FROM ai_runs WHERE id = ?').get(id) as Record<string, unknown>)
  },

  createContextPack(params: {
    workspaceId: string
    runId: string
    candidates: AiContextCandidate[]
    renderedText: string
    tokenEstimate: number
    packingStrategy: string
  }): AiContextPack {
    const db = getDb()
    const pack: AiContextPack = {
      id: randomUUID(),
      workspaceId: params.workspaceId,
      runId: params.runId,
      createdAt: new Date().toISOString(),
      candidates: params.candidates,
      renderedText: params.renderedText,
      tokenEstimate: params.tokenEstimate,
      packingStrategy: params.packingStrategy
    }

    db.prepare(`
      INSERT INTO ai_context_packs
        (id, workspaceId, runId, createdAt, candidatesJson, renderedText, tokenEstimate, packingStrategy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pack.id,
      pack.workspaceId,
      pack.runId,
      pack.createdAt,
      JSON.stringify(pack.candidates),
      pack.renderedText,
      pack.tokenEstimate,
      pack.packingStrategy
    )

    return pack
  },

  createProposal(params: {
    workspaceId: string
    runId: string
    targetDocumentId: string
    proposalType: AiProposal['proposalType']
    sourceText: string
    proposedText: string
  }): AiProposal {
    const db = getDb()
    const now = new Date().toISOString()
    const proposal: AiProposal = {
      id: randomUUID(),
      workspaceId: params.workspaceId,
      runId: params.runId,
      targetDocumentId: params.targetDocumentId,
      proposalType: params.proposalType,
      sourceText: params.sourceText,
      proposedText: params.proposedText,
      status: 'pending',
      createdAt: now,
      resolvedAt: null
    }

    db.prepare(`
      INSERT INTO ai_proposals
        (id, workspaceId, runId, targetDocumentId, proposalType, sourceText, proposedText, status, createdAt, resolvedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      proposal.id,
      proposal.workspaceId,
      proposal.runId,
      proposal.targetDocumentId,
      proposal.proposalType,
      proposal.sourceText,
      proposal.proposedText,
      proposal.status,
      proposal.createdAt,
      proposal.resolvedAt
    )

    return proposal
  },

  listProposals(params: ListAiProposalsParams): AiProposal[] {
    const clauses = ['workspaceId = ?']
    const values: unknown[] = [params.workspaceId]

    if (params.targetDocumentId) {
      clauses.push('targetDocumentId = ?')
      values.push(params.targetDocumentId)
    }
    if (params.status) {
      clauses.push('status = ?')
      values.push(params.status)
    }

    return getDb()
      .prepare(`SELECT * FROM ai_proposals WHERE ${clauses.join(' AND ')} ORDER BY createdAt DESC`)
      .all(...values)
      .map(row => proposalFromRow(row as Record<string, unknown>))
  },

  rejectProposal(params: ResolveAiProposalParams): AiProposal {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE ai_proposals
      SET status = 'rejected', resolvedAt = ?
      WHERE id = ? AND workspaceId = ? AND status = 'pending'
    `).run(now, params.id, params.workspaceId)

    const row = db
      .prepare('SELECT * FROM ai_proposals WHERE id = ? AND workspaceId = ?')
      .get(params.id, params.workspaceId) as Record<string, unknown> | undefined
    if (!row) throw new Error('AI proposal not found.')
    return proposalFromRow(row)
  },

  listRuns(params: ListAiRunsParams): AiRun[] {
    const clauses = ['workspaceId = ?']
    const values: unknown[] = [params.workspaceId]

    if (params.moduleId) {
      clauses.push('moduleId = ?')
      values.push(params.moduleId)
    }

    if (params.originType) {
      clauses.push('originType = ?')
      values.push(params.originType)
    }

    values.push(params.limit ?? 20)

    return getDb()
      .prepare(`SELECT * FROM ai_runs WHERE ${clauses.join(' AND ')} ORDER BY createdAt DESC LIMIT ?`)
      .all(...values)
      .map(row => runFromRow(row as Record<string, unknown>))
  },

  listTemplates(workspaceId: string): AiPromptTemplate[] {
    this.ensureDefaults(workspaceId)
    return getDb()
      .prepare(`
        SELECT * FROM ai_prompt_templates
        WHERE workspaceId = ? AND archivedAt IS NULL
        ORDER BY isProtected DESC, updatedAt DESC
      `)
      .all(workspaceId)
      .map(row => templateFromRow(row as Record<string, unknown>))
  },

  listArchivedTemplates(workspaceId: string): AiPromptTemplate[] {
    this.ensureDefaults(workspaceId)
    return getDb()
      .prepare(`
        SELECT * FROM ai_prompt_templates
        WHERE workspaceId = ? AND archivedAt IS NOT NULL
        ORDER BY archivedAt DESC, updatedAt DESC
      `)
      .all(workspaceId)
      .map(row => templateFromRow(row as Record<string, unknown>))
  },

  saveTemplate(template: AiPromptTemplate): AiPromptTemplate {
    const db = getDb()
    const now = new Date().toISOString()
    const createdAt = template.createdAt || now
    const updatedAt = now

    db.prepare(`
      INSERT INTO ai_prompt_templates
        (id, workspaceId, name, description, body, variablesJson, defaultModel, defaultTemperature, contextPolicyJson, tagsJson, isProtected, createdAt, updatedAt, archivedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        body = excluded.body,
        variablesJson = excluded.variablesJson,
        defaultModel = excluded.defaultModel,
        defaultTemperature = excluded.defaultTemperature,
        contextPolicyJson = excluded.contextPolicyJson,
        tagsJson = excluded.tagsJson,
        isProtected = CASE WHEN ai_prompt_templates.isProtected = 1 THEN 1 ELSE excluded.isProtected END,
        archivedAt = excluded.archivedAt,
        updatedAt = excluded.updatedAt
    `).run(
      template.id,
      template.workspaceId,
      template.name,
      template.description,
      template.body,
      JSON.stringify(template.variables),
      template.defaultModel,
      template.defaultTemperature,
      JSON.stringify(template.contextPolicy),
      JSON.stringify(template.tags),
      template.isProtected ? 1 : 0,
      createdAt,
      updatedAt,
      template.archivedAt
    )

    return {
      ...template,
      createdAt,
      updatedAt,
      archivedAt: template.archivedAt ?? null
    }
  },

  renameTemplate(params: RenameAiPromptTemplateParams): AiPromptTemplate {
    const name = params.name.trim()
    if (!name) throw new Error('Template name cannot be blank.')

    const db = getDb()
    const updatedAt = new Date().toISOString()
    db.prepare(`
      UPDATE ai_prompt_templates
      SET name = ?, updatedAt = ?
      WHERE id = ? AND workspaceId = ?
    `).run(name, updatedAt, params.id, params.workspaceId)

    const row = db
      .prepare('SELECT * FROM ai_prompt_templates WHERE id = ? AND workspaceId = ?')
      .get(params.id, params.workspaceId) as Record<string, unknown> | undefined
    if (!row) throw new Error('Prompt template not found.')
    return templateFromRow(row)
  },

  duplicateTemplate(params: AiPromptTemplateLifecycleParams): AiPromptTemplate {
    const source = this.requireTemplate(params)
    const now = new Date().toISOString()
    const copy: AiPromptTemplate = {
      ...source,
      id: randomUUID(),
      name: `${source.name} Copy`,
      isProtected: false,
      createdAt: now,
      updatedAt: now,
      archivedAt: null
    }
    return this.saveTemplate(copy)
  },

  archiveTemplate(params: AiPromptTemplateLifecycleParams): AiPromptTemplate {
    const template = this.requireTemplate(params)
    if (template.isProtected) throw new Error('Built-in action prompts cannot be archived.')

    const db = getDb()
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE ai_prompt_templates
      SET archivedAt = ?, updatedAt = ?
      WHERE id = ? AND workspaceId = ?
    `).run(now, now, params.id, params.workspaceId)
    return this.requireTemplate(params)
  },

  restoreTemplate(params: AiPromptTemplateLifecycleParams): AiPromptTemplate {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE ai_prompt_templates
      SET archivedAt = NULL, updatedAt = ?
      WHERE id = ? AND workspaceId = ?
    `).run(now, params.id, params.workspaceId)
    return this.requireTemplate(params)
  },

  deleteTemplate(params: AiPromptTemplateLifecycleParams): { id: string } {
    const template = this.requireTemplate(params)
    if (template.isProtected) throw new Error('Built-in action prompts cannot be deleted.')

    getDb()
      .prepare('DELETE FROM ai_prompt_templates WHERE id = ? AND workspaceId = ?')
      .run(params.id, params.workspaceId)
    return { id: params.id }
  },

  requireTemplate(params: AiPromptTemplateLifecycleParams): AiPromptTemplate {
    const row = getDb()
      .prepare('SELECT * FROM ai_prompt_templates WHERE id = ? AND workspaceId = ?')
      .get(params.id, params.workspaceId) as Record<string, unknown> | undefined
    if (!row) throw new Error('Prompt template not found.')
    return templateFromRow(row)
  }
}
