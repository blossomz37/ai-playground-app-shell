# Plan 50 - AI Writing Workflow Upgrades From Cappy

## Goal & Scope

Upgrade app-shell's AI interaction from a general shared AI substrate into a writer-facing AI workflow comparable to the strongest parts of Cappy.

This is an overview and sequencing map, not an implementation pass. It keeps app-shell's architecture intact: shell owns AI primitives, modules invoke AI through the module contract, and Documents remains the first concrete writing consumer.

> Concrete prior-art patterns (Cappy streaming/inline node + DraftWell proposal schema, with file paths and data shapes) are captured in the companion `50-reference-cappy-and-draftwell-patterns.md`. Read it before implementing Upgrades 4 and 5.

## Current Baseline

App-shell already has the durable platform pieces:

- AI providers, provider settings, model selection, temperature, and OS-backed secret storage.
- AI runs, context packs, prompt templates, prompt chains, chain run tables, and proposal tables.
- AI Chat, Prompt Studio, and Workflow Runner modules.
- Context candidates for active document, selected documents, descendants, and manual notes.
- A module contract that already anticipates Documents invoking `ai.review` while the AI module owns run and proposal logic.

Cappy has the stronger writer-facing interaction:

- File and folder context selection is visible in the project tree with inline toggles and token counts.
- Prompt preview renders the exact provider-bound prompt without contacting the provider.
- Prompt variables include selected text, user input, text before cursor, text after cursor, and selected context documents.
- AI generation streams into the TipTap editor.
- Generation can be cancelled mid-stream without corrupting document content.
- Generated text remains provisional until the writer accepts or rejects it.
- Backend tests prove preview safety, stream rendering, metadata exclusion, and provider chunk emission.

## UX Correction From Cappy Reference

The first app-shell implementation of Upgrade 2 proved the shared data path, but the interaction is still too hidden for a writer. In Cappy, context selection is not a separate mental model: the project tree itself shows folders, documents, token counts, and toggles. That expectation should be carried into the remaining Upgrade 2 work before moving on to Upgrade 3.

Specific issues to solve in the next implementation slice:

- The empty left Prompt Studio panel should become useful. It should expose the template list and/or context tree instead of leaving the writer to hunt through inspector controls.
- Context selection should look like Cappy's file/folder tree: folder rows and document rows with inline include toggles and token counts.
- Creating a new prompt template should create, select, and reveal an editable template, not only dispatch a command and show a toast.
- Running a template should leave the output visible in the active workspace. Run history can archive it, but it should not feel like the result disappeared.
- Run history entries should be selectable and should restore the rendered prompt, output, selected context, model, and settings for inspection.

## Upgrade 1 - Provider-Free Prompt Preview

Add an app-shell AI preview path that renders the exact prompt/context packet without making a provider call.

### User Value

Writers can inspect what will be sent to the model before spending tokens, exposing private text, or debugging a bad output.

### Product Behavior

- Add a Preview action anywhere AI can run.
- Return rendered prompt text, included context titles, estimated tokens, provider/model/settings, and `providerRequestSent: false`.
- Make Prompt Studio's current "Output Preview" clearer by separating:
  - `Preview Prompt` - no model call.
  - `Run` - provider call.

### Likely Areas

- `app-shell/src/shared/ai.ts`
- `app-shell/src/main/ai/orchestrator.ts`
- `app-shell/src/main/ai/openai-provider.ts`
- `app-shell/src/preload/index.ts`
- `app-shell/src/renderer/src/store/ai.ts`
- `app-shell/src/renderer/src/modules/promptstudio/MainView.svelte`

## Upgrade 2 - Shared Context Tree

Build reusable context selection for AI runs, using a Cappy-style tree as the primary writer-facing interaction.

### User Value

The writer can deliberately choose which documents and folders count as context without leaving the project structure they already understand.

### Product Behavior

- Show active document, selected text, descendants, manually selected documents, selected folders, and manual note.
- Allow toggling each context candidate before preview or run.
- Support selecting arbitrary documents and folders from a hierarchical document tree.
- Folder toggles should include or exclude descendant documents; document toggles should allow narrower overrides where the data model supports it.
- Show token estimates per item, per folder, and total estimate.
- Persist selected context on the AI context pack for later audit.

### First Version

Replace the drawer/popover-first behavior with a visible tree in the surfaces that have room for it:

- Active document included by default.
- Descendants optional.
- Folder and document rows with inline include toggles.
- Token counts visible on the row, matching the Cappy mental model.
- Manual note field.
- Prompt Studio: use the left panel for the template list and context tree, either as tabs or a split layout. The left panel should not remain blank.
- AI Chat: keep the compact message-bar status button, but the inspector/context area should expose the same tree-style selection behavior.

Then reuse the same picker in Documents AI Review and Workflow Runner.

### Likely Areas

- `app-shell/src/main/ai/orchestrator.ts`
- `app-shell/src/renderer/src/store/ai.ts`
- `app-shell/src/renderer/src/modules/aichat/MainView.svelte`
- `app-shell/src/renderer/src/modules/promptstudio/MainView.svelte`
- `app-shell/src/renderer/src/modules/documents/`
- `app-shell/src/shared/state/documents-state.ts`

## Upgrade 3 - Writing Workflow Variables

Add Cappy-style writing variables to app-shell's prompt renderer.

### User Value

Prompts can target real writing actions: continue from cursor, revise selection, use surrounding context, and bring in selected reference docs.

### Variables

- `{{selected_text}}`
- `{{user_input}}`
- `{{before}}`
- `{{after}}`
- `{{selected_documents}}`
- Later: `{{active_document_title}}`, `{{document_kind}}`, `{{workspace_name}}`

### Product Behavior

- Use one renderer for preview and provider execution.
- Tag rendered values clearly enough to make the prompt auditable.
- Keep metadata out of model context unless explicitly selected.
- Preserve the basic `{{variable}}` template behavior already in app-shell.

### Likely Areas

- `app-shell/src/shared/ai.ts`
- `app-shell/src/main/ai/orchestrator.ts`
- `app-shell/src/main/ai/openai-provider.ts`
- TipTap selection/cursor capture in `app-shell/src/renderer/src/modules/documents/`

## Upgrade 4 - Streaming Provider Interface

Add streaming support to app-shell's AI provider contract.

### User Value

Writers see generation arrive progressively and can stop bad runs quickly.

### Product Behavior

- Provider calls can emit chunks, completion metadata, and errors.
- UI can cancel a running generation.
- Runs still persist final output/error status in `ai_runs`.
- Streaming should work for Documents first, then AI Chat.

### Implementation Constraint

Do not bake streaming into one module. Keep it in the shared AI orchestration layer and expose it through IPC/events so modules can render it differently.

### Likely Areas

- `app-shell/src/shared/ai.ts`
- `app-shell/src/main/ai/orchestrator.ts`
- `app-shell/src/main/ai/openai-provider.ts`
- `app-shell/src/main/ipc.ts`
- `app-shell/src/preload/index.ts`
- `app-shell/src/renderer/src/store/ai.ts`

## Upgrade 5 - Documents AI Review And Proposals

Use app-shell's existing proposal model to create provisional AI changes in Documents.

### User Value

AI output becomes a reviewable suggestion, not a destructive document mutation.

### Product Behavior

- Add document-level AI actions:
  - Review selection.
  - Rewrite selection.
  - Continue from cursor.
  - Suggest next beat.
  - Summarize active document.
- Generated output appears as a pending proposal in the editor or inspector.
- Writer can accept, reject, edit, or copy.
- Accepted replacement proposals update the document through the existing document save/version path.
- Rejected proposals remain in AI run history but do not affect document content.

### Architecture Fit

This is the app-shell version of Cappy's generated text block, but it should use the existing `AiProposal` type and `ai_proposals` table instead of adding editor-only transient state as the source of truth.

### Likely Areas

- `app-shell/src/shared/ai.ts`
- `app-shell/src/main/ai/repository.ts`
- `app-shell/src/main/ai/orchestrator.ts`
- `app-shell/src/main/modules/aichat/index.ts`
- `app-shell/src/main/modules/documents/`
- `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `app-shell/src/renderer/src/modules/documents/InspectorView.svelte`

## Upgrade 6 - Prompt Library And Template Usability

Move Prompt Studio from a developer-ish prompt editor toward a writer-usable prompt library.

### User Value

Writers can save, organize, preview, and rerun prompt recipes without rebuilding prompts from scratch.

### Product Behavior

- Template list with categories/tags.
- New template action creates a persisted template, selects it, and places the user in the editable name/body state.
- Inline rename and duplicate.
- Prompt variable reference panel.
- Last-run settings remembered per template.
- Import/export prompt templates as local JSON.
- Clear distinction between prompt preview, provider run, and proposal creation.
- Latest run output remains visible in the main workspace after a run completes.
- Selecting a run history item restores its rendered prompt, output, selected context, provider/model, and settings.

### Likely Areas

- `app-shell/src/main/ai/repository.ts`
- `app-shell/src/renderer/src/modules/promptstudio/`
- `app-shell/src/renderer/src/shell/AiProviderSettings.svelte`

## Upgrade 7 - Model Presets / Provider Profiles

Port Cappy's useful model collection concept into app-shell as provider profiles.

### User Value

Different writing tasks can use different model/settings presets without changing global settings every time.

### Product Behavior

- Presets for drafting, revision, analysis, summarization, and custom.
- Each preset stores provider, model, temperature, max output, and optional advanced settings.
- AI actions can default to a preset but still allow one-off overrides.
- Preserve app-shell's OS-backed secret handling.

### Likely Areas

- `app-shell/src/shared/ai.ts`
- `app-shell/src/main/ai/repository.ts`
- `app-shell/src/renderer/src/shell/AiProviderSettings.svelte`
- `app-shell/src/renderer/src/modules/promptstudio/InspectorView.svelte`
- `app-shell/src/renderer/src/modules/workflow/InspectorView.svelte`

## Upgrade 8 - AI Run Audit Trail

Make AI history useful to a writer, not just technically persisted.

### User Value

Every output can answer: what prompt, model, settings, and documents produced this?

### Product Behavior

- Run detail view shows:
  - Rendered prompt.
  - Context documents.
  - Model/settings.
  - Token estimate.
  - Output.
  - Proposal status.
- Run history entries are clickable and restore the run detail into the active module view.
- The most recent run stays visible after completion instead of only being discoverable through a passive inspector list.
- Link from a pending or accepted proposal back to its run.
- Allow copying rendered prompt and output.

### Likely Areas

- `app-shell/src/main/ai/repository.ts`
- `app-shell/src/renderer/src/modules/aichat/InspectorView.svelte`
- `app-shell/src/renderer/src/modules/promptstudio/InspectorView.svelte`
- `app-shell/src/renderer/src/modules/documents/InspectorView.svelte`

## Suggested Implementation Order

1. Provider-free prompt preview.
2. Context tree UX correction: Cappy-style file/folder toggles in Prompt Studio and AI Chat.
3. Prompt Studio template creation, template visibility, and active run output restore.
4. Writing workflow variables.
5. Documents AI proposal review without streaming.
6. Streaming and cancel support.
7. Prompt Library polish: duplicate, import/export, categories, and variable reference.
8. Model presets/provider profiles.
9. Run audit trail polish.

This order intentionally proves trust and context first, then proposal application, then streaming. Streaming is valuable, but it should not be the first slice because it is harder to validate and depends on the prompt/context contract being clear.

## Validation Strategy

Each implementation slice should include focused tests and UI evidence where visible.

Backend/main-process proof:

- Preview works without an API key and returns `providerRequestSent: false`.
- Preview and provider execution use the same rendered prompt path.
- Selected context documents render into `{{selected_documents}}`.
- Document metadata is excluded unless explicitly selected.
- AI run/context pack records selected context and rendered prompt.
- Proposal accept/reject updates only the intended document content.

Renderer/UI proof:

- Prompt preview displays before running.
- Context tree shows folders, documents, token counts, and inline toggles.
- Toggling a folder updates descendant context selection and total token estimate.
- Toggling a document updates selected context and total token estimate.
- Prompt Studio's left panel shows useful template/context controls instead of an empty panel.
- New Template creates, selects, and reveals an editable template.
- Running a template keeps output visible in the main workspace.
- Clicking a run history entry restores the rendered prompt, output, selected context, model, and settings.
- Documents AI review creates a pending proposal.
- Accept applies the proposal.
- Reject leaves the document unchanged.
- Cancelled streaming output does not corrupt editor content.

Required commands from `app-shell/`:

```bash
npm run typecheck
npm run build
```

UI-visible slices need screenshots in `workspace-agents/implementation/screenshots/` through the `SHELL_CAPTURE` flow documented in `workspace-agents/implementation/AGENTS.md`.

## Out Of Scope

- Do not port Cappy's Laravel controllers or React components.
- Do not make OpenRouter the only provider path.
- Do not bypass app-shell's secrets service.
- Do not make AI output mutate documents without accept/reject review.
- Do not add a hosted/cloud dependency to shell core.
- Do not redesign Prompt Studio into a full IDE. The corrective slice is limited to context visibility, template creation, and run output visibility.
- Do not build Documents AI Review or Workflow Runner context UI as part of the corrective Upgrade 2/6 slice unless explicitly pulled forward.

## Decision Notes

- App-shell should port Cappy's interaction model, not its implementation.
- The highest-value first milestone is prompt trust: preview, selected context, and auditable runs.
- The second milestone is writer control: AI proposals with accept/reject.
- Streaming should come after proposals, so partial output always has a safe place to land.
- The Cappy-style tree is the target interaction for context selection; a generic picker is only an implementation detail where screen space is constrained.
