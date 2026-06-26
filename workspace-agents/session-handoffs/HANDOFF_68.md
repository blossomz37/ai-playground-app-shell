# Session Handoff 68 - Documents AI Direct Actions

_Session: 2026-06-26 - Slice: Documents AI direct send correction_

## What Changed

- Changed the Documents AI action bar so the primary `Rewrite`, `Continue`, and `Summary` buttons send live AI proposal requests directly.
- Kept provider-free preview available as explicit secondary actions:
  - `Preview rewrite`
  - `Preview continue`
  - `Preview summary`
- Changed the post-preview send button label from `Run Proposal` to `Send preview`.
- Updated the instruction placeholder from preview-specific wording to `Optional direction for this AI request`.
- Reused the existing `createProposalFromInvocation(...)` path and Plan 57 runtime output contract.

## Evidence

- `mcp__svelte.svelte_autofixer` on `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot:
  - `workspace-agents/implementation/screenshots/documents-ai-direct-actions-after-2026-06-26.png`

## Not Built

- No new IPC, schema, preload, or module-contract APIs.
- No streaming/cancel support.
- No parser or structured response contract.
- No direct document mutation before proposal review.

## Notes for Next Agent

- This is a UX correction from Carlo's report that the old flow showed `not sent` and no obvious send action.
- Preview remains optional, but writers are no longer forced through preview before sending a proposal request.
