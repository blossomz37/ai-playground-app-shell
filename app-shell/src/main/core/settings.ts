import { getDb } from './db'
import { events } from './events'
import type { Disposable } from '@shared/module-contract'

export function createSettingsStore(namespace: string) {
  const prefix = `${namespace}.`

  return {
    get<T>(key: string): T | undefined {
      const row = getDb()
        .prepare('SELECT value FROM shell_settings WHERE key = ?')
        .get(prefix + key) as { value: string } | undefined
      return row ? (JSON.parse(row.value) as T) : undefined
    },

    set<T>(key: string, value: T): void {
      getDb()
        .prepare('INSERT OR REPLACE INTO shell_settings (key, value) VALUES (?, ?)')
        .run(prefix + key, JSON.stringify(value))
      events.emit(`settings:changed:${prefix}${key}`, value)
    },

    onChange<T>(key: string, cb: (v: T) => void): Disposable {
      return events.on(`settings:changed:${prefix}${key}`, cb as (payload: unknown) => void)
    }
  }
}
