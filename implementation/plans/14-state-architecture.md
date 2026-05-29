---
file: 14-state-architecture.md
description: Migrate module state to framework-agnostic TS slices (contract D2 boundary)
version: 0.1.0
created: 2026-05-29
modified: 2026-05-29
author: antigravity
status: placeholder
---

# 14 — State Architecture (D2 Boundary)

## Problem

`3-module-contract.md` §4 specifies the "internal/external boundary (D2)":

> "The state slice and all module logic are plain framework-agnostic TypeScript. The Svelte views are thin subscribers that reach that logic **only** through `ctx` and the slice's subscribe interface — never by importing logic into a component. Held that way, the logic runs in-process today and can move behind the local API for a LAN/iPad client later (Q10) by relocating it, not rewriting it."

Currently, module state lives directly in Svelte `$state` runes and `writable` stores inside renderer components and `store/index.ts`. Views import logic directly. This couples all state management to the Svelte runtime, making Q10 (LAN/iPad client) require a rewrite rather than a relocation.

## Spec References

- `3-module-contract.md` §4 (D2 internal/external boundary)
- `0-shell-platform-spec.md` §12 Q5 ("Core logic lives in framework-agnostic TypeScript outside the renderer")
- `0-shell-platform-spec.md` §12 Q10 ("future iPad/LAN HTML client can reach core features")

## Scope

### Must

- Define the **state slice pattern**: a plain-TS class/object per module that owns all module state, exposes a subscribe interface, and has no Svelte dependency
- Migrate the **Documents module** first (largest, most complex):
  - Document tree, selected doc, dirty state, editor content → plain-TS slice
  - `NavView.svelte`, `MainView.svelte`, `InspectorView.svelte` become thin subscribers
- State slices are created in `activate(ctx)` and accessible via `ctx` — not via direct imports

### Should

- Migrate all 7 modules to the pattern
- Migrate shell-level state (`activeModuleId`, editor settings, toast queue) to plain-TS where it crosses the main/renderer boundary
- Define a standard subscribe interface (observable / callback pattern) that Svelte components can `$derive` from

### Could

- Extract state slices into a `src/core/` directory (outside `renderer/`) to physically enforce the boundary
- Add a lint rule or architecture test that prevents `*.svelte` files from importing from `src/core/` directly (must go through `ctx`)

## Design Considerations

- Svelte 5's `$state` rune is compiler-scoped — it can't be used in plain `.ts` files outside the Svelte compiler. The slice must use a vanilla pattern (class with callbacks, or a minimal observable).
- The subscribe interface should be thin enough that a future React or vanilla client can consume it without Svelte.
- This is a refactor, not a feature — existing behavior should be preserved exactly.

## Files Likely Affected

- `src/renderer/src/store/index.ts` — refactor to thin adapter over plain-TS slices
- `src/main/modules/documents/index.ts` — create state slice in `activate()`
- `src/renderer/src/modules/documents/*.svelte` — subscribe to slice via `ctx`
- All other module views — same pattern migration
- Possibly new `src/core/` or `src/shared/slices/` directory
