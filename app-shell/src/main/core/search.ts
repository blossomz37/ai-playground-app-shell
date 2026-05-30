// ──────────────────────────────────────────────
// File:        search.ts
// Description: Full-text search service using SQLite FTS5
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      antigravity
// ──────────────────────────────────────────────

import type { SearchResult } from '@shared/module-contract'
import { getDb } from './db'

const DEFAULT_LIMIT = 20

/**
 * Full-text search service backed by the `documents_fts` FTS5 virtual table.
 *
 * The FTS table is kept in sync with `documents` via INSERT/UPDATE/DELETE
 * triggers (see db.ts migration).  Queries use FTS5 `MATCH` with the
 * `snippet()` auxiliary function for contextual excerpts.
 */
export const searchService = {
  /**
   * Search documents by content and title.
   *
   * @param query   - FTS5 search expression (simple words or phrase queries)
   * @param workspaceId - Filter to a specific workspace
   * @param limit   - Max results (default 20)
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
        SELECT
          d.id           AS documentId,
          d.title        AS title,
          snippet(documents_fts, 1, '<mark>', '</mark>', '…', 32) AS snippet,
          rank           AS rank
        FROM documents_fts
        JOIN documents d ON d.rowid = documents_fts.rowid
        WHERE documents_fts MATCH ?
          AND d.workspaceId = ?
          AND d.archivedAt IS NULL
        ORDER BY rank
        LIMIT ?
      `)
      .all(sanitised, workspaceId, limit) as SearchResult[]

    return rows
  },

  /**
   * Full rebuild of the FTS index from the documents table.
   * Use if the index gets out of sync (e.g. after a manual DB edit).
   */
  rebuildIndex(): void {
    const db = getDb()
    db.exec(`
      INSERT INTO documents_fts(documents_fts) VALUES('rebuild');
    `)
  }
}
