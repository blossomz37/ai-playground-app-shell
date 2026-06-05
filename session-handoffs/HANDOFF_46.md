# Session Handoff 46 - Gray Theme

_Session: 2026-06-05 - Slice: Plan 31 Gray theme_

## What Changed

- Added `gray` as a fourth explicit `ThemeMode`.
- Added `app-shell/src/main/core/theme.ts` for theme validation, Electron native-theme mapping, and startup background selection.
- Mapped Gray to Electron native `light` mode while preserving App Shell's explicit `data-theme="gray"` token path.
- Added `[data-theme="gray"]` to `app-shell/src/renderer/src/styles/tokens.css` using Carlo's 12-step gray palette.
- Added Gray to `AppearanceSettings.svelte`.
- Extended `SHELL_CAPTURE_THEME=gray` support and capture-time preference seeding.
- Extended `npm run audit:contrast` to audit Dark, Light, and Gray.
- Recorded the outcome in `implementation/plans/31-gray-theme.md` and refreshed the short orientation notes.

## Decisions

- Kept Light, Dark, and System behavior unchanged.
- Did not add Radix or replace the existing token API.
- Kept danger, success, and warning tokens colored for scanability.
- Used a stronger gray table-border token than the quiet separator scale because the measured non-text contrast target required it.

## Evidence

- Svelte autofixer clean for `AppearanceSettings.svelte`.
- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- `SHELL_CAPTURE_THEME=gray SHELL_CAPTURE=../implementation/screenshots/gray-theme-after-2026-06-05.png npm run start`
- `SHELL_CAPTURE_THEME=gray SHELL_CAPTURE_SETTINGS=1 SHELL_CAPTURE=../implementation/screenshots/gray-theme-settings-after-2026-06-05.png npm run start`
- Screenshot evidence:
  - `implementation/screenshots/gray-theme-after-2026-06-05.png`
  - `implementation/screenshots/gray-theme-settings-after-2026-06-05.png`

## Next Recommended Action

- If committing this slice, keep it as one logical unit: Gray theme code, Plan 31 outcome, screenshots, and this handoff.
- Before starting the next slice, read the newest numbered handoff and check `git status --short --branch`.
