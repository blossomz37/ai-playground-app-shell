# Session Handoff 62 - MOP Templates and Documents AI Proposals

_Session: 2026-06-25 - Slice: MOP Prompt Studio templates + Plan 52 first proposal surface_

## What Changed

- Added the three MOP templates from `.ideas/var-templates` to Prompt Studio as ordinary editable templates:
  - `MOP A: Manuscript Overhaul Plan`
  - `MOP B: Chapter Editing Plan`
  - `MOP C: Revise Chapter`
- MOP templates are seeded once per workspace with `isProtected = false`.
- Added a seed marker in `shell_settings` so deleting a MOP template stays deleted instead of being recreated on every launch.
- Wrote `workspace-agents/implementation/plans/52-documents-ai-proposals.md`.
- Added provider-free Documents proposal creation:
  - Uses the existing preview renderer.
  - Records a completed AI run for audit.
  - Persists the pending proposal in the existing `ai_proposals` table.
  - Does not send a provider request.
- Added a Documents pending proposal surface with:
  - `Copy`
  - `Reject`
- Added capture support for saving a Documents AI preview as a proposal for screenshot evidence.

## Evidence

- `svelte_autofixer` on `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot: `workspace-agents/implementation/screenshots/documents-ai-proposals-after-2026-06-25.png`
- SQLite check confirmed MOP A/B/C exist with `isProtected = 0`.
- SQLite check confirmed the capture-created pending proposal exists.

## Not Built

- No accept/apply/replace proposal action.
- No direct document mutation from proposals.
- No streaming output.
- No live provider invocation from the Documents proposal button.
- No source-match, stale-source, or version-history safeguards for replacement proposals.
- No proposal diff visualization.
- No rejected-proposal recovery UI.

## Notes for Next Agent

- Plan 52 intentionally stops at copy/reject. Direct apply should wait until source-match safeguards are specified.
- `aiOrchestrator.createProposal(...)` calls `preview(...)` and records a completed run with the rendered proposal text; this is provider-free and should remain so until a later live-output slice.
- The MOP templates are not protected built-ins. They can be renamed, duplicated, archived, and deleted through existing Prompt Studio lifecycle actions.
- The screenshot capture left one pending proposal in the local app database for `chapter-01`; reject it from the Documents UI if a clean local state is desired.

## Next Recommended Task

Specify and implement proposal source-match safeguards before adding `Accept` or direct replacement. The minimum next plan should define how to handle stale source text, version history, and failed replacement matches.
