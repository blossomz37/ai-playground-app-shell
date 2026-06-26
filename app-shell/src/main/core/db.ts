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
      nodeType        TEXT NOT NULL DEFAULT 'document',
      kind            TEXT,
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

    CREATE TABLE IF NOT EXISTS document_annotation_sessions (
      id                TEXT PRIMARY KEY,
      workspaceId       TEXT NOT NULL REFERENCES workspaces(id),
      documentId        TEXT NOT NULL REFERENCES documents(id),
      documentVersionId TEXT,
      title             TEXT NOT NULL,
      createdAt         TEXT NOT NULL,
      updatedAt         TEXT NOT NULL,
      archivedAt        TEXT
    );

    CREATE TABLE IF NOT EXISTS document_annotations (
      id          TEXT PRIMARY KEY,
      sessionId   TEXT NOT NULL REFERENCES document_annotation_sessions(id),
      workspaceId TEXT NOT NULL REFERENCES workspaces(id),
      documentId  TEXT NOT NULL REFERENCES documents(id),
      note        TEXT NOT NULL,
      color       TEXT NOT NULL DEFAULT 'yellow',
      status      TEXT NOT NULL DEFAULT 'active',
      targetJson  TEXT NOT NULL,
      createdAt   TEXT NOT NULL,
      updatedAt   TEXT NOT NULL,
      resolvedAt  TEXT,
      deletedAt   TEXT
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
      updatedAt   TEXT NOT NULL,
      archivedAt  TEXT
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
      isProtected         INTEGER NOT NULL DEFAULT 0,
      createdAt           TEXT NOT NULL,
      updatedAt           TEXT NOT NULL,
      archivedAt          TEXT
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

    CREATE TABLE IF NOT EXISTS assets (
      id               TEXT PRIMARY KEY,
      label            TEXT NOT NULL,
      originalName     TEXT NOT NULL,
      filePath         TEXT,
      extension        TEXT NOT NULL DEFAULT '',
      mimeType         TEXT NOT NULL DEFAULT 'application/octet-stream',
      mediaType        TEXT NOT NULL DEFAULT 'other',
      sizeBytes        INTEGER NOT NULL DEFAULT 0,
      fileCreatedAt    TEXT,
      fileModifiedAt   TEXT,
      importedAt       TEXT NOT NULL,
      updatedAt        TEXT NOT NULL,
      archivedAt       TEXT,
      checksum         TEXT,
      thumbnailDataUrl TEXT,
      metadataJson     TEXT NOT NULL DEFAULT '{}',
      comments         TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS asset_tags (
      assetId TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      tag     TEXT NOT NULL,
      PRIMARY KEY (assetId, tag)
    );

    CREATE TABLE IF NOT EXISTS asset_workspace_links (
      assetId     TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      workspaceId TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      role        TEXT NOT NULL DEFAULT 'imported',
      createdAt   TEXT NOT NULL,
      PRIMARY KEY (assetId, workspaceId, role)
    );

    CREATE TABLE IF NOT EXISTS asset_document_links (
      assetId      TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      documentId   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      relationType TEXT NOT NULL DEFAULT 'reference',
      createdAt    TEXT NOT NULL,
      PRIMARY KEY (assetId, documentId, relationType)
    );

  `)

  ensureColumn(db, 'workspaces', 'lastOpenedAt', 'TEXT')
  ensureColumn(db, 'workspaces', 'archivedAt', 'TEXT')
  migrateDocumentsNodeType(db)
  ensureColumn(db, 'documents', 'icon', 'TEXT')
  ensureColumn(db, 'documents', 'metadataJson', 'TEXT')
  ensureColumn(db, 'ai_conversations', 'archivedAt', 'TEXT')
  ensureColumn(db, 'ai_prompt_templates', 'isProtected', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumn(db, 'ai_prompt_templates', 'archivedAt', 'TEXT')
  setupDocumentFts(db)
  setupEntityFts(db)
  const now = new Date().toISOString()
  db.prepare('UPDATE workspaces SET lastOpenedAt = COALESCE(lastOpenedAt, updatedAt, createdAt, ?)').run(now)
}

function migrateDocumentsNodeType(db: Database.Database): void {
  const columns = db.prepare('PRAGMA table_info(documents)').all() as Array<{ name: string; notnull: number }>
  const hasNodeType = columns.some(column => column.name === 'nodeType')
  const kindColumn = columns.find(column => column.name === 'kind')
  if (hasNodeType && kindColumn?.notnull === 0) return

  const hasIcon = columns.some(column => column.name === 'icon')
  const hasMetadataJson = columns.some(column => column.name === 'metadataJson')
  const hasArchivedAt = columns.some(column => column.name === 'archivedAt')
  db.exec(`
    DROP TRIGGER IF EXISTS documents_fts_insert;
    DROP TRIGGER IF EXISTS documents_fts_update;
    DROP TRIGGER IF EXISTS documents_fts_delete;
    DROP TABLE IF EXISTS documents_fts;
  `)

  const nodeTypeExpression = hasNodeType
    ? "CASE WHEN kind = 'folder' THEN 'folder' ELSE COALESCE(NULLIF(nodeType, ''), 'document') END"
    : "CASE WHEN kind = 'folder' THEN 'folder' ELSE 'document' END"

  db.pragma('foreign_keys = OFF')
  try {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE documents_new (
          id              TEXT PRIMARY KEY,
          workspaceId     TEXT NOT NULL REFERENCES workspaces(id),
          parentId        TEXT,
          nodeType        TEXT NOT NULL DEFAULT 'document',
          kind            TEXT,
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
      `)

      db.exec(`
        INSERT INTO documents_new
          (id, workspaceId, parentId, nodeType, kind, title, icon, sortOrder, content, contentFormat, sourcePath, sourceChecksum, metadataJson, createdAt, updatedAt, archivedAt)
        SELECT
          id,
          workspaceId,
          parentId,
          ${nodeTypeExpression},
          CASE WHEN kind = 'folder' THEN NULL ELSE kind END,
          title,
          ${hasIcon ? 'icon' : 'NULL'},
          sortOrder,
          content,
          contentFormat,
          sourcePath,
          sourceChecksum,
          ${hasMetadataJson ? 'metadataJson' : 'NULL'},
          createdAt,
          updatedAt,
          ${hasArchivedAt ? 'archivedAt' : 'NULL'}
        FROM documents;
      `)

      db.exec(`
        DROP TABLE documents;
        ALTER TABLE documents_new RENAME TO documents;
      `)
    })()
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

function setupDocumentFts(db: Database.Database): void {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      title, content, content='documents', content_rowid='rowid'
    );

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

/**
 * FTS5 indexes for the non-document entity types surfaced by universal search:
 * AI conversations (title + message content), prompt templates
 * (name + description + body), and assets (label + originalName + comments + tags).
 *
 * Unlike `documents_fts` these are *standalone* (own-content) FTS5 tables keyed by
 * an UNINDEXED entity id column.  Standalone tables accept ordinary
 * INSERT/UPDATE/DELETE, so triggers maintain them with plain SQL — no external
 * 'delete' command juggling.  Conversation content aggregates `ai_messages`, so its
 * row is rebuilt whenever a message or the conversation title changes.
 *
 * The whole setup is idempotent (IF NOT EXISTS everywhere) and back-compatible:
 * existing databases gain the tables/triggers and are back-filled from current
 * rows the first time they are empty.
 */
function setupEntityFts(db: Database.Database): void {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS ai_conversations_fts USING fts5(
      entityId UNINDEXED, title, content
    );

    CREATE TRIGGER IF NOT EXISTS ai_conversations_fts_insert AFTER INSERT ON ai_conversations
    BEGIN
      INSERT INTO ai_conversations_fts(entityId, title, content)
      VALUES (NEW.id, NEW.title, '');
    END;

    CREATE TRIGGER IF NOT EXISTS ai_conversations_fts_update AFTER UPDATE ON ai_conversations
    BEGIN
      UPDATE ai_conversations_fts SET title = NEW.title WHERE entityId = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS ai_conversations_fts_delete AFTER DELETE ON ai_conversations
    BEGIN
      DELETE FROM ai_conversations_fts WHERE entityId = OLD.id;
    END;

    -- Keep the conversation's aggregated message content in sync.
    CREATE TRIGGER IF NOT EXISTS ai_messages_fts_insert AFTER INSERT ON ai_messages
    BEGIN
      UPDATE ai_conversations_fts
      SET content = (
        SELECT COALESCE(group_concat(content, ' '), '')
        FROM ai_messages WHERE conversationId = NEW.conversationId
      )
      WHERE entityId = NEW.conversationId;
    END;

    CREATE TRIGGER IF NOT EXISTS ai_messages_fts_update AFTER UPDATE ON ai_messages
    BEGIN
      UPDATE ai_conversations_fts
      SET content = (
        SELECT COALESCE(group_concat(content, ' '), '')
        FROM ai_messages WHERE conversationId = NEW.conversationId
      )
      WHERE entityId = NEW.conversationId;
    END;

    CREATE TRIGGER IF NOT EXISTS ai_messages_fts_delete AFTER DELETE ON ai_messages
    BEGIN
      UPDATE ai_conversations_fts
      SET content = (
        SELECT COALESCE(group_concat(content, ' '), '')
        FROM ai_messages WHERE conversationId = OLD.conversationId
      )
      WHERE entityId = OLD.conversationId;
    END;

    CREATE VIRTUAL TABLE IF NOT EXISTS ai_prompt_templates_fts USING fts5(
      entityId UNINDEXED, title, content
    );

    CREATE TRIGGER IF NOT EXISTS ai_prompt_templates_fts_insert AFTER INSERT ON ai_prompt_templates
    BEGIN
      INSERT INTO ai_prompt_templates_fts(entityId, title, content)
      VALUES (NEW.id, NEW.name, NEW.description || ' ' || NEW.body);
    END;

    CREATE TRIGGER IF NOT EXISTS ai_prompt_templates_fts_update AFTER UPDATE ON ai_prompt_templates
    BEGIN
      UPDATE ai_prompt_templates_fts
      SET title = NEW.name, content = NEW.description || ' ' || NEW.body
      WHERE entityId = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS ai_prompt_templates_fts_delete AFTER DELETE ON ai_prompt_templates
    BEGIN
      DELETE FROM ai_prompt_templates_fts WHERE entityId = OLD.id;
    END;

    CREATE VIRTUAL TABLE IF NOT EXISTS assets_fts USING fts5(
      entityId UNINDEXED, title, content
    );

    CREATE TRIGGER IF NOT EXISTS assets_fts_insert AFTER INSERT ON assets
    BEGIN
      INSERT INTO assets_fts(entityId, title, content)
      VALUES (NEW.id, NEW.label, NEW.originalName || ' ' || NEW.comments);
    END;

    CREATE TRIGGER IF NOT EXISTS assets_fts_update AFTER UPDATE ON assets
    BEGIN
      UPDATE assets_fts
      SET title = NEW.label,
          content = NEW.originalName || ' ' || NEW.comments || ' ' || (
            SELECT COALESCE(group_concat(tag, ' '), '') FROM asset_tags WHERE assetId = NEW.id
          )
      WHERE entityId = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS assets_fts_delete AFTER DELETE ON assets
    BEGIN
      DELETE FROM assets_fts WHERE entityId = OLD.id;
    END;

    -- Asset tags feed the content column; refresh on tag add/remove.
    CREATE TRIGGER IF NOT EXISTS asset_tags_fts_insert AFTER INSERT ON asset_tags
    BEGIN
      UPDATE assets_fts
      SET content = (
        SELECT a.originalName || ' ' || a.comments || ' ' || (
          SELECT COALESCE(group_concat(tag, ' '), '') FROM asset_tags WHERE assetId = NEW.assetId
        )
        FROM assets a WHERE a.id = NEW.assetId
      )
      WHERE entityId = NEW.assetId;
    END;

    CREATE TRIGGER IF NOT EXISTS asset_tags_fts_delete AFTER DELETE ON asset_tags
    BEGIN
      UPDATE assets_fts
      SET content = (
        SELECT a.originalName || ' ' || a.comments || ' ' || (
          SELECT COALESCE(group_concat(tag, ' '), '') FROM asset_tags WHERE assetId = OLD.assetId
        )
        FROM assets a WHERE a.id = OLD.assetId
      )
      WHERE entityId = OLD.assetId;
    END;
  `)

  backfillEntityFts(db)
}

/**
 * One-time population of the entity FTS tables from existing rows.  Idempotent:
 * each table is only back-filled while it is empty, so re-running migrate() (or
 * opening an already-migrated DB) is a no-op.
 */
function backfillEntityFts(db: Database.Database): void {
  const isEmpty = (table: string): boolean =>
    (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n === 0

  db.transaction(() => {
    if (isEmpty('ai_conversations_fts')) {
      db.exec(`
        INSERT INTO ai_conversations_fts(entityId, title, content)
        SELECT c.id, c.title, COALESCE((
          SELECT group_concat(m.content, ' ')
          FROM ai_messages m WHERE m.conversationId = c.id
        ), '')
        FROM ai_conversations c;
      `)
    }
    if (isEmpty('ai_prompt_templates_fts')) {
      db.exec(`
        INSERT INTO ai_prompt_templates_fts(entityId, title, content)
        SELECT id, name, description || ' ' || body FROM ai_prompt_templates;
      `)
    }
    if (isEmpty('assets_fts')) {
      db.exec(`
        INSERT INTO assets_fts(entityId, title, content)
        SELECT a.id, a.label, a.originalName || ' ' || a.comments || ' ' || COALESCE((
          SELECT group_concat(tag, ' ') FROM asset_tags WHERE assetId = a.id
        ), '')
        FROM assets a;
      `)
    }
  })()
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
}
