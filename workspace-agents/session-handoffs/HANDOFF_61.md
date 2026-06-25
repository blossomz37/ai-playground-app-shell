# Session Handoff 61 - AI Writing Workflow Variables

_Session: 2026-06-25 - Slice: Plan 51 AI Writing Workflow Variables_

## What Changed

- Completed `workspace-agents/implementation/plans/51-ai-writing-workflow-variables.md` through three focused slices.
- Added typed writing variables for AI preview/run payloads:
  - `{{selected_text}}`
  - `{{user_input}}`
  - `{{before}}`
  - `{{after}}`
  - `{{selected_documents}}`
  - `{{active_document_title}}`
  - `{{document_kind}}`
  - `{{workspace_name}}`
- Kept preview, mock execution, and OpenAI execution on the shared `buildAiInput` renderer path.
- Added selected-document rendering from included AI context candidates with clear labels and fallback text for empty writing variables.
- Added Documents editor capture for selected text, before/after cursor text, active document title/kind, and workspace name without mutating source documents.
- Added a compact Documents AI context toolbar status.
- Added Documents preview actions:
  - Rewrite selection.
  - Continue from cursor.
  - Summarize active document.
- Added an inline Documents provider-free preview panel showing captured variables, included context titles, rendered prompt, provider/model/token estimate, and `not sent`.
- Added capture evidence hooks for AI preview payloads, document selection, and Documents AI preview states.

## Commits

- `f575ac7` - `Add AI writing variable renderer`
- `ade1903` - `Add Documents AI writing context capture`
- `b8f4fa2` - `Add Documents AI preview actions`

## Evidence

- Slice 1:
  - `npm run typecheck`
  - `npm run build`
  - `git diff --check`
  - Preview smoke logged `[SHELL_CAPTURE_AI_PREVIEW]` with `providerRequestSent:false`, rendered variable values, and selected document context.
  - Screenshot: `workspace-agents/implementation/screenshots/ai-writing-variables-slice1-preview-2026-06-25.png`
- Slice 2:
  - `svelte_autofixer` on `MainView.svelte`
  - `npm run typecheck`
  - `npm run build`
  - `git diff --check`
  - Screenshot: `workspace-agents/implementation/screenshots/ai-writing-variables-slice2-selection-context-2026-06-25.png`
- Slice 3:
  - `svelte_autofixer` on `MainView.svelte`
  - `npm run typecheck`
  - `npm run build`
  - `git diff --check`
  - Screenshot: `workspace-agents/implementation/screenshots/ai-writing-variables-slice3-rewrite-preview-2026-06-25.png`
  - Source document mutation check before and after preview:
    - `73ffd4494c765452117dd922bdb2f521f93e72dcbbb56275e9e04ecc3ba683f7`

## Not Built

- No streaming output or cancel support.
- No accept/reject proposal UI.
- No direct source-document mutation from AI.
- No Run button from Documents AI preview; the slice stays provider-free by design.
- No new database tables or proposal application audit schema.
- No model preset/provider-profile work.
- No prompt template import/export or broader Prompt Studio redesign.

## Notes for Next Agent

- `app-shell/src/main/ai/prompt-builder.ts` is now the shared renderer for preview and provider-bound execution. Keep new AI variables there unless a future slice introduces a larger prompt-rendering service.
- `app-shell/src/renderer/src/modules/documents/documentWritingContext.ts` is the renderer-only TipTap capture helper. It deliberately returns plain serializable strings.
- Documents AI preview currently uses `previewAi(...)` only. It does not call `invokeAi(...)`, create AI Outputs, or mutate the active document.
- The inline preview panel is intentionally narrow: it proves the writer-facing variable loop before proposals or streaming.
- Capture hooks added this session:
  - `SHELL_CAPTURE_AI_PREVIEW_PROMPT`
  - `SHELL_CAPTURE_AI_PREVIEW_VARIABLES`
  - `SHELL_CAPTURE_AI_PREVIEW_WRITING_VARIABLES`
  - `SHELL_CAPTURE_DOCUMENT_SELECTION_TEXT`
  - `SHELL_CAPTURE_DOCUMENT_SELECTION_FROM`
  - `SHELL_CAPTURE_DOCUMENT_SELECTION_TO`
  - `SHELL_CAPTURE_DOCUMENT_AI_PREVIEW`
  - `SHELL_CAPTURE_DOCUMENT_AI_USER_INPUT`

## Next Recommended Task

Write Plan 52 for Plan 50 Upgrade 5: Documents AI proposals without streaming. Start with provider-free preview and existing `ai_proposals`, then add a pending proposal surface with reject/copy first. Defer direct apply/replace until source-match safeguards are specified.
