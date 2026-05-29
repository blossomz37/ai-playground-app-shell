---
file: 08-core-services.md
description: Implement the 5 missing/stub core services from §4
version: 0.1.0
created: 2026-05-29
modified: 2026-05-29
author: antigravity
status: placeholder
---

# 08 — Missing Core Services

## Problem

`0-shell-platform-spec.md` §4 lists 10 core services. Five are missing or stubs:

| Service | Current State |
|---------|--------------|
| **File system service** | ❌ No abstraction — modules could bypass the shell and call Node `fs` directly |
| **Search / index service** | ❌ Not started |
| **Layout manager** | ❌ No runtime save/restore of panel sizes or visibility |
| **Permission / capability service** | ⏳ Explicitly deferred (Q3) — declarations exist, enforcement does not |
| **Secrets / credentials service** | 🟡 `ctx.secrets` interface exists, body is `return undefined` / `return []` — no Electron `safeStorage` wiring |

## Spec References

- `0-shell-platform-spec.md` §4 (core services list)
- `0-shell-platform-spec.md` §12 Q12 (secrets — `safeStorage`, OS-keychain, never plaintext)
- `3-module-contract.md` §3 (`Capability` type), §5 (`ctx.secrets`)
- `1-shell-spec.md` §2 (layout manager — resize/toggle/persistence)

## Scope

### 8a — File System Service

- Abstract `fs` behind a shell-owned service exposed on `ModuleContext`
- Scoped to workspace root — modules cannot escape
- Pairs with the capability declarations (`fs.read`, `fs.write`)

### 8b — Search / Index Service

- Full-text search across `documents.content` (SQLite FTS5)
- Hook for modules to register searchable content types
- Expose on `ModuleContext` and the command palette (Cmd+F / Cmd+Shift+F)

### 8c — Layout Manager

- Persist panel sizes and visibility state to `shell_settings`
- Restore on launch
- Expose `shell.layout.toggle(zone)` / `shell.layout.resize(zone, px)` as commands

### 8d — Secrets / Credentials Service

- Wire `ctx.secrets.get(name)` to Electron `safeStorage.encryptString()` / `decryptString()`
- Store encrypted blobs in a `secrets` table (name + encrypted value)
- Add manage-secrets UI to the Settings panel (add/edit/delete named entries)
- `list()` returns names only — never values to the renderer

### 8e — Permission / Capability Service

- Explicitly deferred per Q3 — but document what enforcement would look like
- Currently a no-op; keep it that way until multi-author or untrusted modules arrive

## Files Likely Affected

- `src/main/core/` — new `filesystem.ts`, `search.ts`, `layout.ts`, `secrets.ts`
- `src/shared/module-contract.ts` — extend `ModuleContext` for fs and search
- `src/main/modules/context.ts` — wire new services into the context factory
- `src/main/core/db.ts` — `secrets` table, possibly FTS5 virtual table
- `src/renderer/src/shell/SettingsPanel.svelte` — secrets management UI
