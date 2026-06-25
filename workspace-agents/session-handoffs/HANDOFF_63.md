# Session Handoff 63 - Documents AI Proposal Source Safeguards

_Session: 2026-06-25 - Slice: Plan 53 source-match status before proposal apply_

## What Changed

- Wrote `workspace-agents/implementation/plans/53-documents-ai-proposal-source-safeguards.md`.
- Added non-mutating source status to each pending Documents AI proposal card.
- Source status now reports:
  - `Source verified` for replacement proposals with one exact source match.
  - `Multiple source matches` for replacement proposals with more than one exact match.
  - `Source changed` when replacement source text is missing from current editor content.
  - `Source snapshot unchanged` for append-note proposals when the editor content still matches the stored source snapshot.
  - `Document changed since proposal` for append-note proposals when the editor content changed after proposal creation.
- Kept existing proposal actions limited to `Copy` and `Reject`.

## Evidence

- `svelte_autofixer` on `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot: `workspace-agents/implementation/screenshots/documents-ai-source-safeguards-after-2026-06-25.png`

## Not Built

- No accept/apply/replace action.
- No document mutation from proposals.
- No schema migration for proposal anchors.
- No version-history writes.
- No fuzzy match or diff-assisted recovery.
- No live provider invocation or streaming.

## Notes for Next Agent

- The guardrail is currently renderer-only and uses the active editor content, so it reflects unsaved local edits too.
- This is intentionally conservative. Future apply work should define exact behavior for `replacement` proposals before adding an `Accept` button.
- The screenshot capture created one pending proposal in the local app database for `chapter-01`; reject it from the Documents UI if a clean local state is desired.
- Notarization may still be running in a separate terminal. Do not run `npm run package:mac` or overwrite `release/App Shell-darwin-arm64/App Shell.app` until that process finishes and the ticket is stapled.

## Next Recommended Task

Plan the first actual proposal apply path for replacement proposals only. Minimum decisions before implementation:

- whether exact single-match source text is required;
- how to label the document version before mutation;
- how to handle stale or ambiguous matches;
- whether append-note apply stays separate from replacement apply.
