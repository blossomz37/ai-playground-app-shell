// ──────────────────────────────────────────────
// File:        filesystem.ts
// Description: Sandboxed file system service scoped to workspace root
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      antigravity
// ──────────────────────────────────────────────

import { readFile, writeFile, readdir, stat, mkdir, rm, access } from 'fs/promises'
import path from 'path'

/** Thrown when a module attempts to access a path outside the workspace root. */
class PathEscapeError extends Error {
  constructor(requested: string, root: string) {
    super(`Path escapes workspace root: "${requested}" is outside "${root}"`)
    this.name = 'PathEscapeError'
  }
}

export interface FsEntry {
  name: string
  isDir: boolean
}

export interface FsStat {
  size: number
  mtime: string
}

export interface FileSystemService {
  readFile(relativePath: string): Promise<string>
  writeFile(relativePath: string, content: string): Promise<void>
  readDir(relativePath: string): Promise<FsEntry[]>
  stat(relativePath: string): Promise<FsStat | null>
  exists(relativePath: string): Promise<boolean>
  mkdir(relativePath: string): Promise<void>
  remove(relativePath: string): Promise<void>
}

/**
 * Resolve a relative path against the workspace root, rejecting any traversal
 * that escapes the root (e.g. `../../etc/passwd`).
 */
function safePath(root: string, relativePath: string): string {
  // Normalise and resolve to an absolute path
  const resolved = path.resolve(root, relativePath)

  // Ensure the resolved path is within the root (exact match or child)
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new PathEscapeError(relativePath, root)
  }

  return resolved
}

/**
 * Create a workspace-scoped filesystem service.
 * Every operation resolves paths relative to `workspaceRoot` and rejects
 * any attempt to escape via `../` traversal.
 */
export function createFileSystemService(workspaceRoot: string): FileSystemService {
  const root = path.resolve(workspaceRoot)

  return {
    async readFile(relativePath: string): Promise<string> {
      const abs = safePath(root, relativePath)
      return readFile(abs, 'utf-8')
    },

    async writeFile(relativePath: string, content: string): Promise<void> {
      const abs = safePath(root, relativePath)
      // Ensure parent directory exists
      await mkdir(path.dirname(abs), { recursive: true })
      await writeFile(abs, content, 'utf-8')
    },

    async readDir(relativePath: string): Promise<FsEntry[]> {
      const abs = safePath(root, relativePath)
      const entries = await readdir(abs, { withFileTypes: true })
      return entries.map(e => ({ name: e.name, isDir: e.isDirectory() }))
    },

    async stat(relativePath: string): Promise<FsStat | null> {
      const abs = safePath(root, relativePath)
      try {
        const s = await stat(abs)
        return { size: s.size, mtime: s.mtime.toISOString() }
      } catch {
        return null
      }
    },

    async exists(relativePath: string): Promise<boolean> {
      const abs = safePath(root, relativePath)
      try {
        await access(abs)
        return true
      } catch {
        return false
      }
    },

    async mkdir(relativePath: string): Promise<void> {
      const abs = safePath(root, relativePath)
      await mkdir(abs, { recursive: true })
    },

    async remove(relativePath: string): Promise<void> {
      const abs = safePath(root, relativePath)
      await rm(abs, { recursive: true, force: true })
    }
  }
}
