# Session Handoff 25 - Table View Document Links

_Session: 2026-06-05 · Slice: Table View document-title linking_

## What Changed

- Made Table View document titles act as explicit open controls.
- Clicking a title selects that table row, switches to Documents, activates the Documents module, and opens the matching document.
- Kept plain row clicks as Table View row selection for the inspector.
- Removed row-level button semantics so the title button is the only nested interactive control.
- Left Table View state persistence, filters, sorting, document schema, IPC, and module contracts unchanged.

## Evidence

Validation passed from `app-shell/`:

```bash
npm run audit:contrast
npm run typecheck
npm run build
```

Contrast summary:

```text
Contrast audit passed: all measured token pairs meet targets.
```

Svelte autofixer passed clean on:

- `app-shell/src/renderer/src/modules/tableview/MainView.svelte`

Screenshot evidence:

- `implementation/screenshots/tableview-document-links-after-2026-06-05.png`

## Carry Forward

- The screenshot captures the visible linked-title styling; deeper browser-style click automation was not added for this narrow pass.
- Existing untracked `implementation/plans/25-shell-utility-and-accessibility-cleanup.md` was not touched.
