import { randomUUID } from 'crypto'
import type { Doc, DocumentExportParams, DocumentExportResult, DocumentMetadataPatch, DocVersion } from '@shared/module-contract'
import { getDb } from './db'
import { events } from './events'
import { exportDocumentSubtree } from './document-export'

function sameParent(left: string | null, right: string | null): boolean {
  return left === right
}

function parentRows(db: ReturnType<typeof getDb>, workspaceId: string, parentId: string | null): Doc[] {
  return db
    .prepare(`
      SELECT *
      FROM documents
      WHERE workspaceId = ?
        AND parentId IS ?
        AND archivedAt IS NULL
      ORDER BY sortOrder, createdAt
    `)
    .all(workspaceId, parentId) as Doc[]
}

function parseMetadata(metadataJson: string | null): Record<string, unknown> {
  if (!metadataJson) return {}
  try {
    const parsed = JSON.parse(metadataJson) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function applyMetadataPatch(metadata: Record<string, unknown>, patch: DocumentMetadataPatch): Record<string, unknown> {
  const next = { ...metadata }
  if (Object.prototype.hasOwnProperty.call(patch, 'targetWordCount')) {
    const value = patch.targetWordCount
    if (value === null || value === undefined) {
      delete next.targetWordCount
    } else if (Number.isFinite(value)) {
      next.targetWordCount = Math.max(0, Math.floor(value))
    }
  }
  return next
}

export const documents = {
  list(workspaceId: string): Doc[] {
    return getDb()
      .prepare('SELECT * FROM documents WHERE workspaceId = ? AND archivedAt IS NULL ORDER BY sortOrder')
      .all(workspaceId) as Doc[]
  },

  listArchived(workspaceId: string): Doc[] {
    return getDb()
      .prepare('SELECT * FROM documents WHERE workspaceId = ? AND archivedAt IS NOT NULL ORDER BY archivedAt DESC, sortOrder, createdAt')
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

  updateMetadata(id: string, patch: DocumentMetadataPatch): Doc {
    const db = getDb()
    const now = new Date().toISOString()
    const current = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Doc | undefined
    if (!current) throw new Error(`Document not found: ${id}`)

    const metadata = applyMetadataPatch(parseMetadata(current.metadataJson), patch)
    db.prepare('UPDATE documents SET metadataJson = ?, updatedAt = ? WHERE id = ?').run(JSON.stringify(metadata), now, id)
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

  move(params: { id: string; parentId?: string | null; sortOrder: number }): Doc[] {
    const db = getDb()
    const now = new Date().toISOString()
    const current = db
      .prepare('SELECT * FROM documents WHERE id = ? AND archivedAt IS NULL')
      .get(params.id) as Doc | undefined
    if (!current) throw new Error(`Document not found: ${params.id}`)

    const nextParentId = params.parentId ?? null
    if (nextParentId) {
      const parent = db
        .prepare('SELECT * FROM documents WHERE id = ? AND archivedAt IS NULL')
        .get(nextParentId) as Doc | undefined
      if (!parent) throw new Error(`Parent document not found: ${nextParentId}`)
      if (parent.workspaceId !== current.workspaceId) {
        throw new Error('Cannot move a document across workspaces.')
      }

      const descendant = db.prepare(`
        WITH RECURSIVE descendants(id) AS (
          SELECT id FROM documents WHERE parentId = ? AND archivedAt IS NULL
          UNION ALL
          SELECT d.id
          FROM documents d
          JOIN descendants child ON d.parentId = child.id
          WHERE d.archivedAt IS NULL
        )
        SELECT id FROM descendants WHERE id = ?
      `).get(current.id, nextParentId) as { id: string } | undefined
      if (descendant || nextParentId === current.id) {
        throw new Error('Cannot move a document inside itself.')
      }
    }

    const sourceParentId = current.parentId
    const destinationRows = parentRows(db, current.workspaceId, nextParentId)
      .filter(doc => doc.id !== current.id)
    const insertIndex = Math.max(0, Math.min(params.sortOrder, destinationRows.length))
    const nextDestinationIds = destinationRows.map(doc => doc.id)
    nextDestinationIds.splice(insertIndex, 0, current.id)

    const currentSiblingIds = parentRows(db, current.workspaceId, sourceParentId).map(doc => doc.id)
    if (sameParent(sourceParentId, nextParentId) && currentSiblingIds.join('\0') === nextDestinationIds.join('\0')) {
      throw new Error('Move would not change document order.')
    }

    const affectedParentIds = new Set<string | null>([sourceParentId, nextParentId])

    db.transaction(() => {
      if (!sameParent(sourceParentId, nextParentId)) {
        db.prepare('UPDATE documents SET parentId = ?, updatedAt = ? WHERE id = ?').run(nextParentId, now, current.id)

        const sourceRows = parentRows(db, current.workspaceId, sourceParentId)
          .filter(doc => doc.id !== current.id)
        sourceRows.forEach((doc, index) => {
          db.prepare('UPDATE documents SET sortOrder = ?, updatedAt = ? WHERE id = ?').run(index, now, doc.id)
        })
      }

      nextDestinationIds.forEach((id, index) => {
        db.prepare('UPDATE documents SET parentId = ?, sortOrder = ?, updatedAt = ? WHERE id = ?').run(nextParentId, index, now, id)
      })
    })()

    const affectedDocs = Array.from(affectedParentIds)
      .flatMap(parentId => parentRows(db, current.workspaceId, parentId))

    for (const doc of affectedDocs) {
      events.emit('documents:changed', doc.id)
    }

    return affectedDocs
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

  restore(id: string, options: { recursive?: boolean } = {}): Doc[] {
    const db = getDb()
    const now = new Date().toISOString()
    const current = db.prepare('SELECT * FROM documents WHERE id = ? AND archivedAt IS NOT NULL').get(id) as Doc | undefined
    if (!current) return []

    const restoreIds = new Set<string>([id])

    let parentId = current.parentId
    while (parentId) {
      const parent = db.prepare('SELECT * FROM documents WHERE id = ?').get(parentId) as Doc | undefined
      if (!parent) {
        db.prepare('UPDATE documents SET parentId = NULL, updatedAt = ? WHERE id = ?').run(now, current.id)
        break
      }
      if (parent.archivedAt) restoreIds.add(parent.id)
      parentId = parent.parentId
    }

    if (options.recursive ?? true) {
      const rows = db.prepare(`
        WITH RECURSIVE subtree(id) AS (
          SELECT id FROM documents WHERE id = ?
          UNION ALL
          SELECT d.id
          FROM documents d
          JOIN subtree s ON d.parentId = s.id
          WHERE d.archivedAt IS NOT NULL
        )
        SELECT id FROM subtree
      `).all(id) as Array<{ id: string }>
      for (const row of rows) restoreIds.add(row.id)
    }

    const affectedIds = Array.from(restoreIds)
    const placeholders = affectedIds.map(() => '?').join(', ')
    db.prepare(`
      UPDATE documents
      SET archivedAt = NULL, updatedAt = ?
      WHERE id IN (${placeholders})
    `).run(now, ...affectedIds)

    const restored = db.prepare(`
      SELECT *
      FROM documents
      WHERE id IN (${placeholders})
      ORDER BY sortOrder, createdAt
    `).all(...affectedIds) as Doc[]

    for (const affectedId of affectedIds) {
      events.emit('documents:changed', affectedId)
    }

    return restored
  },

  exportSubtree(id: string, params: DocumentExportParams = {}): DocumentExportResult {
    const targetDir = params.targetDir?.trim()
    if (!targetDir) throw new Error('Export target folder is required.')

    const db = getDb()
    const root = db.prepare('SELECT * FROM documents WHERE id = ? AND archivedAt IS NULL').get(id) as Doc | undefined
    if (!root) throw new Error(`Document not found: ${id}`)

    const subtreeDocs = db.prepare(`
      WITH RECURSIVE subtree(id) AS (
        SELECT id FROM documents WHERE id = ? AND archivedAt IS NULL
        UNION ALL
        SELECT d.id
        FROM documents d
        JOIN subtree s ON d.parentId = s.id
        WHERE d.archivedAt IS NULL
      )
      SELECT documents.*
      FROM documents
      JOIN subtree ON subtree.id = documents.id
      ORDER BY documents.parentId, documents.sortOrder, documents.createdAt
    `).all(id) as Doc[]

    return exportDocumentSubtree(root, subtreeDocs, targetDir)
  },

  versions(id: string): DocVersion[] {
    return getDb()
      .prepare('SELECT * FROM document_versions WHERE documentId = ? ORDER BY createdAt DESC')
      .all(id) as DocVersion[]
  }
}
