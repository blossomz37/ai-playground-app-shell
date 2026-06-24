# Plan 50 Reference - Cappy & DraftWell Implementation Patterns

Companion to `50-ai-writing-workflow-upgrades-from-cappy.md`. That plan deliberately ports the *interaction model*, not the source. This file captures the concrete patterns behind the two hardest slices - streaming inline AI (Cappy) and the proposal accept/reject gate (DraftWell) - so the implementer does not have to re-derive them.

Source projects (read-only prior art, not dependencies):

- `/Users/carlo/Github/cappy-writing` - Laravel + React + Tiptap, OpenRouter.
- `/Users/carlo/Github/draftwell-app` - Node + React + Drizzle/SQLite, OpenAI. **Closest sibling to app-shell** - it already speaks `AiRun` / `AiProposal` and follows the same "SQLite is truth, files are provenance" stance, so its schema maps almost 1:1.

---

## A. Streaming inline AI in the editor (Cappy) - for Upgrades 3-5

The core insight: **generated text lands as a distinct provisional node, not as live document text.** Streaming updates that node through a side channel so each token does not fire a full ProseMirror transaction.

### A1. Capture cursor context before the call

`resources/js/lib/editor/context.ts` - `captureEditorContext()`:

- `before` / `selected` / `after` extracted via `state.doc.textBetween(from, to, '\n', ' ')`.
- Returns `EditorContext { before, selected, after }`.

These map directly to the plan's `{{before}}`, `{{selected_text}}`, `{{after}}` variables (Upgrade 3).

### A2. Provisional node, not live text

A custom Tiptap node `generatedText` (`extensions/generated-text.tsx`) holds the in-flight + reviewable output. Attributes worth copying:

```
id, htmlContent, isGenerating, isAccepted,
documentId, model, generationPrompt,
contextBefore, contextAfter,
selectionRange   // JSON {from,to} - the range to replace on accept
```

UI states: **Generating** (spinner, live stream) -> **Review** (Accept / Reject / Edit / Stop) -> **Accepted** (node replaced by inline content; on a replacement, `deleteRange(selectionRange)` first).

> For app-shell, the durable record is the `ai_proposals` row (DraftWell pattern below). The editor node is the *view* of a pending proposal, not the source of truth - this is exactly the guardrail in Upgrade 5's "Architecture Fit" note.

### A3. Side-channel streaming (the part that makes it smooth)

`resources/js/lib/editor/streaming-signals.ts` - a global `Map<blockId, {content, listeners, isGenerating}>`. The stream reader appends to the signal; the node component subscribes and re-renders only itself. Avoids one ProseMirror transaction per token.

Stream read loop (`hooks/use-editor-ai.ts`): SSE `data: {json}` lines, accumulate `parsed.content`, `updateSignal(id, accumulated)`. On finish, one transaction writes final `htmlContent` and flips `isGenerating=false`. Abort controllers tracked per block for Stop.

**app-shell adaptation:** main process owns the provider stream; emit chunk events over IPC keyed by run id (`ai.run.chunk` / `ai.run.completed` / `ai.run.failed` - the bus already has the latter two). Renderer keeps a per-run accumulator store; the editor proposal node subscribes. Same shape, Svelte store instead of a JS Map. This is Upgrade 4's "keep streaming in the shared layer, expose via IPC/events."

### A4. Data model worth borrowing (Upgrades 6-7)

- `AiPrompt`: `{ category: writing|brainstorming|editing|planning, type: general|scene_beat|expand|rephrase|shorten|summarize|editor|continuity, template, inputs[], defaults }`. The `type` enum is a ready-made list for Upgrade 5's document actions.
- `ModelCollection` (== Upgrade 7 provider profiles): `{ name, models[], default_model, purpose, temperature, max_tokens, + advanced params }`.
- `AiPersona`: scoped `global|book|series|chat|write|edit`, links to a `ModelCollection`. Out of scope for plan 50 but noted for later.

### A5. Story-bible context (Upgrade 2, future)

`StoryBibleDetectionService` scans doc text for character/location names, matches `project.storyBibleEntries`, returns mentions with ~60-char context windows. app-shell's nearest fit is auto-suggesting context candidates from typed document kinds (`character`, `setting`) - a v2 enhancement to the context picker, not v1.

---

## B. Proposal accept/reject gate (DraftWell) - for Upgrade 5

This is the schema to copy. DraftWell already isolates AI edits from the manuscript until resolved, with a checksum audit trail. app-shell's `ai_proposals` table should converge on this.

### B1. Schema (`packages/data/src/schema.ts`)

- **`aiRuns`**: `id, projectId, workflow, model, status(queued->running->completed/failed), inputSnapshot(JSON), outputSnapshot(JSON), costEstimate, createdAt, completedAt`.
- **`aiProposals`** (kept *separate* from doc text until resolved): `id, aiRunId, projectId, documentId, kind, proposal(text), status(pending->accepted/rejected), editOperationsJson, targetLocator(block id path), createdAt, resolvedAt`.
  - `editOperationsJson` items: `{type, targetLocator, sourceText, replacementText, confidence, rationale, changeIntent}`.
- **`proposalApplications`** (executed-replacement log / integrity trail): `id, proposalId, documentId, documentVersionId, operationType(replace_block_text|append_revision_note), sourceText, replacementText, previousContentChecksum, nextContentChecksum, reviewSnapshotJson, createdAt`.

app-shell already has `ai_runs` and `ai_proposals`; the additions to consider are `editOperationsJson` + `targetLocator` on proposals and a `proposal_applications` table for the checksum trail.

### B2. The three resolution paths (`packages/data/src/queries.ts`)

- **Reject** (`rejectAiProposal`): set `status=rejected, resolvedAt`. **No document change.** Run history retained. (Plan's "rejected proposals remain in run history but do not affect content.")
- **Accept-as-note** (`acceptAiProposal` -> `appendAcceptedProposalNote`): append a paragraph block (Tiptap JSON) with `blockId=accepted-{proposalId}`, or `\n\nAI revision note: ...` for plain text. Saves through the normal doc-version path with `versionReason: "proposal-accept"`.
- **Apply-replacement** (`applyAiProposalReplacement`, requires `confirmSourceMatch:true`): validate the proposal's `sourceText` still matches the target block (`matchStatus==matched && qualityStatus==strong`), `replaceTiptapBlockText(content, blockId, replacementText)`, snapshot a new document version (`versionReason: "proposal-replacement"`), insert `proposalApplications` with before/after checksums.

The source-match guard is the important safety property: a stale proposal (block edited since generation) is blocked, not silently misapplied. app-shell's document versioning already exists, so the accept paths reuse it directly.

### B3. Mock vs live gate (`apps/api/src/aiWorkflow.ts`)

- `if (!options.allowLive) throw "Live AI runs require DRAFTWELL_ALLOW_LIVE_AI=1"`, set from `process.env`.
- Mock path returns fixed proposals with estimated usage (`inputTokens = contextPreview.tokenEstimate`, `outputTokens = 64`), `mode:"mock"`.
- Live path requires `OPENAI_API_KEY`, calls a structured JSON schema response, captures real usage + `openaiResponseId` for audit, JSON-repair fallback.

app-shell's equivalent is the existing demo-mode setting selecting `mock-local` vs `openai-responses` - same idea, already wired. The lesson to keep: **mock path produces real proposal rows** so the whole accept/reject UI is testable without an API key (directly serves the plan's "preview works without an API key" validation).

### B4. Context preview + token estimate (Upgrade 1)

`AiContextPreview`: `{ documentId, documentTitle, workflow, targetBlockId, targetLocator, targetSourceText, candidates[], included[], excluded[], instructions, tokenEstimate, omittedWarnings[] }`.

- `AiContextCandidate`: `{ id, label, content, category(manuscript|planning|today|calendar|asset), included, defaultIncluded, locked }`. `locked` = target source (cannot deselect); `defaultIncluded` = story-bible/canon (opt-out).
- `estimateTokens(s) = max(1, ceil(s.length/4))`.

This is almost exactly app-shell's `AiContextCandidate` plus the plan's context picker (Upgrade 2) and provider-free preview (Upgrade 1). The `included/excluded/locked/defaultIncluded` flags are the data model for the picker's checkboxes.

---

## C. Net mapping to plan 50 upgrades

| Plan upgrade | Borrow from | Concrete artifact |
|---|---|---|
| 1 Provider-free preview | DraftWell `AiContextPreview` + `estimateTokens` | preview struct, `providerRequestSent:false` |
| 2 Context picker | DraftWell `AiContextCandidate` flags | `included/excluded/locked/defaultIncluded` |
| 3 Writing variables | Cappy `captureEditorContext` | `before/selected/after`, prompt `type` enum |
| 4 Streaming | Cappy streaming-signals + main-process stream | IPC chunk events keyed by run id |
| 5 Proposals | DraftWell `aiProposals` + 3 resolution paths | `editOperationsJson`, source-match guard, checksum trail |
| 6 Prompt library | Cappy `AiPrompt` shape | category/type/inputs |
| 7 Model presets | Cappy `ModelCollection` | provider profile schema |
| 8 Audit trail | DraftWell `aiRuns` snapshots | input/output snapshots + run<->proposal link |

**Single most reusable thing:** DraftWell is the architectural twin. Before implementing Upgrade 5, read `draftwell-app/packages/data/queries.ts` (accept/reject/apply functions) and `apps/api/src/aiWorkflow.ts` - it is the same stack solving the same problem app-shell is about to.
