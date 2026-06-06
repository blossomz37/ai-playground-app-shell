import { createHash, randomUUID } from 'crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import path from 'path'
import type {
  AssetDocumentLinkParams,
  AssetDocumentLinkUpdateParams,
  AssetExportParams,
  AssetExportResult,
  AssetMediaType,
  AssetMetadata,
  AssetRecord,
  AssetUpdatePatch,
  AssetWorkspaceLinkParams,
  AssetWorkspaceLinkUpdateParams,
  Doc
} from '@shared/module-contract'
import { metadataForImportedAsset } from '../assets/metadata'
import { getDb } from './db'

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/g
const PROJECT_LINK_ROLES = new Set(['reference', 'cover', 'research', 'marketing', 'moodboard', 'other'])
const DOCUMENT_LINK_RELATIONS = new Set(['reference', 'illustrates', 'source', 'cover', 'research', 'other'])

type AssetRow = {
  id: string
  label: string
  originalName: string
  filePath: string | null
  extension: string
  mimeType: string
  mediaType: AssetMediaType
  sizeBytes: number
  fileCreatedAt: string | null
  fileModifiedAt: string | null
  importedAt: string
  updatedAt: string
  archivedAt: string | null
  checksum: string | null
  thumbnailDataUrl: string | null
  metadataJson: string
  comments: string
}

export const assets = {
  list(params: { workspaceId: string; includeArchived?: boolean }): AssetRecord[] {
    const rows = getDb()
      .prepare(`
        SELECT assets.*
        FROM assets
        JOIN asset_workspace_links ON asset_workspace_links.assetId = assets.id
        WHERE asset_workspace_links.workspaceId = ?
          ${params.includeArchived ? '' : 'AND assets.archivedAt IS NULL'}
        GROUP BY assets.id
        ORDER BY assets.archivedAt IS NOT NULL ASC, datetime(assets.importedAt) DESC, assets.label COLLATE NOCASE
      `)
      .all(params.workspaceId) as AssetRow[]

    return rows.map(rowToAsset)
  },

  open(id: string): AssetRecord | null {
    const row = getDb().prepare('SELECT * FROM assets WHERE id = ?').get(id) as AssetRow | undefined
    return row ? rowToAsset(row) : null
  },

  async importFiles(params: { workspaceId: string; filePaths?: string[] }): Promise<AssetRecord[]> {
    const filePaths = (params.filePaths ?? [])
      .map(filePath => path.resolve(filePath))
      .filter(filePath => path.basename(filePath) !== '.DS_Store')
      .filter(filePath => existsSync(filePath) && statSync(filePath).isFile())

    if (filePaths.length === 0) return []

    const imported: AssetRecord[] = []
    for (const filePath of filePaths) {
      imported.push(await importFile(params.workspaceId, filePath))
    }
    return imported
  },

  update(id: string, patch: AssetUpdatePatch): AssetRecord {
    const current = this.open(id)
    if (!current) throw new Error(`Asset not found: ${id}`)

    const now = new Date().toISOString()
    const nextLabel = patch.label?.trim() || current.label
    const nextComments = patch.comments ?? current.comments
    const nextTags = patch.tags ? normalizeTags(patch.tags) : current.tags

    getDb().transaction(() => {
      getDb()
        .prepare('UPDATE assets SET label = ?, comments = ?, updatedAt = ? WHERE id = ?')
        .run(nextLabel, nextComments, now, id)
      replaceTags(id, nextTags)
    })()

    return this.open(id) as AssetRecord
  },

  addWorkspaceLink(params: AssetWorkspaceLinkParams): AssetRecord {
    ensureAsset(params.assetId)
    const role = normalizeProjectRole(params.role)
    const now = new Date().toISOString()
    getDb()
      .prepare('INSERT OR IGNORE INTO asset_workspace_links (assetId, workspaceId, role, createdAt) VALUES (?, ?, ?, ?)')
      .run(params.assetId, params.workspaceId, role, now)
    return this.open(params.assetId) as AssetRecord
  },

  updateWorkspaceLink(params: AssetWorkspaceLinkUpdateParams): AssetRecord {
    ensureAsset(params.assetId)
    const fromRole = requireNonEmpty(params.fromRole, 'Workspace link role')
    const toRole = normalizeProjectRole(params.toRole)
    const now = new Date().toISOString()
    getDb().transaction(() => {
      getDb()
        .prepare('DELETE FROM asset_workspace_links WHERE assetId = ? AND workspaceId = ? AND role = ?')
        .run(params.assetId, params.workspaceId, fromRole)
      getDb()
        .prepare('INSERT OR IGNORE INTO asset_workspace_links (assetId, workspaceId, role, createdAt) VALUES (?, ?, ?, ?)')
        .run(params.assetId, params.workspaceId, toRole, now)
    })()
    return this.open(params.assetId) as AssetRecord
  },

  removeWorkspaceLink(params: AssetWorkspaceLinkParams): AssetRecord {
    ensureAsset(params.assetId)
    const role = requireNonEmpty(params.role, 'Workspace link role')
    getDb()
      .prepare('DELETE FROM asset_workspace_links WHERE assetId = ? AND workspaceId = ? AND role = ?')
      .run(params.assetId, params.workspaceId, role)
    return this.open(params.assetId) as AssetRecord
  },

  addDocumentLink(params: AssetDocumentLinkParams): AssetRecord {
    ensureAsset(params.assetId)
    ensureDocument(params.documentId)
    const relationType = normalizeDocumentRelation(params.relationType)
    const now = new Date().toISOString()
    getDb().transaction(() => {
      getDb()
        .prepare('DELETE FROM asset_document_links WHERE assetId = ? AND documentId = ?')
        .run(params.assetId, params.documentId)
      getDb()
        .prepare('INSERT INTO asset_document_links (assetId, documentId, relationType, createdAt) VALUES (?, ?, ?, ?)')
        .run(params.assetId, params.documentId, relationType, now)
    })()
    return this.open(params.assetId) as AssetRecord
  },

  updateDocumentLink(params: AssetDocumentLinkUpdateParams): AssetRecord {
    ensureAsset(params.assetId)
    ensureDocument(params.documentId)
    const fromRelationType = requireNonEmpty(params.fromRelationType, 'Document link relation')
    const toRelationType = normalizeDocumentRelation(params.toRelationType)
    const now = new Date().toISOString()
    getDb().transaction(() => {
      getDb()
        .prepare('DELETE FROM asset_document_links WHERE assetId = ? AND documentId = ? AND relationType = ?')
        .run(params.assetId, params.documentId, fromRelationType)
      getDb()
        .prepare('DELETE FROM asset_document_links WHERE assetId = ? AND documentId = ?')
        .run(params.assetId, params.documentId)
      getDb()
        .prepare('INSERT INTO asset_document_links (assetId, documentId, relationType, createdAt) VALUES (?, ?, ?, ?)')
        .run(params.assetId, params.documentId, toRelationType, now)
    })()
    return this.open(params.assetId) as AssetRecord
  },

  removeDocumentLink(params: AssetDocumentLinkParams): AssetRecord {
    ensureAsset(params.assetId)
    const relationType = requireNonEmpty(params.relationType, 'Document link relation')
    getDb()
      .prepare('DELETE FROM asset_document_links WHERE assetId = ? AND documentId = ? AND relationType = ?')
      .run(params.assetId, params.documentId, relationType)
    return this.open(params.assetId) as AssetRecord
  },

  archive(id: string): AssetRecord {
    const now = new Date().toISOString()
    getDb()
      .prepare('UPDATE assets SET archivedAt = COALESCE(archivedAt, ?), updatedAt = ? WHERE id = ?')
      .run(now, now, id)
    const asset = this.open(id)
    if (!asset) throw new Error(`Asset not found: ${id}`)
    return asset
  },

  restore(id: string): AssetRecord {
    const now = new Date().toISOString()
    getDb()
      .prepare('UPDATE assets SET archivedAt = NULL, updatedAt = ? WHERE id = ?')
      .run(now, id)
    const asset = this.open(id)
    if (!asset) throw new Error(`Asset not found: ${id}`)
    return asset
  },

  delete(id: string): { id: string } {
    getDb().prepare('DELETE FROM assets WHERE id = ?').run(id)
    return { id }
  },

  exportAssets(ids: string[], params: AssetExportParams = {}): AssetExportResult {
    if (!params.targetDir) throw new Error('Asset export targetDir is required.')
    const targetDir = path.resolve(params.targetDir)
    mkdirSync(targetDir, { recursive: true })

    const selected = ids.map(id => this.open(id)).filter(Boolean) as AssetRecord[]
    const filesWritten: string[] = []
    const missingFiles: AssetExportResult['missingFiles'] = []
    const usedPaths = new Set<string>()

    for (const asset of selected) {
      if (!asset.filePath || !existsSync(asset.filePath)) {
        missingFiles.push({
          assetId: asset.id,
          filePath: asset.filePath,
          reason: asset.filePath ? 'Source file not found.' : 'No source file path recorded.'
        })
        continue
      }

      const fileName = safeName(path.basename(asset.filePath) || asset.originalName || asset.label)
      const outputPath = uniquePath(targetDir, fileName, '', usedPaths)
      copyFileSync(asset.filePath, outputPath)
      filesWritten.push(outputPath)
    }

    const manifestPath = path.join(targetDir, 'assets-manifest.json')
    writeFileSync(manifestPath, JSON.stringify({
      exportedAt: new Date().toISOString(),
      assets: selected,
      filesWritten,
      missingFiles
    }, null, 2), 'utf8')

    return {
      targetDir,
      filesWritten,
      manifestPath,
      missingFiles
    }
  }
}

export function copyAssetWorkspaceLinks(sourceWorkspaceId: string, targetWorkspaceId: string, now: string): void {
  getDb()
    .prepare(`
      INSERT OR IGNORE INTO asset_workspace_links (assetId, workspaceId, role, createdAt)
      SELECT assetId, ?, role, ?
      FROM asset_workspace_links
      WHERE workspaceId = ?
    `)
    .run(targetWorkspaceId, now, sourceWorkspaceId)
}

export function deleteAssetWorkspaceLinks(workspaceId: string): void {
  getDb().prepare('DELETE FROM asset_workspace_links WHERE workspaceId = ?').run(workspaceId)
}

async function importFile(workspaceId: string, filePath: string): Promise<AssetRecord> {
  const db = getDb()
  const stat = statSync(filePath)
  const now = new Date().toISOString()
  const extension = path.extname(filePath).replace(/^\./, '').toLowerCase()
  const originalName = path.basename(filePath)
  const metadata = await metadataForImportedAsset(filePath, extension)
  const normalizedMetadata = metadataForRecord(metadata)
  const thumbnailDataUrl = metadata.image?.thumbnailDataUrl ?? metadata.pdf?.thumbnailDataUrl ?? null
  const existing = db.prepare('SELECT * FROM assets WHERE filePath = ?').get(filePath) as AssetRow | undefined

  db.transaction(() => {
    if (existing) {
      db.prepare(`
        UPDATE assets
        SET originalName = ?, extension = ?, mimeType = ?, mediaType = ?, sizeBytes = ?,
            fileCreatedAt = ?, fileModifiedAt = ?, updatedAt = ?, archivedAt = NULL,
            checksum = ?, thumbnailDataUrl = ?, metadataJson = ?
        WHERE id = ?
      `).run(
        originalName,
        extension,
        mimeTypeForExtension(extension),
        mediaTypeForExtension(extension),
        stat.size,
        stat.birthtime.toISOString(),
        stat.mtime.toISOString(),
        now,
        checksumForFile(filePath),
        thumbnailDataUrl,
        JSON.stringify(normalizedMetadata),
        existing.id
      )
      linkWorkspace(existing.id, workspaceId, now)
      return
    }

    const id = `asset-${randomUUID()}`
    db.prepare(`
      INSERT INTO assets
        (id, label, originalName, filePath, extension, mimeType, mediaType, sizeBytes, fileCreatedAt,
         fileModifiedAt, importedAt, updatedAt, archivedAt, checksum, thumbnailDataUrl, metadataJson, comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, '')
    `).run(
      id,
      originalName,
      originalName,
      filePath,
      extension,
      mimeTypeForExtension(extension),
      mediaTypeForExtension(extension),
      stat.size,
      stat.birthtime.toISOString(),
      stat.mtime.toISOString(),
      now,
      now,
      checksumForFile(filePath),
      thumbnailDataUrl,
      JSON.stringify(normalizedMetadata)
    )
    linkWorkspace(id, workspaceId, now)
  })()

  const row = db.prepare('SELECT * FROM assets WHERE filePath = ?').get(filePath) as AssetRow
  return rowToAsset(row)
}

function rowToAsset(row: AssetRow): AssetRecord {
  return {
    id: row.id,
    label: row.label,
    originalName: row.originalName,
    filePath: row.filePath,
    extension: row.extension,
    mimeType: row.mimeType,
    mediaType: row.mediaType,
    sizeBytes: Number(row.sizeBytes),
    fileCreatedAt: row.fileCreatedAt,
    fileModifiedAt: row.fileModifiedAt,
    importedAt: row.importedAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
    checksum: row.checksum,
    thumbnailDataUrl: row.thumbnailDataUrl,
    metadata: parseMetadata(row.metadataJson),
    comments: row.comments,
    tags: tagsForAsset(row.id),
    workspaceLinks: workspaceLinksForAsset(row.id),
    documentLinks: documentLinksForAsset(row.id)
  }
}

function metadataForRecord(metadata: Awaited<ReturnType<typeof metadataForImportedAsset>>): AssetMetadata {
  if (metadata.image) {
    return {
      width: metadata.image.width,
      height: metadata.image.height
    }
  }
  if (metadata.pdf) {
    return {
      pageCount: metadata.pdf.pageCount,
      title: metadata.pdf.title,
      author: metadata.pdf.author
    }
  }
  return {}
}

function linkWorkspace(assetId: string, workspaceId: string, createdAt: string): void {
  getDb()
    .prepare('INSERT OR IGNORE INTO asset_workspace_links (assetId, workspaceId, role, createdAt) VALUES (?, ?, ?, ?)')
    .run(assetId, workspaceId, 'imported', createdAt)
}

function replaceTags(assetId: string, tags: string[]): void {
  const db = getDb()
  db.prepare('DELETE FROM asset_tags WHERE assetId = ?').run(assetId)
  const insert = db.prepare('INSERT OR IGNORE INTO asset_tags (assetId, tag) VALUES (?, ?)')
  for (const tag of tags) insert.run(assetId, tag)
}

function tagsForAsset(assetId: string): string[] {
  const rows = getDb()
    .prepare('SELECT tag FROM asset_tags WHERE assetId = ? ORDER BY tag COLLATE NOCASE')
    .all(assetId) as Array<{ tag: string }>
  return rows.map(row => row.tag)
}

function workspaceLinksForAsset(assetId: string): AssetRecord['workspaceLinks'] {
  return getDb()
    .prepare('SELECT workspaceId, role, createdAt FROM asset_workspace_links WHERE assetId = ? ORDER BY createdAt')
    .all(assetId) as AssetRecord['workspaceLinks']
}

function documentLinksForAsset(assetId: string): AssetRecord['documentLinks'] {
  return getDb()
    .prepare('SELECT documentId, relationType, createdAt FROM asset_document_links WHERE assetId = ? ORDER BY createdAt')
    .all(assetId) as AssetRecord['documentLinks']
}

function parseMetadata(value: string): AssetMetadata {
  try {
    const parsed = JSON.parse(value) as AssetMetadata
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const tag of tags) {
    const value = tag.trim()
    const key = value.toLowerCase()
    if (!value || seen.has(key)) continue
    seen.add(key)
    normalized.push(value)
  }
  return normalized
}

function ensureAsset(assetId: string): void {
  const row = getDb().prepare('SELECT id FROM assets WHERE id = ?').get(assetId) as { id: string } | undefined
  if (!row) throw new Error(`Asset not found: ${assetId}`)
}

function ensureDocument(documentId: string): Doc {
  const row = getDb().prepare('SELECT * FROM documents WHERE id = ? AND archivedAt IS NULL').get(documentId) as Doc | undefined
  if (!row) throw new Error(`Document not found: ${documentId}`)
  return row
}

function normalizeProjectRole(role: string): string {
  const value = requireNonEmpty(role, 'Workspace link role')
  if (!PROJECT_LINK_ROLES.has(value)) throw new Error(`Unsupported workspace link role: ${value}`)
  return value
}

function normalizeDocumentRelation(relationType: string): string {
  const value = requireNonEmpty(relationType, 'Document link relation')
  if (!DOCUMENT_LINK_RELATIONS.has(value)) throw new Error(`Unsupported document link relation: ${value}`)
  return value
}

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${label} is required.`)
  return normalized
}

function checksumForFile(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function mimeTypeForExtension(extension: string): string {
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    epub: 'application/epub+zip',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    aiff: 'audio/aiff',
    flac: 'audio/flac',
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return mimeTypes[extension] ?? 'application/octet-stream'
}

function mediaTypeForExtension(extension: string): AssetMediaType {
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) return 'image'
  if (extension === 'pdf') return 'pdf'
  if (['mp3', 'm4a', 'wav', 'aiff', 'flac'].includes(extension)) return 'audio'
  if (extension === 'epub') return 'epub'
  if (['txt', 'md', 'markdown', 'docx'].includes(extension)) return 'document'
  return 'other'
}

function safeName(name: string): string {
  const parsed = path.parse(name)
  const base = parsed.name
    .trim()
    .replace(INVALID_FILENAME_CHARS, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .replace(/^\.+/g, '')
  const extension = parsed.ext.replace(INVALID_FILENAME_CHARS, '')
  return `${base || 'asset'}${extension}`
}

function uniquePath(outputDir: string, fileName: string, extension: string, usedPaths: Set<string>): string {
  const parsed = path.parse(fileName)
  const base = parsed.name || 'asset'
  const ext = extension || parsed.ext
  let suffix = 1
  let candidate = path.join(outputDir, `${base}${ext}`)
  while (usedPaths.has(candidate) || existsSync(candidate)) {
    suffix += 1
    candidate = path.join(outputDir, `${base}-${suffix}${ext}`)
  }
  usedPaths.add(candidate)
  return candidate
}
