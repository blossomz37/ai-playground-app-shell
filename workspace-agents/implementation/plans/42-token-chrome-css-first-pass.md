# Plan 42: Token/Chrome CSS First Pass

## Summary

Implement a narrow visual polish slice for App Shell’s shared theme tokens and shell chrome only. The goal is to make the app feel more intentional and less flat while preserving the current fixed-zone, modular desktop-shell architecture.

Durable plan artifact, if written later: `workspace-agents/implementation/plans/42-token-chrome-css-pass.md`.

## Key Changes

- Update existing theme token values in `tokens.css`; do not add new public token names unless unavoidable.
- Keep all changes inside shared styling and chrome:
  - `app-shell/src/renderer/src/styles/tokens.css`
  - `app-shell/src/renderer/src/styles/global.css`
  - `AppShell.svelte`, `ContextStrip.svelte`, `ActivityRail.svelte`, `StatusBar.svelte`
- Soften pane dividers by reducing `--color-border-strong` contrast across dark, light, gray, and system-light definitions.
- Make gray theme less sterile by keeping neutral surfaces but restoring a restrained sapphire accent for action, focus, selected, and active states.
- Normalize shell chrome treatment:
  - topbar, context strip, rail, and status bar use compatible gradient strength and glint direction
  - status bar should no longer feel darker/heavier than the rest of the chrome
  - rail active state should rely more on a crisp accent indicator and less on a boxed gray fill
- Tighten shared zone headers:
  - keep `--shell-zone-header-h` unchanged
  - use quieter header borders and slightly more polished header background treatment
  - do not alter module layout, zone sizing, or persisted layout behavior

## Public Interfaces / Types

- No IPC, schema, preload, main-process, or TypeScript contract changes.
- No new module APIs.
- Existing design token values change; token names remain stable because tokens are a module-facing theme contract.

## Out of Scope

- No module-specific restyling of Documents, Assets, Table View, AI Chat, Web, Workflow, or Prompt Studio.
- No inspector hierarchy redesign.
- No table row redesign.
- No new glassmorphism pass beyond existing floating surfaces.
- No changes to layout defaults, inspector visibility, status-bar behavior, resize logic, or module activation.
- No new dependencies.

## Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
git diff --check
```

Capture before/after UI evidence using existing capture hooks:

```bash
SHELL_CAPTURE_THEME=gray SHELL_CAPTURE_MODULE=shell.tableview SHELL_CAPTURE=../workspace-agents/implementation/screenshots/token-chrome-gray-table-before-2026-06-06.png npm run start
SHELL_CAPTURE_THEME=gray SHELL_CAPTURE_MODULE=shell.tableview SHELL_CAPTURE=../workspace-agents/implementation/screenshots/token-chrome-gray-table-after-2026-06-06.png npm run start

SHELL_CAPTURE_THEME=light SHELL_CAPTURE_SETTINGS=1 SHELL_CAPTURE=../workspace-agents/implementation/screenshots/token-chrome-light-settings-before-2026-06-06.png npm run start
SHELL_CAPTURE_THEME=light SHELL_CAPTURE_SETTINGS=1 SHELL_CAPTURE=../workspace-agents/implementation/screenshots/token-chrome-light-settings-after-2026-06-06.png npm run start

SHELL_CAPTURE_THEME=dark SHELL_CAPTURE_MODULE=shell.assets SHELL_CAPTURE_ASSET_LINKS_STATE=project SHELL_CAPTURE=../workspace-agents/implementation/screenshots/token-chrome-dark-assets-before-2026-06-06.png npm run start
SHELL_CAPTURE_THEME=dark SHELL_CAPTURE_MODULE=shell.assets SHELL_CAPTURE_ASSET_LINKS_STATE=project SHELL_CAPTURE=../workspace-agents/implementation/screenshots/token-chrome-dark-assets-after-2026-06-06.png npm run start
```

Acceptance criteria:

- Chrome reads as one cohesive shell system across gray, light, and dark themes.
- Gray theme has visible but restrained accent states.
- Pane boundaries remain readable but less wireframe-like.
- Activity rail active state is clearer without looking heavier.
- Dense module content remains solid and readable; no text is placed on translucent/glass surfaces.
- Screenshots show no overlap, clipped toolbar text, missing icons, or excessive contrast loss.

## Parked High-Leverage Tweaks

Only explore these if Carlo approves or asks later:

- Standardize compact controls across filters, typeaheads, select boxes, add-link buttons, and reset buttons.
- Give inspector sections a clearer key/value rhythm and quieter separators.
- Refine Table View row hover, active row, sticky header, and badge styling.
- Apply a shared selected-state recipe across document tree rows, asset rows, table rows, and plugin rows.
- Evaluate command palette, context menu, and settings modal for a restrained overlay/glass treatment.
- Review light and gray theme contrast more formally after the chrome pass lands.

## Assumptions

- This is a visual-polish slice, not a layout pass.
- Existing fixed-zone shell architecture remains the source of truth.
- The first implementation should prefer token value edits and small chrome CSS adjustments over new abstractions.
- If a durable repo artifact is requested, use plan number `42`.
