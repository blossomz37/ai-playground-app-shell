---
file: 07-lazy-activation.md
description: Fix eager activation — implement the spec's lazy 4-state lifecycle
version: 0.1.0
created: 2026-05-29
modified: 2026-05-29
author: antigravity
status: placeholder
---

# 07 — Lazy Activation Lifecycle

## Problem

All 7 modules are registered, enabled, **and activated** in a single loop at startup (`main/index.ts` L86–90). The spec's 4-state lifecycle — installed → declared → enabled → activated — is collapsed into eager activation. The `ActivationRule` types (`userEnable`, `workspaceType`, `fileType`, `command`) exist on `ModuleManifest` but are never evaluated by the registry.

This violates:
- `0-shell-platform-spec.md` §6: "Activation must be lazy where possible to reduce startup cost."
- `3-module-contract.md` §6: "Off by default. Nothing activates at startup; the core build stands alone." / "Enabled ≠ activated. Enabling persists intent; activation is deferred to first use."

## Spec References

- `0-shell-platform-spec.md` §6 (activation model)
- `3-module-contract.md` §6 (lifecycle diagram)
- `3-module-contract.md` §3 (`ActivationRule` type)

## Scope

### Must

- `moduleRegistry` evaluates `ActivationRule[]` from the manifest before calling `activate()`
- Separate `enable()` from `activate()` — enabling persists intent (shell-level data), activation is deferred
- First-use triggers: clicking a module's rail icon, executing one of its commands, opening a matching file type, or matching workspace type
- Persist enabled-module list across restarts (currently not persisted — `shell_settings` or new table)
- The shell must render rail entries and list commands in the palette **from the manifest alone**, before `activate()` runs

### Should

- Deactivation on user toggle-off (call `deactivate()`, dispose all `Disposable`s)
- Startup performance: measure cold-launch time before/after

### Could

- Module enable/disable UI (toggle in settings or rail right-click)

## Files Likely Affected

- `src/main/modules/registry.ts` — activation-rule evaluator, deferred activation
- `src/main/index.ts` — remove the eager loop; register + enable only
- `src/main/core/db.ts` — persist enabled-module state
- `src/renderer/src/shell/ActivityRail.svelte` — render from manifest (enabled but not activated)
- `src/renderer/src/store/commands.ts` — palette lists manifest commands pre-activation
