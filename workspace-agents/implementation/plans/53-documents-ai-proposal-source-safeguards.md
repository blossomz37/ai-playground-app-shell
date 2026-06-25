# Plan 53 - Documents AI Proposal Source Safeguards

## Goal & Scope

Add the first source-match safeguard for pending Documents AI proposals without adding apply/accept. Writers should be able to see whether a pending proposal still matches the current document state before any future mutation path exists.

This follows Plan 52 and `workspace-agents/session-handoffs/HANDOFF_62.md`.

## Anchor

- `docs/architecture/module-contract.md` §7: Documents may render proposal state, but AI owns runs and proposal records.
- Existing `AiProposal.sourceText` / `proposedText` fields.
- Existing Documents pending proposal surface.

## Approach

1. Keep this slice renderer-only and non-mutating.
2. For each pending proposal on the active document, compare `proposal.sourceText` with the current editor content.
3. Report source status in the proposal card:
   - `Source verified` for replacement proposals with one exact match.
   - `Multiple source matches` for replacement proposals with more than one exact match.
   - `Source changed` when replacement source text is missing.
   - `Source snapshot unchanged` for append-note proposals when the document content exactly matches the proposal snapshot.
   - `Document changed since proposal` for append-note proposals when the editor content has changed since proposal creation.
4. Keep `Copy` and `Reject` available regardless of source status.
5. Do not add `Accept`, direct replacement, source anchoring, or version-history writes yet.

## Files / Areas Touched

- `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `workspace-agents/implementation/screenshots/`
- `workspace-agents/session-handoffs/`

## Risks & Unknowns

- Exact string matching is conservative. It intentionally does not try fuzzy matching, paragraph anchoring, or diff-assisted matching.
- Current Plan 52 proposal text is provider-free rendered prompt text, not model output. The source status is still useful because it validates the stored source snapshot.
- Append-note proposals do not need source replacement, but tracking snapshot drift is still useful before future apply behavior is specified.

## Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
git diff --check
```

Run Svelte autofixer on `app-shell/src/renderer/src/modules/documents/MainView.svelte`.

Capture UI evidence without rebuilding/repackaging the notarized release bundle:

```bash
SHELL_CAPTURE=../workspace-agents/implementation/screenshots/documents-ai-source-safeguards-after-2026-06-25.png npm run start
```

Completed 2026-06-25:

- `svelte_autofixer` on `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshot: `workspace-agents/implementation/screenshots/documents-ai-source-safeguards-after-2026-06-25.png`

## Out of Scope

- Accept/apply/replace actions.
- Source-match schema migrations.
- Version-history writes.
- Fuzzy matching, position anchoring, or stale-source recovery UI.
- Live provider invocation or streaming.
