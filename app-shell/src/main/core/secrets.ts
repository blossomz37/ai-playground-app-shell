// ──────────────────────────────────────────────
// File:        secrets.ts
// Description: Secrets/credentials service backed by Electron safeStorage
// Version:     0.1.0
// Created:     2026-05-29
// Modified:    2026-05-29
// Author:      antigravity
// ──────────────────────────────────────────────

import { safeStorage } from 'electron'
import { getDb } from './db'

/**
 * Secrets/credentials service.
 *
 * Stores user-named secret values (e.g. `OPENAI_API_KEY`) encrypted via
 * Electron `safeStorage` (OS keychain on macOS).  The encrypted bytes are
 * persisted in the `secrets` SQLite table as BLOBs — values never appear
 * in plaintext on disk.
 *
 * Spec: 0-shell-platform-spec.md §4, §12 Q12.
 */
export const secretsService = {
  /** Check if the OS encryption backend is available. */
  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable()
  },

  /** Retrieve and decrypt a named secret. Returns undefined if not found. */
  get(name: string): string | undefined {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available — cannot decrypt secrets')
    }

    const row = getDb()
      .prepare('SELECT value FROM secrets WHERE name = ?')
      .get(name) as { value: Buffer } | undefined

    if (!row) return undefined

    return safeStorage.decryptString(Buffer.from(row.value))
  },

  /** Encrypt and store a named secret.  Creates or updates. */
  set(name: string, value: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available — cannot store secrets')
    }

    const encrypted = safeStorage.encryptString(value)

    getDb()
      .prepare('INSERT OR REPLACE INTO secrets (name, value) VALUES (?, ?)')
      .run(name, encrypted)
  },

  /** Remove a named secret. */
  delete(name: string): void {
    getDb()
      .prepare('DELETE FROM secrets WHERE name = ?')
      .run(name)
  },

  /** List all secret names.  Never returns values. */
  list(): string[] {
    const rows = getDb()
      .prepare('SELECT name FROM secrets ORDER BY name')
      .all() as Array<{ name: string }>

    return rows.map(r => r.name)
  }
}
