# Session Handoff 53 - Demo Mode and No-Mock Defaults

_Session: 2026-06-06 - Slice: Demo Mode / no-mock defaults_

## What Changed

- Implemented the no-training-wheels default policy from the chat plan.
- Commits landed:
  - `6bef004` - Fix empty project startup
  - `5904d3d` - Add demo mode setting
  - `ee774a8` - Disable browser demo content by default
  - `a6e1e5c` - Disable mock AI by default
  - `189acd9` - Fix browser preview bootstrap
- Empty app startup now seeds only a neutral workspace, not default Act/Chapter/Scene manuscript rows.
- Documents empty states now tell the user: `Create or import a project to begin.`
- Settings now exposes shell-level Demo Mode through `demoMode.enabled`, default off.
- Browser preview now starts empty when Demo Mode is off and restores demo documents/templates/mock AI only when Demo Mode is on.
- AI provider defaults now prefer `openai-responses`; `mock-local` is hidden/blocked unless Demo Mode is enabled.
- Missing live credentials now return `Save an API key before using AI tools.`

## Decisions

- Kept a minimal neutral workspace because current workspace contracts expect an active workspace.
- Did not delete or migrate existing user/demo content.
- Kept `mock-local` in the codebase for explicit demos, tests, training, and screenshots.
- Used browser-preview local setting persistence so Demo Mode survives reloads during Codex/iPad-style validation.
- Kept the LAN/iPad boundary from `HANDOFF_52`: LAN browser preview is possible, but full real app behavior still needs a future local API/client slice.

## Evidence

- Svelte autofixer clean during implementation for touched Svelte components.
- Validation commands run during the sequence:
  - `npm run typecheck`
  - `npm run build`
  - `git diff --check`
- Browser proof:
  - `implementation/screenshots/demo-mode-off-empty-preview-after-2026-06-06.png`
  - `implementation/screenshots/demo-mode-settings-off-after-2026-06-06.png`
  - `implementation/screenshots/demo-mode-settings-on-after-2026-06-06.png`
  - `implementation/screenshots/demo-mode-on-browser-preview-after-2026-06-06.png`
  - `implementation/screenshots/ai-missing-key-no-mock-after-2026-06-06.png`

## Known Notes

- Screenshots under `implementation/screenshots/` are ignored evidence files and are not part of git commits.
- Existing databases that already contain sample/demo documents remain unchanged.
- AI live-ready proof depends on a saved `OPENAI_API_KEY`; this session verified the missing-key path and Demo Mode mock path, not a live OpenAI call.
- Browser preview is still a shim and does not provide Electron preload IPC, SQLite persistence, safeStorage secrets, real file access, or Electron webview behavior.

## Next Recommended Action

- If Carlo wants existing sample rows removed from his current database, plan a dry-run-first cleanup script or UI action and ask for explicit confirmation before deleting anything.
- If the iPad workflow becomes a priority, plan the local API/client slice separately so the iPad path can use real shell services instead of the browser preview shim.
