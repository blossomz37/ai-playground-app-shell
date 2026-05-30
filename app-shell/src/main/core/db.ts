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
      updatedAt   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id              TEXT PRIMARY KEY,
      workspaceId     TEXT NOT NULL REFERENCES workspaces(id),
      parentId        TEXT,
      kind            TEXT NOT NULL,
      title           TEXT NOT NULL,
      sortOrder       INTEGER NOT NULL DEFAULT 0,
      content         TEXT NOT NULL DEFAULT '',
      contentFormat   TEXT NOT NULL DEFAULT 'markdown',
      sourcePath      TEXT,
      sourceChecksum  TEXT,
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
}

function seedIfEmpty(db: Database.Database): void {
  const { n } = db.prepare('SELECT COUNT(*) as n FROM workspaces').get() as { n: number }
  if (n > 0) return

  const now = new Date().toISOString()

  db.prepare(
    'INSERT INTO workspaces (id, name, type, root, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
  ).run('ws-default', 'My Workspace', 'authoring', app.getPath('home'), now, now)

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
