import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import type { Doc, DocumentExportResult } from '@shared/module-contract'

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/g

export function exportDocumentSubtree(rootDoc: Doc, subtreeDocs: Doc[], targetDir: string): DocumentExportResult {
  const resolvedTarget = path.resolve(targetDir)
  mkdirSync(resolvedTarget, { recursive: true })

  const childrenByParent = new Map<string | null, Doc[]>()
  for (const doc of subtreeDocs) {
    const siblings = childrenByParent.get(doc.parentId) ?? []
    siblings.push(doc)
    childrenByParent.set(doc.parentId, siblings)
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort(compareDocuments)
  }

  const result: DocumentExportResult = {
    rootDocumentId: rootDoc.id,
    targetDir: resolvedTarget,
    filesWritten: [],
    foldersWritten: []
  }

  const usedPaths = new Set<string>()
  if (rootDoc.kind === 'folder') {
    const rootDir = uniquePath(resolvedTarget, safeName(rootDoc.title), '', usedPaths)
    mkdirSync(rootDir, { recursive: true })
    result.foldersWritten.push(rootDir)
    exportChildren(rootDoc.id, rootDir, childrenByParent, usedPaths, result)
  } else {
    writeDocument(rootDoc, resolvedTarget, usedPaths, result)
  }

  return result
}

function exportChildren(
  parentId: string,
  outputDir: string,
  childrenByParent: Map<string | null, Doc[]>,
  usedPaths: Set<string>,
  result: DocumentExportResult
): void {
  const children = childrenByParent.get(parentId) ?? []
  for (const child of children) {
    if (child.kind === 'folder') {
      const folderPath = uniquePath(outputDir, safeName(child.title), '', usedPaths)
      mkdirSync(folderPath, { recursive: true })
      result.foldersWritten.push(folderPath)
      exportChildren(child.id, folderPath, childrenByParent, usedPaths, result)
      continue
    }

    writeDocument(child, outputDir, usedPaths, result)
  }
}

function writeDocument(doc: Doc, outputDir: string, usedPaths: Set<string>, result: DocumentExportResult): void {
  const filePath = uniquePath(outputDir, safeName(doc.title), '.md', usedPaths)
  writeFileSync(filePath, doc.content, 'utf8')
  result.filesWritten.push(filePath)
}

function safeName(title: string): string {
  const normalized = title
    .trim()
    .replace(INVALID_FILENAME_CHARS, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .replace(/^\.+/g, '')

  return normalized || 'untitled'
}

function uniquePath(outputDir: string, baseName: string, extension: string, usedPaths: Set<string>): string {
  let suffix = 1
  let candidate = path.join(outputDir, `${baseName}${extension}`)
  while (usedPaths.has(candidate) || existsSync(candidate)) {
    suffix += 1
    candidate = path.join(outputDir, `${baseName}-${suffix}${extension}`)
  }
  usedPaths.add(candidate)
  return candidate
}

function compareDocuments(left: Doc, right: Doc): number {
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
  return left.createdAt.localeCompare(right.createdAt)
}
