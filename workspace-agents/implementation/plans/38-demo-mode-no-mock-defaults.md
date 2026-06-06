# Demo Mode and No-Mock Defaults - Implementation Record

## Summary

Implemented the no-training-wheels default policy from the chat plan. App Shell now boots without seeded manuscript sample documents, browser preview defaults to empty project state, Settings has an explicit Demo Mode switch, and AI tools no longer silently fall back to `mock-local` unless Demo Mode is enabled.

## Implemented Slices

### Slice 1 - Empty Project State Foundation

- Commit: `6bef004 Fix empty project startup`
- `seedIfEmpty` now creates only the minimum neutral workspace row and does not insert default Act/Chapter/Scene documents.
- Documents empty states now use the standardized project-gated copy: `Create or import a project to begin.`
- Existing non-empty databases are untouched.

### Slice 2 - Demo Mode Setting

- Commit: `5904d3d Add demo mode setting`
- Added shared key `demoMode.enabled` and Settings UI control.
- Demo Mode defaults to off.
- Browser preview persists the setting in local storage through the browser shell shim.
- Electron capture can force the setting with `SHELL_CAPTURE_DEMO_MODE=0|1`.

### Slice 3 - Browser Preview Without Default Demo Content

- Commit: `ee774a8 Disable browser demo content by default`
- Browser preview starts with neutral empty state when Demo Mode is off.
- Demo documents, templates, mock provider, and mock output are available only when Demo Mode is on.
- Browser preview remains a shim for UI validation, not the full Electron/SQLite/preload app.

### Slice 4 - No Mock AI by Default

- Commit: `a6e1e5c Disable mock AI by default`
- AI provider defaults now prefer `openai-responses` when Demo Mode is off.
- `mock-local` provider rows and starter templates are only seeded/exposed when Demo Mode is on.
- Missing live credentials return `Save an API key before using AI tools.`
- Existing AI run history remains readable.

### Browser Bootstrap Fix

- Commit: `189acd9 Fix browser preview bootstrap`
- Moved browser-shell installation before the dynamic Svelte app import so browser preview can install `window.shell` before components evaluate.

## Validation

- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Browser preview at `http://localhost:5183/` with Demo Mode off.
- Browser preview with Demo Mode on and sample document opened.
- AI Chat run attempt with Demo Mode off and no API key.
- Svelte autofixer clean for touched Svelte components during implementation.

## Evidence

- `implementation/screenshots/demo-mode-off-empty-preview-after-2026-06-06.png`
- `implementation/screenshots/demo-mode-settings-off-after-2026-06-06.png`
- `implementation/screenshots/demo-mode-settings-on-after-2026-06-06.png`
- `implementation/screenshots/demo-mode-on-browser-preview-after-2026-06-06.png`
- `implementation/screenshots/ai-missing-key-no-mock-after-2026-06-06.png`

## Cleanup Notes

No existing user data or existing demo rows are deleted automatically. If cleanup is needed later, implement it as a dry-run-first script or UI action and require explicit confirmation before deleting rows.

## LAN/iPad Boundary

The earlier LAN/iPad discussion still applies. Browser preview can be LAN-bound for review, but full real app behavior still needs a future local API/client slice because the current iPad-visible path uses `browser-shell`, not Electron preload IPC, SQLite services, safeStorage secrets, file access, or Electron webviews.

## Rollback Notes

- Restore old document seeding by reverting the `seedIfEmpty` changes.
- Remove the Settings section and ignore `demoMode.enabled` to disable the toggle.
- Restore unconditional `DEMO_DOCS` initialization in `browser-shell.ts` to recover old browser-preview demos.
- Restore `mock-local` provider ordering/default selection to recover old mock AI fallback.
