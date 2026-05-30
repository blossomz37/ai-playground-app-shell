import { app } from 'electron'
import { randomUUID } from 'crypto'
import type { Workspace } from '@shared/module-contract'
import { getDb } from './db'
import { createSettingsStore } from './settings'
import { events } from './events'

const shellSettings = createSettingsStore('shell')
const ACTIVE_WORKSPACE_KEY = 'activeWorkspaceId'

function rowToWorkspace(row: Record<string, unknown>): Workspace {
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.type),
    root: String(row.root),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    lastOpenedAt: row.lastOpenedAt ? String(row.lastOpenedAt) : null,
    archivedAt: row.archivedAt ? String(row.archivedAt) : null
  }
}

function getWorkspace(id: string): Workspace | null {
  const row = getDb()
    .prepare('SELECT * FROM workspaces WHERE id = ? AND archivedAt IS NULL')
    .get(id) as Record<string, unknown> | undefined
  return row ? rowToWorkspace(row) : null
}

export const workspaceService = {
  list(): Workspace[] {
    const rows = getDb()
      .prepare(`
        SELECT * FROM workspaces
        WHERE archivedAt IS NULL
        ORDER BY COALESCE(lastOpenedAt, updatedAt, createdAt) DESC, name ASC
      `)
      .all() as Array<Record<string, unknown>>
    return rows.map(rowToWorkspace)
  },

  getActive(): Workspace {
    const savedId = shellSettings.get<string>(ACTIVE_WORKSPACE_KEY)
    const saved = savedId ? getWorkspace(savedId) : null
    if (saved) return saved

    const first = this.list()[0]
    if (!first) return this.create({ name: 'My Workspace', type: 'authoring', root: app.getPath('home') })
    this.switch(first.id)
    return first
  },

  create(params: { name: string; type?: string; root?: string }): Workspace {
    const now = new Date().toISOString()
    const workspace: Workspace = {
      id: `ws-${randomUUID()}`,
      name: params.name.trim() || 'Untitled Workspace',
      type: params.type?.trim() || 'authoring',
      root: params.root?.trim() || app.getPath('home'),
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      archivedAt: null
    }

    getDb().prepare(`
      INSERT INTO workspaces (id, name, type, root, createdAt, updatedAt, lastOpenedAt, archivedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      workspace.id,
      workspace.name,
      workspace.type,
      workspace.root,
      workspace.createdAt,
      workspace.updatedAt,
      workspace.lastOpenedAt,
      workspace.archivedAt
    )

    return workspace
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
  }
}
