import { randomUUID } from 'crypto'
import type {
  AiContextCandidate,
  AiContextPack,
  AiPromptTemplate,
  AiRun,
  AiRunStatus,
  InvokeAiParams,
  ListAiRunsParams
} from '@shared/ai'
import { getDb } from '../core/db'

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
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt)
  }
}

export const aiRepository = {
  ensureDefaults(workspaceId: string): void {
    const db = getDb()
    const now = new Date().toISOString()

    const providerExists = db
      .prepare('SELECT 1 FROM ai_providers WHERE id = ? AND workspaceId = ?')
      .get('mock-local', workspaceId)

    if (!providerExists) {
      db.prepare(`
        INSERT INTO ai_providers
          (id, workspaceId, name, secretName, baseUrl, defaultModel, availableModelsJson, supportsStreaming, supportsTools, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
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
    }

    const templateCount = db
      .prepare('SELECT COUNT(*) as n FROM ai_prompt_templates WHERE workspaceId = ?')
      .get(workspaceId) as { n: number }

    if (templateCount.n === 0) {
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
        createdAt: now,
        updatedAt: now
      })
    }
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
      providerId: params.providerId ?? 'mock-local',
      model: params.model ?? 'mock-durable-context-v1',
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
      .prepare('SELECT * FROM ai_prompt_templates WHERE workspaceId = ? ORDER BY updatedAt DESC')
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
        (id, workspaceId, name, description, body, variablesJson, defaultModel, defaultTemperature, contextPolicyJson, tagsJson, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        body = excluded.body,
        variablesJson = excluded.variablesJson,
        defaultModel = excluded.defaultModel,
        defaultTemperature = excluded.defaultTemperature,
        contextPolicyJson = excluded.contextPolicyJson,
        tagsJson = excluded.tagsJson,
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
      createdAt,
      updatedAt
    )

    return {
      ...template,
      createdAt,
      updatedAt
    }
  }
}
