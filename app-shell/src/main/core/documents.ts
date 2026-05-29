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

  create(params: {
    workspaceId: string
    kind: string
    title: string
    parentId?: string
    sortOrder?: number
  }): Doc {
    const db = getDb()
    const now = new Date().toISOString()
    const id = randomUUID()

    db.prepare(`
      INSERT INTO documents
        (id, workspaceId, parentId, kind, title, sortOrder, content, contentFormat, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, '', 'markdown', ?, ?)
    `).run(id, params.workspaceId, params.parentId ?? null, params.kind, params.title, params.sortOrder ?? 0, now, now)

    return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Doc
  },

  versions(id: string): DocVersion[] {
    return getDb()
      .prepare('SELECT * FROM document_versions WHERE documentId = ? ORDER BY createdAt DESC')
      .all(id) as DocVersion[]
  }
}
