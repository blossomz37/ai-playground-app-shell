# Plan 51 - AI Writing Workflow Variables

## Goal & Scope

Complete the next advisable Plan 50 enhancement: Upgrade 3, Cappy-style writing workflow variables for AI preview and execution.

This slice should let writer-facing prompts use document-aware values such as selected text, text before the cursor, text after the cursor, selected context documents, active document title, document kind, and workspace name. It should keep the existing shared AI orchestration path intact so provider-free preview and provider execution render the same prompt.

## Anchor

- Parent plan: `workspace-agents/implementation/plans/50-ai-writing-workflow-upgrades-from-cappy.md`
- Prior-art reference: `workspace-agents/implementation/plans/50-reference-cappy-and-draftwell-patterns.md`
- Architecture: `docs/architecture/shell-platform-spec.md` section 12, especially SQLite as document source of truth and framework-agnostic core logic.
- Module boundary: `docs/architecture/module-contract.md` section 5, especially shell-owned documents and cross-module command/event boundaries.

## Current State

Already landed before this plan:

- Provider-free prompt preview exists and uses the same payload path as provider execution.
- Shared AI context candidates exist for active document, selected documents, descendants, and manual notes.
- Documents tree exposes persistent folder/document context toggles.
- AI Chat, Prompt Studio, and Workflow Runner can use shared context selection.
- AI output is saved into the active project document tree under `AI Outputs`.
- AI tools require an active project.

Still missing:

- Writing variables that come from editor selection and cursor position.
- A shared, auditable renderer contract for document variables beyond the basic `{{text}}` template value.
- Documents UI affordances that make it obvious which document text will be sent before a run.

## Product Behavior

Add support for these variables:

- `{{selected_text}}`
- `{{user_input}}`
- `{{before}}`
- `{{after}}`
- `{{selected_documents}}`
- `{{active_document_title}}`
- `{{document_kind}}`
- `{{workspace_name}}`

Behavior rules:

- Provider-free preview and provider execution must render variables through the same code path.
- Empty variables render with clear fallback text, not stale values from a previous selection.
- `{{selected_documents}}` is derived from the same included AI context candidates used by the current shared context tree.
- Metadata remains out of model context unless explicitly represented by a named variable.
- Document content is not mutated in this plan. AI output continues to save as a new `AI Outputs` document until Plan 50 Upgrade 5 adds proposals.

## Implementation Slices

### Slice 1 - Shared Variable Renderer Contract

Goal: make prompt rendering variable-aware without changing UI behavior yet.

Build order:

1. Save this implementation plan at `workspace-agents/implementation/plans/51-ai-writing-workflow-variables.md` before code work starts.
2. Extend shared AI types with a small writing-variable payload if needed, keeping it serializable across IPC.
3. Update the prompt builder so known writing variables render in one shared function for preview and invoke.
4. Ensure `{{selected_documents}}` renders from included context candidates in a clearly labeled, auditable block.
5. Add focused tests or a main-process smoke path for preview rendering with variables.

Expected files / areas:

- `app-shell/src/shared/ai.ts`
- `app-shell/src/main/ai/prompt-builder.ts`
- `app-shell/src/main/ai/orchestrator.ts`
- Existing AI tests or a narrow smoke script if no suitable test exists.

Evidence of success:

- `npm run typecheck`
- `npm run build`
- A provider-free preview proof showing rendered variable values and `providerRequestSent: false`.
- `git diff --check`

Completion gate:

- Commit and push after this slice succeeds.
- Do not continue to Slice 2 with uncommitted Slice 1 changes.

### Slice 2 - Documents Selection And Cursor Capture

Goal: capture document-local writing context from the active TipTap editor.

Build order:

1. Add a narrow helper in the Documents module that extracts:
   - selected text
   - text before the current selection or cursor
   - text after the current selection or cursor
   - active document title/kind/workspace name
2. Keep extraction in the renderer where the TipTap editor state exists, but pass only plain strings into the shared AI request.
3. Avoid changing document content or adding proposal persistence.
4. Use the helper only from Documents-owned UI/actions.

Expected files / areas:

- `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- A small adjacent helper only if it removes real complexity from the Svelte component.
- `app-shell/src/renderer/src/store/ai.ts` if the request payload needs a typed pathway.

Evidence of success:

- `npm run typecheck`
- `npm run build`
- Screenshot evidence in `workspace-agents/implementation/screenshots/` showing a selected document/selection state and the AI action surface that will use it.
- `git diff --check`

Completion gate:

- Commit and push after this slice succeeds.
- If Svelte files change, run the Svelte autofixer when available and re-check the touched component.

### Slice 3 - Documents AI Preview Actions

Goal: expose the variables to the writer without creating proposals yet.

Build order:

1. Add Documents actions for previewable writing workflows, starting narrow:
   - Preview rewrite selection.
   - Preview continue from cursor.
   - Preview summarize active document.
2. Render the provider-free prompt preview in a visible Documents surface, likely inspector or an inline panel, so the user can verify selected text, before/after context, and selected documents before running.
3. Optionally allow `Run` only if it uses the existing AI output document path and does not mutate the source document.
4. Keep accept/reject proposals out of scope.

Expected files / areas:

- `app-shell/src/main/modules/documents/index.ts`
- `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `app-shell/src/renderer/src/modules/documents/InspectorView.svelte`
- `app-shell/src/renderer/src/store/ai.ts`

Evidence of success:

- `npm run typecheck`
- `npm run build`
- Screenshots in `workspace-agents/implementation/screenshots/` showing:
  - selected text captured into `{{selected_text}}`
  - before/after context visible in provider-free preview
  - selected document context included through `{{selected_documents}}`
  - no source document mutation after preview
- If `Run` is included, screenshot showing output saved under `AI Outputs`.
- `git diff --check`

Completion gate:

- Commit and push after this slice succeeds.
- Stop here unless Carlo explicitly approves moving into proposals or streaming.

## Cross-Slice Requirements

Every successful slice must include:

- The saved implementation plan as the working reference.
- Evidence of success, including command validation and screenshot evidence for UI-visible work.
- A focused commit after validation.
- A push to the current branch after the commit.
- `git status --short --branch` showing clean state before moving to the next slice.

After the last successful slice:

- Write a new numbered handoff in `workspace-agents/session-handoffs/` for the next session.
- The handoff should include:
  - completed slices with commit hashes
  - validation commands run
  - screenshot evidence paths
  - known deferrals with reasons
  - exact next recommended task
- Commit and push the handoff if it is part of the completed slice.

## Risks & Unknowns

- TipTap selection text and markdown serialization may not map one-to-one; use plain text for variables in this plan unless markdown fidelity is explicitly needed.
- Long `before` / `after` values can become too large; cap them with a clear truncation strategy if needed.
- Documents UI has limited inspector space; avoid adding another duplicated context picker after the recent context-dedup work.
- Existing `AiRun.inputSummary` may not be enough for full audit restoration; defer full run-detail restore to Upgrade 8 unless a tiny addition is necessary for proof.

## Validation Strategy

Run from `app-shell/` for each implementation slice:

```bash
npm run typecheck
npm run build
```

Run from repo root before each commit:

```bash
git diff --check
git status --short --branch
```

UI screenshots should use the repo-owned capture path where possible:

```bash
cd app-shell
SHELL_CAPTURE=../workspace-agents/implementation/screenshots/<slice>-after-2026-06-25.png npm run start
```

Use Playwright or controlled Electron interaction when the evidence requires text selection or cursor placement that cold-launch capture cannot create.

## Out Of Scope

- Streaming output and cancel support.
- Accept/reject proposal UI.
- Applying AI output directly to source documents.
- Model preset/provider profile work.
- Prompt template import/export.
- Optional reports plugin.
- New database tables unless a variable audit gap cannot be solved with the existing `ai_runs` and `ai_context_packs` records.
