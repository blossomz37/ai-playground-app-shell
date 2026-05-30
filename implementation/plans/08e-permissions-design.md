---
file: 08e-permissions-design.md
description: Design document for the permission/capability enforcement service (deferred)
version: 0.1.0
created: 2026-05-29
modified: 2026-05-29
author: antigravity
status: deferred
---

# 08e — Permission / Capability Service — Design Document

> **Status: Deferred** per Q3 — author + small trusted circle only. No enforcement code.
> This document describes what enforcement **would** look like when multi-author
> or untrusted modules arrive.

## Current State

- Module manifests **declare** capabilities today (`permissions: Capability[]`).
- The `Capability` type is defined in `module-contract.ts`:
  - `fs.read`, `fs.write`, `documents.read`, `documents.write`, `secrets.read`,
    `ai.invoke`, `net.fetch`, `jobs.submit`
- No enforcement exists — all modules run with full access.

## Enforcement Design

### Principle: Declare → Verify → Gate

1. **Declare** — Module manifest lists required capabilities in `permissions[]`.
2. **Verify** — At registration/activation time, the shell checks declarations
   against a known-good list. Unknown capabilities → warning/rejection.
3. **Gate** — At runtime, each service call checks the calling module's
   declared capabilities before proceeding.

### Where Gates Would Be Inserted

| Service | Capability | Gate Location |
|---------|-----------|---------------|
| `ctx.fs.readFile()` | `fs.read` | `createFileSystemService()` wrapper |
| `ctx.fs.writeFile()` | `fs.write` | `createFileSystemService()` wrapper |
| `ctx.fs.remove()` | `fs.write` | `createFileSystemService()` wrapper |
| `ctx.documents.open()` | `documents.read` | `createModuleContext()` documents section |
| `ctx.documents.save()` | `documents.write` | `createModuleContext()` documents section |
| `ctx.secrets.get()` | `secrets.read` | `createModuleContext()` secrets section |
| `ctx.jobs.submit()` | `jobs.submit` | `createModuleContext()` jobs section |

### Implementation Sketch

```typescript
// core/permissions.ts (future)
export function checkCapability(
  moduleId: string,
  declared: Capability[],
  required: Capability
): void {
  if (!declared.includes(required)) {
    throw new PermissionDeniedError(moduleId, required)
  }
}

// In context factory:
fs: {
  async readFile(path) {
    checkCapability(moduleId, manifest.permissions, 'fs.read')
    return fsService.readFile(path)
  },
  // ...
}
```

### User-Facing Prompt (Future)

When a module first tries to use a capability:
1. Shell shows a native-like permission dialog:
   *"Module 'AI Chat' wants to read your secrets. Allow?"*
2. User grants/denies.
3. Decision persisted in `shell_settings` under `permissions.<moduleId>`.
4. Module author can still declare the capability upfront (no prompt),
   but untrusted modules would always prompt.

### Migration Path

1. Capabilities are already declared in manifests (today).
2. Add `core/permissions.ts` with `checkCapability()` — a single function.
3. Wrap each service call in the context factory with a capability check.
4. Add persistence for user grant/deny decisions.
5. Add the prompt UI.

This is intentionally staged so enforcement can be added incrementally
without touching the module contract or manifest schema.

## When to Implement

- When the project accepts third-party or untrusted modules.
- When multi-author collaboration is introduced.
- Not before Q3 per the resolved decision in `0-shell-platform-spec.md` §12 Q3.
