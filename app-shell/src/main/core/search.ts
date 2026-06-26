// ──────────────────────────────────────────────
// File:        search.ts
// Description: Universal full-text search across SQLite-backed entities
// Version:     0.2.0
// Created:     2026-05-29
// Modified:    2026-06-26
// Author:      antigravity
// ──────────────────────────────────────────────

import type { SearchResult } from '@shared/module-contract'
import { getDb } from './db'

const DEFAULT_LIMIT = 50
const DEFAULT_RECENTS_LIMIT = 30

/**
 * Universal "go to anything" search.
 *
 * Backed by four FTS5 virtual tables kept in sync via triggers (see db.ts):
 *  - `documents_fts`            → documents (external-content over the documents table)
 *  - `ai_conversations_fts`     → AI conversations (title + aggregated message content)
 *  - `ai_prompt_templates_fts`  → prompt templates (name + description + body)
 *  - `assets_fts`               → assets (label + originalName + comments + tags)
 *
 * Each branch yields the unified `SearchResult` shape (entityType, entityId,
 * documentId-or-null, moduleId, title, snippet, rank). Results are workspace-scoped,
 * exclude archived rows, and are ordered by FTS rank across the whole UNION.
 */
export const searchService = {
  /**
   * Search every indexed entity type by content and title.
   *
   * @param query       - FTS5 search expression (simple words or phrase queries)
   * @param workspaceId - Filter to a specific workspace
   * @param limit       - Max results across all entity types (default 50)
   */
  search(query: string, workspaceId: string, limit: number = DEFAULT_LIMIT): SearchResult[] {
    if (!query.trim()) return []

    // Sanitise: FTS5 interprets certain characters as operators.
    // Wrap each token in double quotes to treat as literal phrases.
    const sanitised = query
      .split(/\s+/)
      .filter(Boolean)
      .map(tok => `"${tok.replace(/"/g, '""')}"`)
      .join(' ')

    const rows = getDb()
      .prepare(`
        SELECT * FROM (
          SELECT
            'document'     AS entityType,
            d.id           AS entityId,
            d.id           AS documentId,
            'shell.documents' AS moduleId,
            d.title        AS title,
            snippet(documents_fts, 1, '<mark>', '</mark>', '…', 32) AS snippet,
            documents_fts.rank AS rank
          FROM documents_fts
          JOIN documents d ON d.rowid = documents_fts.rowid
          WHERE documents_fts MATCH :q
            AND d.workspaceId = :ws
            AND d.archivedAt IS NULL

          UNION ALL

          SELECT
            'conversation' AS entityType,
            c.id           AS entityId,
            NULL           AS documentId,
            'shell.aichat' AS moduleId,
            c.title        AS title,
            snippet(ai_conversations_fts, 2, '<mark>', '</mark>', '…', 32) AS snippet,
            ai_conversations_fts.rank AS rank
          FROM ai_conversations_fts
          JOIN ai_conversations c ON c.id = ai_conversations_fts.entityId
          WHERE ai_conversations_fts MATCH :q
            AND c.workspaceId = :ws
            AND c.archivedAt IS NULL

          UNION ALL

          SELECT
            'template'           AS entityType,
            t.id                 AS entityId,
            NULL                 AS documentId,
            'shell.promptstudio' AS moduleId,
            t.name               AS title,
            snippet(ai_prompt_templates_fts, 2, '<mark>', '</mark>', '…', 32) AS snippet,
            ai_prompt_templates_fts.rank AS rank
          FROM ai_prompt_templates_fts
          JOIN ai_prompt_templates t ON t.id = ai_prompt_templates_fts.entityId
          WHERE ai_prompt_templates_fts MATCH :q
            AND t.workspaceId = :ws
            AND t.archivedAt IS NULL

          UNION ALL

          SELECT
            'asset'        AS entityType,
            a.id           AS entityId,
            NULL           AS documentId,
            'shell.assets' AS moduleId,
            a.label        AS title,
            snippet(assets_fts, 2, '<mark>', '</mark>', '…', 32) AS snippet,
            assets_fts.rank AS rank
          FROM assets_fts
          JOIN assets a ON a.id = assets_fts.entityId
          JOIN asset_workspace_links awl ON awl.assetId = a.id
          WHERE assets_fts MATCH :q
            AND awl.workspaceId = :ws
            AND a.archivedAt IS NULL
        )
        ORDER BY rank
        LIMIT :limit
      `)
      .all({ q: sanitised, ws: workspaceId, limit }) as SearchResult[]

    return normalizeRows(rows)
  },

  /**
   * Recently-updated items across the indexed entity types, used as the
   * empty-query state of the palette. Ordered by each entity's natural
   * "updated" timestamp; no FTS involved.
   *
   * @param workspaceId - Filter to a specific workspace
   * @param limit       - Max results across all entity types (default 30)
   */
  recents(workspaceId: string, limit: number = DEFAULT_RECENTS_LIMIT): SearchResult[] {
    const rows = getDb()
      .prepare(`
        SELECT * FROM (
          SELECT
            'document'        AS entityType,
            d.id              AS entityId,
            d.id              AS documentId,
            'shell.documents' AS moduleId,
            d.title           AS title,
            ''                AS snippet,
            d.updatedAt       AS updatedAt
          FROM documents d
          WHERE d.workspaceId = :ws AND d.archivedAt IS NULL AND d.nodeType != 'folder'

          UNION ALL

          SELECT
            'conversation' AS entityType,
            c.id           AS entityId,
            NULL           AS documentId,
            'shell.aichat' AS moduleId,
            c.title        AS title,
            ''             AS snippet,
            c.updatedAt    AS updatedAt
          FROM ai_conversations c
          WHERE c.workspaceId = :ws AND c.archivedAt IS NULL

          UNION ALL

          SELECT
            'template'           AS entityType,
            t.id                 AS entityId,
            NULL                 AS documentId,
            'shell.promptstudio' AS moduleId,
            t.name               AS title,
            ''                   AS snippet,
            t.updatedAt          AS updatedAt
          FROM ai_prompt_templates t
          WHERE t.workspaceId = :ws AND t.archivedAt IS NULL

          UNION ALL

          SELECT
            'asset'        AS entityType,
            a.id           AS entityId,
            NULL           AS documentId,
            'shell.assets' AS moduleId,
            a.label        AS title,
            ''             AS snippet,
            a.updatedAt    AS updatedAt
          FROM assets a
          JOIN asset_workspace_links awl ON awl.assetId = a.id
          WHERE awl.workspaceId = :ws AND a.archivedAt IS NULL
        )
        ORDER BY updatedAt DESC
        LIMIT :limit
      `)
      .all({ ws: workspaceId, limit }) as Array<SearchResult & { updatedAt?: string }>

    // Drop the sort-only `updatedAt` column before returning the unified shape.
    return normalizeRows(rows.map(({ updatedAt: _updatedAt, ...row }) => row))
  },

  /**
   * Full rebuild of every FTS index from its source table(s).
   * Use if an index gets out of sync (e.g. after a manual DB edit).
   */
  rebuildIndex(): void {
    const db = getDb()
    db.exec(`INSERT INTO documents_fts(documents_fts) VALUES('rebuild');`)
    db.transaction(() => {
      db.exec(`DELETE FROM ai_conversations_fts;`)
      db.exec(`
        INSERT INTO ai_conversations_fts(entityId, title, content)
        SELECT c.id, c.title, COALESCE((
          SELECT group_concat(m.content, ' ')
          FROM ai_messages m WHERE m.conversationId = c.id
        ), '')
        FROM ai_conversations c;
      `)
      db.exec(`DELETE FROM ai_prompt_templates_fts;`)
      db.exec(`
        INSERT INTO ai_prompt_templates_fts(entityId, title, content)
        SELECT id, name, description || ' ' || body FROM ai_prompt_templates;
      `)
      db.exec(`DELETE FROM assets_fts;`)
      db.exec(`
        INSERT INTO assets_fts(entityId, title, content)
        SELECT a.id, a.label, a.originalName || ' ' || a.comments || ' ' || COALESCE((
          SELECT group_concat(tag, ' ') FROM asset_tags WHERE assetId = a.id
        ), '')
        FROM assets a;
      `)
    })()
  }
}

/** Drop the back-compat `documentId` column for non-document rows. */
function normalizeRows(rows: SearchResult[]): SearchResult[] {
  return rows.map(row =>
    row.entityType === 'document'
      ? row
      : { ...row, documentId: undefined }
  )
}
