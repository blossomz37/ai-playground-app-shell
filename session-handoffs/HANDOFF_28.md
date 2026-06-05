# Session Handoff 28 - Editable Document Kind

_Session: 2026-06-05 · Slice: Documents inspector kind editing and scene tree clarity_

## What Changed

- Renamed the Documents module sidebar header from `Manuscript` to `Documents` so the panel matches the module surface when editing scenes and other document kinds.
- Updated the document tree so active nested documents remain visible by treating any node with children as expandable, not just folder nodes.
- Added a `documents.update` path through core documents, IPC, preload, the shell API contract, browser shell, module state wiring, and the shared documents state slice.
- Changed the inspector `Kind` row from static text to an editable select for `folder`, `chapter`, `scene`, and `plan`.
- Kept unsaved editor text intact when metadata refresh events arrive for the active document.

## Evidence

- `npm run audit:contrast`
- `npm run typecheck`
- `npm run build`
- Svelte autofixer clean on `NavView.svelte` and `InspectorView.svelte`
- Screenshot evidence: `implementation/screenshots/documents-kind-edit-after-2026-06-05.png`

## Carry Forward

- The existing untracked plan artifact `implementation/plans/25-shell-utility-and-accessibility-cleanup.md` was left untouched.
