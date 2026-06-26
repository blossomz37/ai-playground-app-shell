import { app } from 'electron'
import { createHash, randomUUID } from 'crypto'
import { existsSync, lstatSync, readdirSync, readFileSync } from 'fs'
import path from 'path'
import type {
  Doc,
  DocumentNodeType,
  Workspace,
  WorkspaceDuplicateParams,
  WorkspaceImportParams,
  WorkspaceListParams,
  WorkspaceStats,
  WorkspaceStatus,
  WorkspaceUpdatePatch
} from '@shared/module-contract'
import { getDb } from './db'
import { createSettingsStore } from './settings'
import { events } from './events'
import { parseFrontmatter } from './frontmatter'
import { copyAssetWorkspaceLinks, deleteAssetWorkspaceLinks } from './assets'

const shellSettings = createSettingsStore('shell')
const ACTIVE_WORKSPACE_KEY = 'activeWorkspaceId'
const IMPORTABLE_EXTENSIONS = new Set(['.md', '.markdown', '.txt'])
const WORKSPACE_STATUSES = new Set<WorkspaceStatus>(['active', 'paused', 'draft'])

type ImportedDocument = {
  id: string
  parentId: string | null
  nodeType: DocumentNodeType
  kind: string | null
  title: string
  sortOrder: number
  content: string
  sourcePath: string | null
  sourceChecksum: string | null
  metadataJson: string | null
}

function rowToWorkspace(row: Record<string, unknown>): Workspace {
  const status = String(row.status ?? 'active')
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.type),
    root: String(row.root),
    description: String(row.description ?? ''),
    status: WORKSPACE_STATUSES.has(status as WorkspaceStatus) ? status as WorkspaceStatus : 'active',
    metadataJson: String(row.metadataJson ?? '{}'),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    lastOpenedAt: row.lastOpenedAt ? String(row.lastOpenedAt) : null,
    archivedAt: row.archivedAt ? String(row.archivedAt) : null
  }
}

function getWorkspace(id: string, options: { includeArchived?: boolean } = {}): Workspace | null {
  const row = getDb()
    .prepare(`SELECT * FROM workspaces WHERE id = ?${options.includeArchived ? '' : ' AND archivedAt IS NULL'}`)
    .get(id) as Record<string, unknown> | undefined
  return row ? rowToWorkspace(row) : null
}

function workspaceInsertParams(workspace: Workspace): unknown[] {
  return [
    workspace.id,
    workspace.name,
    workspace.type,
    workspace.root,
    workspace.description,
    workspace.status,
    workspace.metadataJson,
    workspace.createdAt,
    workspace.updatedAt,
    workspace.lastOpenedAt,
    workspace.archivedAt
  ]
}

function insertWorkspace(workspace: Workspace): void {
  getDb().prepare(`
    INSERT INTO workspaces (id, name, type, root, description, status, metadataJson, createdAt, updatedAt, lastOpenedAt, archivedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(...workspaceInsertParams(workspace))
}

function createWorkspaceRecord(params: { name: string; type?: string; root?: string }, now = new Date().toISOString()): Workspace {
  return {
    id: `ws-${randomUUID()}`,
    name: params.name.trim() || 'Untitled Workspace',
    type: params.type?.trim() || 'authoring',
    root: params.root?.trim() || app.getPath('home'),
    description: '',
    status: 'active',
    metadataJson: '{}',
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    archivedAt: null
  }
}

function mostRecentActiveWorkspace(): Workspace | null {
  const row = getDb()
    .prepare(`
      SELECT * FROM workspaces
      WHERE archivedAt IS NULL
      ORDER BY COALESCE(lastOpenedAt, updatedAt, createdAt) DESC, name ASC
      LIMIT 1
    `)
    .get() as Record<string, unknown> | undefined
  return row ? rowToWorkspace(row) : null
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

function scalarCount(sql: string, workspaceId: string): number {
  const row = getDb().prepare(sql).get(workspaceId) as { n: number } | undefined
  return Number(row?.n ?? 0)
}

function validateWorkspacePatch(patch: WorkspaceUpdatePatch): WorkspaceUpdatePatch {
  const next: WorkspaceUpdatePatch = {}

  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) throw new Error('Workspace name is required.')
    next.name = name
  }

  if (patch.type !== undefined) {
    const type = patch.type.trim()
    if (!type) throw new Error('Workspace type is required.')
    next.type = type
  }

  if (patch.root !== undefined) {
    const root = patch.root.trim()
    if (!root) throw new Error('Workspace root is required.')
    next.root = root
  }

  if (patch.description !== undefined) {
    next.description = patch.description.trim()
  }

  if (patch.status !== undefined) {
    if (!WORKSPACE_STATUSES.has(patch.status)) throw new Error(`Unsupported workspace status: ${patch.status}`)
    next.status = patch.status
  }

  if (patch.metadataJson !== undefined) {
    const metadataJson = patch.metadataJson.trim() || '{}'
    JSON.parse(metadataJson)
    next.metadataJson = metadataJson
  }

  return next
}

function createDefaultWorkspace(): Workspace {
  const workspace = createWorkspaceRecord({ name: 'My Workspace', type: 'authoring', root: app.getPath('home') })
  insertWorkspace(workspace)
  return workspace
}

function ensureActiveWorkspace(): Workspace {
  const first = mostRecentActiveWorkspace() ?? createDefaultWorkspace()
  return workspaceService.switch(first.id)
}

function checksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

function titleFromFile(filePath: string): string {
  return path.basename(filePath, path.extname(filePath))
}

function importableEntries(root: string, parentId: string | null = null): ImportedDocument[] {
  const entries = readdirSync(root, { withFileTypes: true })
    .filter(entry => !entry.name.startsWith('.'))
    .map(entry => ({
      name: entry.name,
      fullPath: path.join(root, entry.name),
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      isSymbolicLink: entry.isSymbolicLink()
    }))
    .filter(entry => !entry.isSymbolicLink && (entry.isDirectory || (entry.isFile && IMPORTABLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))))
    .sort((left, right) => {
      if (left.isDirectory !== right.isDirectory) return left.isDirectory ? -1 : 1
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    })

  const docs: ImportedDocument[] = []
  entries.forEach((entry, index) => {
    if (entry.isDirectory) {
      const id = randomUUID()
      docs.push({
        id,
        parentId,
        nodeType: 'folder',
        kind: null,
        title: entry.name,
        sortOrder: index,
        content: '',
        sourcePath: entry.fullPath,
        sourceChecksum: null,
        metadataJson: null
      })
      docs.push(...importableEntries(entry.fullPath, id))
      return
    }

    const content = readFileSync(entry.fullPath)
    const parsed = parseFrontmatter(content.toString('utf8'))
    docs.push({
      id: randomUUID(),
      parentId,
      nodeType: 'document',
      kind: null,
      title: titleFromFile(entry.fullPath),
      sortOrder: index,
      content: parsed.body,
      sourcePath: entry.fullPath,
      sourceChecksum: checksum(content),
      metadataJson: parsed.metadata ? JSON.stringify(parsed.metadata) : null
    })
  })

  return docs
}

function copyWorkspaceSettings(sourceWorkspaceId: string, targetWorkspaceId: string): void {
  const db = getDb()
  const rows = db
    .prepare("SELECT key, value FROM shell_settings WHERE key LIKE ?")
    .all(`modules.%.${sourceWorkspaceId}.state`) as Array<{ key: string; value: string }>

  for (const row of rows) {
    db.prepare('INSERT OR REPLACE INTO shell_settings (key, value) VALUES (?, ?)')
      .run(row.key.replace(`.${sourceWorkspaceId}.`, `.${targetWorkspaceId}.`), row.value)
  }

  const kindOptions = db
    .prepare('SELECT value FROM shell_settings WHERE key = ?')
    .get(`shell.documents.${sourceWorkspaceId}.kindOptions`) as { value: string } | undefined
  if (kindOptions) {
    db.prepare('INSERT OR REPLACE INTO shell_settings (key, value) VALUES (?, ?)')
      .run(`shell.documents.${targetWorkspaceId}.kindOptions`, kindOptions.value)
  }
}

function deleteWorkspaceSettings(workspaceId: string): void {
  const db = getDb()
  db
    .prepare("DELETE FROM shell_settings WHERE key LIKE ?")
    .run(`modules.%.${workspaceId}.state`)
  db
    .prepare('DELETE FROM shell_settings WHERE key = ?')
    .run(`shell.documents.${workspaceId}.kindOptions`)
}

function copyDocuments(sourceWorkspaceId: string, targetWorkspaceId: string, now: string): void {
  const db = getDb()
  const sourceDocs = db
    .prepare('SELECT * FROM documents WHERE workspaceId = ? ORDER BY createdAt, sortOrder')
    .all(sourceWorkspaceId) as Doc[]
  const idMap = new Map<string, string>()

  for (const doc of sourceDocs) idMap.set(doc.id, randomUUID())

  const insertDoc = db.prepare(`
    INSERT INTO documents
      (id, workspaceId, parentId, nodeType, kind, title, icon, sortOrder, content, contentFormat, sourcePath, sourceChecksum, metadataJson, createdAt, updatedAt, archivedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const doc of sourceDocs) {
    insertDoc.run(
      idMap.get(doc.id),
      targetWorkspaceId,
      doc.parentId ? idMap.get(doc.parentId) ?? null : null,
      doc.nodeType,
      doc.kind,
      doc.title,
      doc.icon,
      doc.sortOrder,
      doc.content,
      doc.contentFormat,
      doc.sourcePath,
      doc.sourceChecksum,
      doc.metadataJson,
      now,
      now,
      doc.archivedAt
    )
  }

  const versions = db.prepare(`
    SELECT document_versions.*
    FROM document_versions
    JOIN documents ON documents.id = document_versions.documentId
    WHERE documents.workspaceId = ?
    ORDER BY document_versions.createdAt
  `).all(sourceWorkspaceId) as Array<{ documentId: string; content: string; contentFormat: string; createdAt: string; label: string | null }>
  const insertVersion = db.prepare(`
    INSERT INTO document_versions (id, documentId, content, contentFormat, createdAt, label)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  for (const version of versions) {
    const documentId = idMap.get(version.documentId)
    if (!documentId) continue
    insertVersion.run(randomUUID(), documentId, version.content, version.contentFormat, version.createdAt, version.label)
  }
}

function deleteWorkspaceRows(workspaceId: string): void {
  const db = getDb()
  deleteAssetWorkspaceLinks(workspaceId)

  const documentIds = db
    .prepare('SELECT id FROM documents WHERE workspaceId = ?')
    .all(workspaceId) as Array<{ id: string }>

  if (documentIds.length > 0) {
    const placeholders = documentIds.map(() => '?').join(', ')
    db.prepare(`DELETE FROM document_versions WHERE documentId IN (${placeholders})`)
      .run(...documentIds.map(row => row.id))
  }

  const workspaceTables = [
    'ai_tool_calls',
    'ai_proposals',
    'ai_chain_step_runs',
    'ai_context_packs',
    'ai_runs',
    'ai_chain_runs',
    'ai_prompt_chains',
    'ai_messages',
    'ai_conversations',
    'ai_prompt_templates',
    'ai_providers',
    'job_runs',
    'documents'
  ]

  for (const table of workspaceTables) {
    db.prepare(`DELETE FROM ${table} WHERE workspaceId = ?`).run(workspaceId)
  }

  deleteWorkspaceSettings(workspaceId)
  db.prepare('DELETE FROM workspaces WHERE id = ?').run(workspaceId)
}

export const workspaceService = {
  list(params: WorkspaceListParams = {}): Workspace[] {
    const rows = getDb()
      .prepare(`
        SELECT * FROM workspaces
        ${params.includeArchived ? '' : 'WHERE archivedAt IS NULL'}
        ORDER BY archivedAt IS NOT NULL ASC, COALESCE(lastOpenedAt, updatedAt, createdAt) DESC, name ASC
      `)
      .all() as Array<Record<string, unknown>>
    return rows.map(rowToWorkspace)
  },

  getActive(): Workspace {
    const savedId = shellSettings.get<string>(ACTIVE_WORKSPACE_KEY)
    const saved = savedId ? getWorkspace(savedId) : null
    if (saved) return saved

    return ensureActiveWorkspace()
  },

  create(params: { name: string; type?: string; root?: string }): Workspace {
    const workspace = createWorkspaceRecord(params)
    insertWorkspace(workspace)

    return workspace
  },

  importFolder(params: WorkspaceImportParams): Workspace {
    const root = path.resolve(params.root?.trim() || '')
    if (!root || !existsSync(root) || !lstatSync(root).isDirectory()) {
      throw new Error(`Folder not found: ${params.root ?? ''}`)
    }

    const now = new Date().toISOString()
    const workspace = createWorkspaceRecord({
      name: params.name?.trim() || path.basename(root) || 'Imported Project',
      type: params.type,
      root
    }, now)
    const importedDocs = importableEntries(root)

    getDb().transaction(() => {
      insertWorkspace(workspace)
      const insertDoc = getDb().prepare(`
        INSERT INTO documents
          (id, workspaceId, parentId, nodeType, kind, title, sortOrder, content, contentFormat, sourcePath, sourceChecksum, metadataJson, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'markdown', ?, ?, ?, ?, ?)
      `)

      for (const doc of importedDocs) {
        insertDoc.run(
          doc.id,
          workspace.id,
          doc.parentId,
          doc.nodeType,
          doc.kind,
          doc.title,
          doc.sortOrder,
          doc.content,
          doc.sourcePath,
          doc.sourceChecksum,
          doc.metadataJson,
          now,
          now
        )
      }
    })()

    return workspace
  },

  duplicate(id: string, params: WorkspaceDuplicateParams = {}): Workspace {
    const source = getWorkspace(id, { includeArchived: true })
    if (!source) throw new Error(`Workspace not found: ${id}`)

    const now = new Date().toISOString()
    const workspace = createWorkspaceRecord({
      name: params.name?.trim() || `${source.name} Copy`,
      type: source.type,
      root: source.root
    }, now)

    getDb().transaction(() => {
      insertWorkspace(workspace)
      copyDocuments(source.id, workspace.id, now)
      copyAssetWorkspaceLinks(source.id, workspace.id, now)
      copyWorkspaceSettings(source.id, workspace.id)
    })()

    return workspace
  },

  archive(id: string): Workspace {
    const workspace = getWorkspace(id)
    if (!workspace) throw new Error(`Workspace not found: ${id}`)

    const now = new Date().toISOString()
    getDb()
      .prepare('UPDATE workspaces SET archivedAt = ?, updatedAt = ? WHERE id = ?')
      .run(now, now, id)

    const activeId = shellSettings.get<string>(ACTIVE_WORKSPACE_KEY)
    if (activeId === id) {
      return ensureActiveWorkspace()
    }

    return this.getActive()
  },

  restore(id: string): Workspace {
    const workspace = getWorkspace(id, { includeArchived: true })
    if (!workspace) throw new Error(`Workspace not found: ${id}`)

    const now = new Date().toISOString()
    getDb()
      .prepare('UPDATE workspaces SET archivedAt = NULL, updatedAt = ? WHERE id = ?')
      .run(now, id)

    return this.switch(id)
  },

  delete(id: string): Workspace {
    const workspace = getWorkspace(id, { includeArchived: true })
    if (!workspace) throw new Error(`Workspace not found: ${id}`)

    const activeId = shellSettings.get<string>(ACTIVE_WORKSPACE_KEY)
    const nonArchivedCount = getDb()
      .prepare('SELECT COUNT(*) AS n FROM workspaces WHERE archivedAt IS NULL')
      .get() as { n: number }
    let replacement: Workspace | null = null

    getDb().transaction(() => {
      if (!workspace.archivedAt && nonArchivedCount.n <= 1) {
        replacement = createWorkspaceRecord({ name: 'My Workspace', type: 'authoring', root: app.getPath('home') })
        insertWorkspace(replacement)
      }
      deleteWorkspaceRows(id)
    })()

    if (activeId === id) {
      return this.switch(replacement?.id ?? (mostRecentActiveWorkspace() ?? createDefaultWorkspace()).id)
    }

    return this.getActive()
  },

  switch(id: string): Workspace {
    const workspace = getWorkspace(id)
    if (!workspace) throw new Error(`Workspace not found: ${id}`)

    const now = new Date().toISOString()
    getDb()
      .prepare('UPDATE workspaces SET lastOpenedAt = ?, updatedAt = ? WHERE id = ?')
      .run(now, now, id)
    shellSettings.set(ACTIVE_WORKSPACE_KEY, id)

    const updated = getWorkspace(id) ?? { ...workspace, lastOpenedAt: now, updatedAt: now }
    events.emit('workspace:changed', updated)
    return updated
  },

  update(id: string, patch: WorkspaceUpdatePatch): Workspace {
    const workspace = getWorkspace(id, { includeArchived: true })
    if (!workspace) throw new Error(`Workspace not found: ${id}`)

    const next = validateWorkspacePatch(patch)
    const fields = Object.entries(next).filter(([, value]) => value !== undefined)
    if (fields.length === 0) return workspace

    const now = new Date().toISOString()
    const assignments = fields.map(([key]) => `${key} = ?`).join(', ')
    getDb()
      .prepare(`UPDATE workspaces SET ${assignments}, updatedAt = ? WHERE id = ?`)
      .run(...fields.map(([, value]) => value), now, id)

    const updated = getWorkspace(id, { includeArchived: true })
    if (!updated) throw new Error(`Workspace not found after update: ${id}`)
    events.emit('workspace:changed', updated)
    return updated
  },

  stats(workspaceId: string): WorkspaceStats {
    const docRows = getDb()
      .prepare(`
        SELECT content
        FROM documents
        WHERE workspaceId = ? AND archivedAt IS NULL AND nodeType != 'folder'
      `)
      .all(workspaceId) as Array<{ content: string }>

    return {
      workspaceId,
      documents: docRows.length,
      archivedDocuments: scalarCount(`
        SELECT COUNT(*) AS n
        FROM documents
        WHERE workspaceId = ? AND archivedAt IS NOT NULL AND nodeType != 'folder'
      `, workspaceId),
      words: docRows.reduce((sum, row) => sum + countWords(row.content ?? ''), 0),
      assets: scalarCount(`
        SELECT COUNT(DISTINCT asset_workspace_links.assetId) AS n
        FROM asset_workspace_links
        JOIN assets ON assets.id = asset_workspace_links.assetId
        WHERE asset_workspace_links.workspaceId = ? AND assets.archivedAt IS NULL
      `, workspaceId),
      conversations: scalarCount(`
        SELECT COUNT(*) AS n
        FROM ai_conversations
        WHERE workspaceId = ? AND archivedAt IS NULL
      `, workspaceId),
      promptTemplates: scalarCount(`
        SELECT COUNT(*) AS n
        FROM ai_prompt_templates
        WHERE workspaceId = ? AND archivedAt IS NULL
      `, workspaceId),
      jobs: scalarCount(`
        SELECT COUNT(*) AS n
        FROM job_runs
        WHERE workspaceId = ?
      `, workspaceId)
    }
  }
}
