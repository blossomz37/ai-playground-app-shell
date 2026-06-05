import { randomUUID } from 'crypto'
import type { Doc, DocVersion } from '@shared/module-contract'
import { getDb } from './db'
import { events } from './events'

export const documents = {
  list(workspaceId: string): Doc[] {
    return getDb()
      .prepare('SELECT * FROM documents WHERE workspaceId = ? AND archivedAt IS NULL ORDER BY sortOrder')
      .all(workspaceId) as Doc[]
  },

  open(id: string): Doc | undefined {
    return getDb().prepare('SELECT * FROM documents WHERE id = ?').get(id) as Doc | undefined
  },

  save(id: string, content: string): void {
    const db = getDb()
    const now = new Date().toISOString()
    const current = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Doc | undefined

    if (current && current.content !== content) {
      db.prepare(
        'INSERT INTO document_versions (id, documentId, content, contentFormat, createdAt) VALUES (?, ?, ?, ?, ?)'
      ).run(randomUUID(), id, current.content, current.contentFormat, now)
    }

    db.prepare('UPDATE documents SET content = ?, updatedAt = ? WHERE id = ?').run(content, now, id)
    events.emit('documents:changed', id)
  },

  update(id: string, patch: { title?: string; kind?: string; icon?: string | null }): Doc {
    const db = getDb()
    const now = new Date().toISOString()
    const current = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Doc | undefined
    if (!current) throw new Error(`Document not found: ${id}`)

    const title = patch.title?.trim() || current.title
    const kind = patch.kind?.trim() || current.kind
    let icon = current.icon
    if (Object.prototype.hasOwnProperty.call(patch, 'icon')) {
      const nextIcon = patch.icon?.trim() ?? ''
      icon = nextIcon === '' ? null : nextIcon
    }

    db.prepare('UPDATE documents SET title = ?, kind = ?, icon = ?, updatedAt = ? WHERE id = ?').run(title, kind, icon, now, id)
    events.emit('documents:changed', id)

    return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Doc
  },

  create(params: {
    workspaceId: string
    kind: string
    title: string
    parentId?: string | null
    sortOrder?: number
  }): Doc {
    const db = getDb()
    const now = new Date().toISOString()
    const id = randomUUID()
    const parentId = params.parentId ?? null
    const sortOrder = params.sortOrder ?? (
      db.prepare(`
        SELECT COALESCE(MAX(sortOrder), -1) + 1 AS nextSortOrder
        FROM documents
        WHERE workspaceId = ? AND parentId IS ? AND archivedAt IS NULL
      `).get(params.workspaceId, parentId) as { nextSortOrder: number }
    ).nextSortOrder

    db.transaction(() => {
      db.prepare(`
        UPDATE documents
        SET sortOrder = sortOrder + 1, updatedAt = ?
        WHERE workspaceId = ?
          AND parentId IS ?
          AND archivedAt IS NULL
          AND sortOrder >= ?
      `).run(now, params.workspaceId, parentId, sortOrder)

      db.prepare(`
        INSERT INTO documents
          (id, workspaceId, parentId, kind, title, sortOrder, content, contentFormat, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, '', 'markdown', ?, ?)
      `).run(id, params.workspaceId, parentId, params.kind, params.title, sortOrder, now, now)
    })()

    events.emit('documents:changed', id)

    return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Doc
  },

  archive(id: string, options: { recursive?: boolean } = {}): string[] {
    const db = getDb()
    const now = new Date().toISOString()
    const current = db.prepare('SELECT * FROM documents WHERE id = ? AND archivedAt IS NULL').get(id) as Doc | undefined
    if (!current) return []

    const rows = options.recursive
      ? db.prepare(`
        WITH RECURSIVE subtree(id) AS (
          SELECT id FROM documents WHERE id = ? AND archivedAt IS NULL
          UNION ALL
          SELECT d.id
          FROM documents d
          JOIN subtree s ON d.parentId = s.id
          WHERE d.archivedAt IS NULL
        )
        SELECT id FROM subtree
      `).all(id) as Array<{ id: string }>
      : [{ id }]

    const affectedIds = rows.map(row => row.id)
    if (affectedIds.length === 0) return []

    const placeholders = affectedIds.map(() => '?').join(', ')
    db.prepare(`
      UPDATE documents
      SET archivedAt = ?, updatedAt = ?
      WHERE id IN (${placeholders})
    `).run(now, now, ...affectedIds)

    for (const affectedId of affectedIds) {
      events.emit('documents:changed', affectedId)
    }

    return affectedIds
  },

  versions(id: string): DocVersion[] {
    return getDb()
      .prepare('SELECT * FROM document_versions WHERE documentId = ? ORDER BY createdAt DESC')
      .all(id) as DocVersion[]
  }
}
