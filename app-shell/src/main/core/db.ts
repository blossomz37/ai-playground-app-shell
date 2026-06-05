import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

let db: Database.Database

export function getDb(): Database.Database {
  return db
}

export function initDb(): void {
  const dbPath = path.join(app.getPath('userData'), 'shell.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  seedIfEmpty(db)
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'default',
      root        TEXT NOT NULL,
      createdAt   TEXT NOT NULL,
      updatedAt   TEXT NOT NULL,
      lastOpenedAt TEXT,
      archivedAt  TEXT
    );

    CREATE TABLE IF NOT EXISTS documents (
      id              TEXT PRIMARY KEY,
      workspaceId     TEXT NOT NULL REFERENCES workspaces(id),
      parentId        TEXT,
      kind            TEXT NOT NULL,
      title           TEXT NOT NULL,
      icon            TEXT,
      sortOrder       INTEGER NOT NULL DEFAULT 0,
      content         TEXT NOT NULL DEFAULT '',
      contentFormat   TEXT NOT NULL DEFAULT 'markdown',
      sourcePath      TEXT,
      sourceChecksum  TEXT,
      metadataJson    TEXT,
      createdAt       TEXT NOT NULL,
      updatedAt       TEXT NOT NULL,
      archivedAt      TEXT
    );

    CREATE TABLE IF NOT EXISTS document_versions (
      id            TEXT PRIMARY KEY,
      documentId    TEXT NOT NULL REFERENCES documents(id),
      content       TEXT NOT NULL,
      contentFormat TEXT NOT NULL DEFAULT 'markdown',
      createdAt     TEXT NOT NULL,
      label         TEXT
    );

    CREATE TABLE IF NOT EXISTS shell_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS secrets (
      name  TEXT PRIMARY KEY,
      value BLOB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_providers (
      id                    TEXT PRIMARY KEY,
      workspaceId           TEXT NOT NULL REFERENCES workspaces(id),
      name                  TEXT NOT NULL,
      secretName            TEXT,
      baseUrl               TEXT,
      defaultModel          TEXT NOT NULL,
      availableModelsJson   TEXT NOT NULL,
      supportsStreaming     INTEGER NOT NULL DEFAULT 0,
      supportsTools         INTEGER NOT NULL DEFAULT 0,
      createdAt             TEXT NOT NULL,
      updatedAt             TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id          TEXT PRIMARY KEY,
      workspaceId TEXT NOT NULL REFERENCES workspaces(id),
      title       TEXT NOT NULL,
      createdAt   TEXT NOT NULL,
      updatedAt   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id             TEXT PRIMARY KEY,
      workspaceId    TEXT NOT NULL REFERENCES workspaces(id),
      conversationId TEXT NOT NULL REFERENCES ai_conversations(id),
      role           TEXT NOT NULL,
      content        TEXT NOT NULL,
      runId          TEXT,
      createdAt      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_prompt_templates (
      id                  TEXT PRIMARY KEY,
      workspaceId          TEXT NOT NULL REFERENCES workspaces(id),
      name                TEXT NOT NULL,
      description         TEXT NOT NULL DEFAULT '',
      body                TEXT NOT NULL,
      variablesJson       TEXT NOT NULL,
      defaultModel        TEXT NOT NULL,
      defaultTemperature  REAL NOT NULL DEFAULT 0.7,
      contextPolicyJson   TEXT NOT NULL,
      tagsJson            TEXT NOT NULL,
      createdAt           TEXT NOT NULL,
      updatedAt           TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_runs (
      id            TEXT PRIMARY KEY,
      workspaceId   TEXT NOT NULL REFERENCES workspaces(id),
      moduleId      TEXT NOT NULL,
      originType    TEXT NOT NULL,
      originId      TEXT NOT NULL,
      providerId    TEXT NOT NULL,
      model         TEXT NOT NULL,
      temperature   REAL NOT NULL,
      status        TEXT NOT NULL,
      inputSummary  TEXT NOT NULL,
      outputText    TEXT NOT NULL DEFAULT '',
      error         TEXT,
      createdAt     TEXT NOT NULL,
      completedAt   TEXT
    );

    CREATE TABLE IF NOT EXISTS ai_context_packs (
      id                TEXT PRIMARY KEY,
      workspaceId        TEXT NOT NULL REFERENCES workspaces(id),
      runId              TEXT NOT NULL REFERENCES ai_runs(id),
      createdAt          TEXT NOT NULL,
      candidatesJson     TEXT NOT NULL,
      renderedText       TEXT NOT NULL,
      tokenEstimate      INTEGER NOT NULL,
      packingStrategy    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_prompt_chains (
      id          TEXT PRIMARY KEY,
      workspaceId TEXT NOT NULL REFERENCES workspaces(id),
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      stepsJson   TEXT NOT NULL,
      createdAt   TEXT NOT NULL,
      updatedAt   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_chain_runs (
      id          TEXT PRIMARY KEY,
      workspaceId TEXT NOT NULL REFERENCES workspaces(id),
      chainId     TEXT NOT NULL REFERENCES ai_prompt_chains(id),
      status      TEXT NOT NULL,
      startedAt   TEXT NOT NULL,
      completedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS ai_chain_step_runs (
      id              TEXT PRIMARY KEY,
      workspaceId      TEXT NOT NULL REFERENCES workspaces(id),
      chainRunId       TEXT NOT NULL REFERENCES ai_chain_runs(id),
      stepId           TEXT NOT NULL,
      runId            TEXT REFERENCES ai_runs(id),
      inputSnapshot    TEXT NOT NULL,
      outputSnapshot   TEXT NOT NULL DEFAULT '',
      status           TEXT NOT NULL,
      stepOrder        INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_proposals (
      id               TEXT PRIMARY KEY,
      workspaceId       TEXT NOT NULL REFERENCES workspaces(id),
      runId             TEXT NOT NULL REFERENCES ai_runs(id),
      targetDocumentId  TEXT NOT NULL REFERENCES documents(id),
      proposalType      TEXT NOT NULL,
      sourceText        TEXT NOT NULL,
      proposedText      TEXT NOT NULL,
      status            TEXT NOT NULL,
      createdAt         TEXT NOT NULL,
      resolvedAt        TEXT
    );

    CREATE TABLE IF NOT EXISTS ai_tool_calls (
      id          TEXT PRIMARY KEY,
      workspaceId TEXT NOT NULL REFERENCES workspaces(id),
      runId       TEXT NOT NULL REFERENCES ai_runs(id),
      toolName    TEXT NOT NULL,
      inputJson   TEXT NOT NULL,
      outputJson  TEXT NOT NULL DEFAULT '{}',
      status      TEXT NOT NULL,
      createdAt   TEXT NOT NULL,
      completedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS job_runs (
      id          TEXT PRIMARY KEY,
      workspaceId TEXT NOT NULL REFERENCES workspaces(id),
      moduleId    TEXT NOT NULL,
      type        TEXT NOT NULL,
      title       TEXT NOT NULL,
      status      TEXT NOT NULL,
      progress    INTEGER NOT NULL DEFAULT 0,
      message     TEXT NOT NULL DEFAULT '',
      error       TEXT,
      payloadJson TEXT NOT NULL DEFAULT '{}',
      createdAt   TEXT NOT NULL,
      startedAt   TEXT,
      completedAt TEXT,
      updatedAt   TEXT NOT NULL
    );

    -- FTS5 virtual table for full-text search on documents
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      title, content, content='documents', content_rowid='rowid'
    );

    -- Triggers to keep FTS index in sync with documents table
    CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents
    BEGIN
      INSERT INTO documents_fts(rowid, title, content)
      VALUES (NEW.rowid, NEW.title, NEW.content);
    END;

    CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents
    BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, title, content)
      VALUES ('delete', OLD.rowid, OLD.title, OLD.content);
      INSERT INTO documents_fts(rowid, title, content)
      VALUES (NEW.rowid, NEW.title, NEW.content);
    END;

    CREATE TRIGGER IF NOT EXISTS documents_fts_delete AFTER DELETE ON documents
    BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, title, content)
      VALUES ('delete', OLD.rowid, OLD.title, OLD.content);
    END;
  `)

  ensureColumn(db, 'workspaces', 'lastOpenedAt', 'TEXT')
  ensureColumn(db, 'workspaces', 'archivedAt', 'TEXT')
  ensureColumn(db, 'documents', 'icon', 'TEXT')
  ensureColumn(db, 'documents', 'metadataJson', 'TEXT')
  const now = new Date().toISOString()
  db.prepare('UPDATE workspaces SET lastOpenedAt = COALESCE(lastOpenedAt, updatedAt, createdAt, ?)').run(now)
}

function ensureColumn(db: Database.Database, table: string, column: string, definition: string): void {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (rows.some(row => row.name === column)) return
  db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run()
}

function seedIfEmpty(db: Database.Database): void {
  const { n } = db.prepare('SELECT COUNT(*) as n FROM workspaces').get() as { n: number }
  if (n > 0) return

  const now = new Date().toISOString()

  db.prepare(
    'INSERT INTO workspaces (id, name, type, root, createdAt, updatedAt, lastOpenedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run('ws-default', 'My Workspace', 'authoring', app.getPath('home'), now, now, now)

  const insert = db.prepare(`
    INSERT INTO documents
      (id, workspaceId, parentId, kind, title, sortOrder, content, contentFormat, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'markdown', ?, ?)
  `)

  const docs: [string, string, string | null, string, string, number, string, string, string][] = [
    ['doc-folder-act1', 'ws-default', null,              'folder',  'Act I',                    0, '',                                                     now, now],
    ['doc-chapter-1',   'ws-default', 'doc-folder-act1', 'chapter', 'Chapter 1 — The Arrival',  0, '# Chapter 1 — The Arrival\n\nShe stepped off the train into a city that had forgotten her name.', now, now],
    ['doc-scene-1a',    'ws-default', 'doc-chapter-1',   'scene',   'Platform 9',               0, 'The crowd parted around her like water.\n\nShe checked the address again.',                         now, now],
    ['doc-scene-1b',    'ws-default', 'doc-chapter-1',   'scene',   'First Impressions',        1, 'The hotel was smaller than the photos suggested.',                                                   now, now],
    ['doc-folder-act2', 'ws-default', null,              'folder',  'Act II',                   1, '',                                                     now, now],
    ['doc-chapter-2',   'ws-default', 'doc-folder-act2', 'chapter', 'Chapter 2 — Rising Tension', 0, '# Chapter 2 — Rising Tension\n\nThree days later, the letters began.',                           now, now],
  ]

  for (const row of docs) insert.run(...row)
}
