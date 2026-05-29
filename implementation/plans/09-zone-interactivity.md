---
file: 09-zone-interactivity.md
description: Wire zone interactivity — resize, toggle, collapse, zen mode
version: 0.1.0
created: 2026-05-29
modified: 2026-05-29
author: antigravity
status: placeholder
---

# 09 — Zone Interactivity

## Problem

`1-shell-spec.md` §2 specifies five "built-in zone features" the shell must support:

1. **Resize zones** — ❌ Grid columns are fixed CSS values (`48px 240px 1fr 280px`)
2. **Hide / toggle zones** — ❌ No visibility toggles for sidebar or inspector
3. **Assign hotkeys** — 🟡 Command keybindings exist; no hotkeys for zone toggle
4. **Collapsible trees / sections / cards** — ❌ Nav trees are flat; inspector has no collapse
5. **Zen mode** — ❌ Referenced in `2-modules-overview.md` §3 as "zen state" — not implemented

None of these are wired. The layout is a static CSS grid that never changes after mount.

## Spec References

- `1-shell-spec.md` §2 (layout model, built-in zone features)
- `0-shell-platform-spec.md` §12 Q7 (fixed zones, resize/hide/toggle)
- `2-modules-overview.md` §3 ("zen state" listed as shell-owned chrome)

## Scope

### Must

- **Drag-to-resize** sidebar and inspector panels (CSS grid + pointer events)
- **Toggle sidebar** (Cmd+B) and **toggle inspector** (Cmd+I) commands
- Persist panel sizes and visibility across restarts (pairs with 08c layout manager)
- **Collapsible tree nodes** in nav views (Documents folder/chapter expand/collapse)

### Should

- **Zen mode** — hide everything except the main pane (Cmd+Shift+Z or similar)
- Collapsible inspector sections (for multi-section inspectors per `InspectorSection[]`)
- Smooth transition animations on toggle/resize

### Could

- Double-click divider to reset to default width
- Min/max width constraints on panels

## Files Likely Affected

- `src/renderer/src/shell/AppShell.svelte` — dynamic grid columns, resize handles
- `src/renderer/src/shell/Sidebar.svelte` — toggle visibility
- `src/renderer/src/shell/Inspector.svelte` — toggle visibility, collapsible sections
- `src/renderer/src/store/` — new `layout.ts` store (panel sizes, visibility, zen state)
- `src/renderer/src/store/commands.ts` — register toggle/zen commands
- `src/renderer/src/modules/documents/NavView.svelte` — collapsible tree nodes
