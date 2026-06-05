**Refactor Plan**

**Goal:** reduce duplicated UI/state patterns without changing app behavior.  
**Rule:** one refactor family per pass; no feature work bundled into cleanup.

**Phase 0 outcome (2026-06-05):** baseline safety check passed before new refactor edits.

- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- Screenshot evidence captured locally:
  - `implementation/screenshots/refactor-phase0-baseline-documents-2026-06-05.png`
  - `implementation/screenshots/refactor-phase0-baseline-promptstudio-2026-06-05.png`
  - `implementation/screenshots/refactor-phase0-baseline-web-2026-06-05.png`
  - `implementation/screenshots/refactor-phase0-baseline-settings-2026-06-05.png`
  - `implementation/screenshots/refactor-phase0-baseline-journal-2026-06-05.png`

**Phase 3A outcome (2026-06-05):** added the shared settings-backed persistence helper and migrated Journal only.

- Added `app-shell/src/renderer/src/modules/settings-backed-persistence.ts`.
- Replaced Journal's local load/hydrate/save boilerplate with `connectSettingsBackedPersistence`.
- Kept the existing Journal settings key: `modules.journal.<workspaceId>.state`.
- Guarded async workspace-switch races with a load version and active workspace check.
- Avoided saving until after the matching workspace snapshot has hydrated, so startup does not persist defaults before hydration completes.
- Deferred Assets, Workflow, Table View, and Web migration to later Phase 3 passes.
- Validation:
  - `npm run typecheck`
  - `npm run build`
  - `npm run audit:contrast`
  - Screenshot evidence: `implementation/screenshots/refactor-phase3-journal-helper-after-2026-06-05.png`

**Phase 3B outcome (2026-06-05):** migrated Assets to the shared settings-backed persistence helper.

- Replaced Assets' local load/hydrate/save boilerplate with `connectSettingsBackedPersistence`.
- Kept the existing Assets settings key: `modules.assets.<workspaceId>.state`.
- Preserved Assets slice behavior for selected asset, asset labels, file paths, import metadata, reveal, copy path, and removal.
- Deferred Workflow, Table View, and Web migration to later Phase 3 passes.
- Validation:
  - `npm run typecheck`
  - `npm run build`
  - `npm run audit:contrast`
  - Screenshot evidence: `implementation/screenshots/refactor-phase3-assets-helper-after-2026-06-05.png`

**Phase 3C outcome (2026-06-05):** migrated Workflow to the shared settings-backed persistence helper.

- Replaced Workflow's local load/hydrate/save boilerplate with `connectSettingsBackedPersistence`.
- Kept the existing Workflow settings key: `modules.workflow.<workspaceId>.state`.
- Preserved Workflow profile selection, renamed profile names, context toggles, proposal toggle, and prompt text behavior.
- Deferred Table View and Web migration to later Phase 3 passes.
- Validation:
  - `npm run typecheck`
  - `npm run build`
  - `npm run audit:contrast`
  - Screenshot evidence: `implementation/screenshots/refactor-phase3-workflow-helper-after-2026-06-05.png`

**Phase 3D outcome (2026-06-05):** migrated Table View to the shared settings-backed persistence helper.

- Replaced Table View's local load/hydrate/save boilerplate with `connectSettingsBackedPersistence`.
- Kept the existing Table View settings key: `modules.tableview.<workspaceId>.state`.
- Preserved the separate live Documents subscription for table rows; only filter, sort, and selected row state remain settings-backed.
- Deferred Web migration to the final Phase 3 pass.
- Validation:
  - `npm run typecheck`
  - `npm run build`
  - `npm run audit:contrast`
  - Screenshot evidence: `implementation/screenshots/refactor-phase3-tableview-helper-after-2026-06-05.png`

**Phase 3E outcome (2026-06-05):** migrated Web to the shared settings-backed persistence helper and completed Phase 3 module migrations.

- Replaced Web's local load/hydrate/save boilerplate with `connectSettingsBackedPersistence`.
- Kept the existing Web settings key: `modules.web.<workspaceId>.state`.
- Preserved Web snapshot behavior for bookmarks, selected bookmark, tabs, active tab, global history, and v1-to-v2 migration.
- Completed the planned settings-backed helper migrations for Journal, Assets, Workflow, Table View, and Web.
- Validation:
  - `npm run typecheck`
  - `npm run build`
  - `npm run audit:contrast`
  - Screenshot evidence: `implementation/screenshots/refactor-phase3-web-helper-after-2026-06-05.png`

**Phase 6A outcome (2026-06-05):** extracted the Documents tree row presentation component.

- Added `app-shell/src/renderer/src/modules/documents/DocumentTreeRow.svelte`.
- Moved row markup and row-scoped styles out of `Documents/NavView.svelte`.
- Kept recursive tree rendering, command registration, rename state, context menus, native drag/drop, pointer drag, expansion state, and archive/create behavior in `NavView.svelte`.
- Did not extract `DocumentTree.svelte` or `documentTreeDrag.ts` in this sub-slice.
- Validation:
  - Svelte autofixer clean for `DocumentTreeRow.svelte`
  - Svelte autofixer clean for `NavView.svelte`
  - `npm run typecheck`
  - `npm run build`
  - `npm run audit:contrast`
  - Screenshot evidence:
    - `implementation/screenshots/refactor-phase6-document-tree-row-after-2026-06-05.png`
    - `implementation/screenshots/refactor-phase6-document-tree-row-selected-after-2026-06-05.png`

**Phase 6B outcome (2026-06-05):** extracted the Documents tree recursive renderer.

- Added `app-shell/src/renderer/src/modules/documents/DocumentTree.svelte`.
- Moved recursive row rendering and child expansion markup out of `Documents/NavView.svelte`.
- Kept expansion state, display-icon decisions, command registration, rename state, context menus, native drag/drop, pointer drag, archive, and create behavior in `NavView.svelte`.
- Did not extract `documentTreeDrag.ts` in this sub-slice.
- Validation:
  - Svelte autofixer clean for `DocumentTree.svelte`
  - Svelte autofixer clean for `NavView.svelte`
  - `npm run typecheck`
  - `npm run build`
  - `npm run audit:contrast`
  - Screenshot evidence:
    - `implementation/screenshots/refactor-phase6-document-tree-after-2026-06-05.png`
    - `implementation/screenshots/refactor-phase6-document-tree-selected-after-2026-06-05.png`

**Phase 6C outcome (2026-06-05):** extracted Documents tree drag helpers.

- Added `app-shell/src/renderer/src/modules/documents/documentTreeDrag.ts`.
- Moved pure drag helper logic for pointer drag threshold, native drag payload/effects, drop placement calculation, internal drag-leave detection, and pointer target lookup out of `Documents/NavView.svelte`.
- Kept drag state, document move calls, command registration, rename state, context menus, archive, create, and expansion updates in `NavView.svelte`.
- Validation:
  - Svelte autofixer clean for `NavView.svelte`
  - `npm run typecheck`
  - `npm run build`
  - `npm run audit:contrast`
  - Screenshot evidence:
    - `implementation/screenshots/refactor-phase6-document-tree-drag-helper-after-2026-06-05.png`

**Phase 7A outcome (2026-06-05):** extracted the Settings appearance section.

- Added `app-shell/src/renderer/src/shell/AppearanceSettings.svelte`.
- Moved theme selector state, markup, and scoped theme-selector styles out of `SettingsPanel.svelte`.
- Kept `SettingsPanel.svelte` as the modal shell with exported `toggle()`.
- Kept editor, AI provider, OpenAI key save sequence, and generic secrets CRUD in `SettingsPanel.svelte`.
- Applied the Svelte autofixer's small existing editor-control cleanup in `SettingsPanel.svelte`: keyed option loops and read editor settings directly from the store instead of mirrored local state.
- Deferred `EditorSettings.svelte`, `AiProviderSettings.svelte`, and `SecretsSettings.svelte` to later narrow Phase 7 passes.
- Validation:
  - Svelte autofixer clean for `AppearanceSettings.svelte`
  - Svelte autofixer clean for `SettingsPanel.svelte`
  - `npm run typecheck`
  - `npm run build`
  - `npm run audit:contrast`
  - Screenshot evidence:
    - `implementation/screenshots/refactor-phase7-appearance-settings-after-2026-06-05.png`

**Phase 7B outcome (2026-06-05):** extracted the Settings editor section.

- Added `app-shell/src/renderer/src/shell/EditorSettings.svelte`.
- Moved editor font family, font size, spellcheck controls, option data, persistence helper, and toggle styles out of `SettingsPanel.svelte`.
- Preserved the existing editor settings path: update `editorSettings` and persist through `window.shell.settings.set('editor.<key>', value)`.
- Kept `SettingsPanel.svelte` as the modal shell with exported `toggle()`.
- Kept AI provider, OpenAI key save sequence, and generic secrets CRUD in `SettingsPanel.svelte`.
- Deferred `AiProviderSettings.svelte` and `SecretsSettings.svelte` to later narrow Phase 7 passes.
- Validation:
  - Svelte autofixer clean for `EditorSettings.svelte`
  - Svelte autofixer clean for `SettingsPanel.svelte`
  - `npm run typecheck`
  - `npm run build`
  - `npm run audit:contrast`
  - Screenshot evidence:
    - `implementation/screenshots/refactor-phase7-editor-settings-after-2026-06-05.png`

**Phase 7C outcome (2026-06-05):** extracted the Settings AI provider section.

- Added `app-shell/src/renderer/src/shell/AiProviderSettings.svelte`.
- Moved AI provider mode, active-provider status, OpenAI key shortcut, model selector, custom model input, temperature control, provider-derived state, and provider-scoped styles out of `SettingsPanel.svelte`.
- Preserved the existing OpenAI key save sequence: store `OPENAI_API_KEY`, mark it stored, select `openai-responses`, refresh secrets, refresh AI providers, then select `openai-responses` again.
- Kept `SettingsPanel.svelte` as the modal shell with exported `toggle()`.
- Kept generic secrets CRUD in `SettingsPanel.svelte`.
- Deferred `SecretsSettings.svelte` to the final narrow Phase 7 pass.
- Validation:
  - Svelte autofixer clean for `AiProviderSettings.svelte`
  - Svelte autofixer clean for `SettingsPanel.svelte`
  - `npm run typecheck`
  - `npm run build`
  - `npm run audit:contrast`
  - Screenshot evidence:
    - `implementation/screenshots/refactor-phase7-ai-provider-settings-after-2026-06-05.png`

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
