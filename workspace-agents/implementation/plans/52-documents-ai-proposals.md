# Plan 52 - Documents AI Proposals Without Streaming

## Goal & Scope

Create a first usable Documents proposal loop without streaming or direct document mutation. The slice turns the provider-free Documents AI preview into a pending proposal that can be copied or rejected.

This continues Plan 50 Upgrade 5 and follows `workspace-agents/session-handoffs/HANDOFF_61.md`.

## Anchor

- `docs/architecture/module-contract.md` §7: Documents invokes AI, while the AI layer owns runs and proposals.
- `docs/modules/documents.md`: Documents renders proposal results but does not own AI orchestration.
- Existing SQLite table: `ai_proposals`.
- Existing provider-free preview path: `previewAi(...)` -> `aiOrchestrator.preview(...)`.

## Approach

1. Keep provider-free preview as the source of the first proposal text. Creating a proposal records a completed AI run for audit, but no provider request is sent.
2. Add narrow AI proposal APIs:
   - `createProposal`
   - `proposals`
   - `rejectProposal`
3. Store proposals in the existing `ai_proposals` table.
4. In Documents, add a pending proposal surface below the AI preview controls.
5. Start with only:
   - `Copy`: copies `proposedText`.
   - `Reject`: marks the proposal rejected and removes it from the pending list.
6. Defer accept/apply/replace until source-match safeguards are specified.

## Files / Areas Touched

- `app-shell/src/shared/ai.ts`
- `app-shell/src/shared/module-contract.ts`
- `app-shell/src/main/ai/repository.ts`
- `app-shell/src/main/ai/orchestrator.ts`
- `app-shell/src/main/ipc.ts`
- `app-shell/src/preload/index.ts`
- `app-shell/src/renderer/src/store/ai.ts`
- `app-shell/src/renderer/src/browser-shell.ts`
- `app-shell/src/renderer/src/modules/documents/MainView.svelte`

## Risks & Unknowns

- The first proposal text is the rendered provider-free prompt, not model output. This is intentional for the no-provider first slice, but the next slice should decide where live model output lands.
- Copy uses the system clipboard; browser fallback behavior can be hardened later if needed.
- Proposal `accept` is intentionally absent because replacement proposals need source-match validation, stale-source handling, and version-history behavior before mutating documents.

## Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
```

Run Svelte autofixer on `app-shell/src/renderer/src/modules/documents/MainView.svelte`.

Capture UI evidence:

```bash
SHELL_CAPTURE=../workspace-agents/implementation/screenshots/documents-ai-proposals-after-2026-06-25.png npm run start
```

Completed 2026-06-25:

- `svelte_autofixer` on `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot: `workspace-agents/implementation/screenshots/documents-ai-proposals-after-2026-06-25.png`
- SQLite check: MOP A/B/C templates exist with `isProtected = 0`.
- SQLite check: capture created one pending proposal for the active document.

## Out of Scope

- Streaming output.
- Live provider invocation from the Documents proposal button.
- Accept/apply/replace.
- Source-match safeguards.
- Proposal diff visualization.
- Recovery or restore UI for rejected proposals.
