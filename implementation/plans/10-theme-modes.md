---
file: 10-theme-modes.md
description: Implement light/dark/system theme switching
version: 0.1.0
created: 2026-05-29
modified: 2026-05-29
author: antigravity
status: placeholder
---

# 10 — Theme Modes (Light / Dark / System)

## Problem

`1-shell-spec.md` §4 specifies "light / dark / system out of the box." Currently only a dark palette exists in `tokens.css` — one `:root` block, no `prefers-color-scheme` media query, no light palette, no system toggle, no user preference persistence.

The `ctx.theme.token(name)` method works (returns `var(--name)`), so the plumbing is correct — it's the palette and switching that are missing.

## Spec References

- `1-shell-spec.md` §4 (theming — modes)
- `0-shell-platform-spec.md` §12 Q9 (documented token API, light/dark/system)

## Scope

### Must

- Define a **light palette** alongside the existing dark palette in `tokens.css`
- Apply palettes via a `data-theme="light|dark"` attribute on `<html>` (or equivalent)
- **System mode**: respect `prefers-color-scheme` media query by default
- Add a **theme selector** to the Settings panel (Light / Dark / System)
- Persist the user's theme preference via `shell_settings`
- Electron `nativeTheme.themeSource` should match the user's choice

### Should

- Smooth transition on theme switch (brief CSS transition on `background-color`, `color`)
- Ensure all shell components and all 7 module views look correct in both palettes
- `BrowserWindow` `backgroundColor` should update to avoid flash on launch

### Could

- User-buildable custom themes (spec says "later that just work" — defer)
- Per-workspace theme override

## Files Likely Affected

- `src/renderer/src/styles/tokens.css` — light palette block, system media query
- `src/renderer/src/shell/SettingsPanel.svelte` — theme selector UI
- `src/main/index.ts` — `nativeTheme.themeSource` sync
- `src/main/ipc.ts` or `src/main/core/settings.ts` — persist theme preference
- All module views — visual QA pass for both palettes
