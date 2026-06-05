**Refactor Plan**

**Goal:** reduce duplicated UI/state patterns without changing app behavior.  
**Rule:** one refactor family per pass; no feature work bundled into cleanup.

**Phase 0: Baseline Safety Check**

- Check current `git status`.
- Run from `/Users/carlo/Github/app-shell-project/app-shell`:
  - `npm run typecheck`
  - `npm run build`
  - `npm run audit:contrast`
- Capture baseline screenshots for Documents, Prompt Studio, Web, Settings, and one settings-backed module like Journal.
- Do not start edits if baseline is already failing unless the failure is documented first.

**Phase 1: Header Alignment Utility**

Scope: lowest-risk visual cleanup.

- Add shared header token/class:
  - `--shell-zone-header-h`
  - `.zone-header`
  - `.zone-title`
  - `.zone-header-actions`
- Apply first to Documents nav/main headers.
- Then apply to simple sidebar headers: Assets, AI Chat, Table View, Workflow, Web section headers, Prompt Studio.
- Apply to single-row main headers only: Documents toolbar, Journal header, Workflow header, Prompt Studio header, Web tab strip.
- Do not add new decorative headers just for symmetry.

Validation:
- Typecheck/build/contrast.
- Screenshot module switching and verify borders align.

**Phase 2: Shared Inline Rename Hardening**

Scope: rename behavior foundation, not every module yet.

- Harden `InlineRename.svelte` before adoption:
  - prevent double commit from Enter plus blur;
  - ensure Escape cancels and suppresses blur commit;
  - expose consistent `onCommit`, `onCancel`, `ariaLabel`;
  - keep autofocus/select behavior.
- Replace Documents’ local rename input with `InlineRename`.
- Keep existing Documents command registration and rename semantics intact.

Validation:
- Rename document.
- Blank rename rejected.
- Escape cancels.
- Enter commits once.
- Active document and unsaved editor draft survive.

**Phase 3: Settings-Backed Persistence Helper**

Scope: remove repeated module adapter boilerplate carefully.

- Create a small renderer helper for settings-backed module slices:
  - loads snapshot by workspace id;
  - guards against async workspace-switch races;
  - avoids saving defaults before hydration;
  - subscribes to slice changes and persists snapshots.
- Migrate one low-risk module first: Journal.
- Validate.
- Then migrate Assets, Workflow, Table View, Web one at a time.

Do not migrate AI Chat or Documents here; they already use stronger shell/SQLite paths.

Validation:
- Switch workspaces.
- Reload app.
- Confirm selected item and persisted module state survive.
- Confirm no module writes default state over saved state during startup.

**Phase 4: Universal Rename Wiring**

Scope: user-owned named items only.

- Use the hardened `InlineRename` across:
  - Journal entries
  - Assets display labels
  - AI chats
  - Prompt templates
  - Workflow profiles or prompt chains
  - Web bookmarks
- Normalize blank-label handling at the UI edge.
- Keep asset rename as display-label only; never filesystem rename.
- Keep Web bookmark title separate from page/tab/history title.

Validation:
- Rename each item.
- Reload app.
- Confirm content, messages, URLs, file paths, prompt bodies, and workflow steps remain unchanged.

**Phase 5: Prompt Studio State Unification**

Scope: fix split state after rename infrastructure exists.

- Replace local `activeTemplateId` in `promptstudio/NavView.svelte` with shared `selectedAiTemplateId`.
- Make `MainView.svelte` read selected template from shared store.
- Preserve dirty local edits intentionally:
  - either keep an edit draft per template;
  - or warn/avoid switching if there are unsaved edits.
- Rename template without resetting prompt body, variables, provider settings, or output preview.

Validation:
- Select template in nav and see main update.
- Edit body, rename template, confirm body remains.
- Reload and confirm selected/template state behaves predictably.

**Phase 6: Documents Nav Extraction**

Scope: only after rename and header behavior are stable.

Extract in small steps:

- `DocumentTreeRow.svelte`: row display, icon/title/rename slot.
- `DocumentTree.svelte`: recursive rendering and expansion.
- `documentTreeDrag.ts`: placement calculation and pointer/native drag helpers if extraction stays clean.
- Keep command registration in the nav container unless there is a clear better home.

Validation:
- Drag before/after/inside.
- Drag while sorted mode switches back to Manual.
- Parent-into-descendant rejection still works.
- Expand/collapse, context menu, rename, archive, create all still work.
- Unsaved editor draft survives move/rename.

**Phase 7: Settings Panel Split**

Scope: component organization only.

- Keep `SettingsPanel.svelte` as modal shell with exported `toggle()`.
- Extract sections:
  - `AppearanceSettings.svelte`
  - `EditorSettings.svelte`
  - `AiProviderSettings.svelte`
  - `SecretsSettings.svelte`
- Preserve current OpenAI key save sequence exactly.

Validation:
- Cmd+, opens settings.
- Escape/backdrop close.
- Theme switch works.
- Editor settings persist.
- OpenAI key/provider flow still works.
- Generic secrets CRUD still works.

**Phase 8: Capture Harness Extraction**

Scope: startup cleanup.

- Move `maybeCaptureForEvidence` from `main/index.ts` into a dedicated file, likely `src/main/capture/evidence.ts`.
- Keep all env var names and renderer event names unchanged.
- Keep `main/index.ts` responsible only for calling the helper.

Validation:
- Run one normal app start.
- Run one screenshot capture path.
- Confirm output screenshot is created.

**Commit Strategy**

Commit after each phase, not after the whole refactor. Suggested commit messages:

- `Add shared zone header styles`
- `Refactor document rename input`
- `Add settings-backed module persistence helper`
- `Add universal rename controls`
- `Refactor prompt template selection state`
- `Refactor documents tree components`
- `Split settings panel sections`
- `Extract screenshot capture harness`

The safest first slice is Phase 1 only. It supports the current header-alignment goal, is visually easy to verify, and does not touch persistence or drag/drop.