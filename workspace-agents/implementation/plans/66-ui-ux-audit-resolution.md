# Plan 66 - UI/UX Audit Resolution

## Goal & Scope

Resolve the targeted issues in `workspace-agents/implementation/ui-ux-audit-2026-06-26/APP_SHELL_UI_UX_REVIEW.md` through narrow, verified UI slices. This plan prioritizes disclosure, empty-state guidance, copy, and hierarchy. It does not redesign the shell, token system, module contract, persistence, or AI substrate.

## Anchor

- Audit: `workspace-agents/implementation/ui-ux-audit-2026-06-26/APP_SHELL_UI_UX_REVIEW.md`
- Architecture: `docs/architecture/shell-platform-spec.md` section 12, especially fixed zones, Svelte UI layer, local-first shell, and module boundaries.
- Contract: `docs/architecture/module-contract.md` section 4 and section 5. Modules fill shell zones through existing Svelte views and must not patch shell internals.

## Current Findings From Code Inspection

- Empty and narrow-state copy is mostly local to `app-shell/src/renderer/src/modules/documents/MainView.svelte`, `app-shell/src/renderer/src/modules/workflow/MainView.svelte`, and shell layout state in `app-shell/src/renderer/src/shell/AppShell.svelte`.
- AI density is concentrated in existing inspector components and shared run history: `modules/aichat/InspectorView.svelte`, `modules/promptstudio/InspectorView.svelte`, `modules/documents/InspectorView.svelte`, and `shell/RunHistoryList.svelte`.
- Prompt Studio navigation density is local to `modules/promptstudio/NavView.svelte`; the main workspace can be improved without new state by reducing always-on bands and copy weight.
- Table View filter density is local to `modules/tableview/MainView.svelte`.
- Settings wording is local to settings section components, especially `ModulePluginSettings.svelte`, `DemoModeSettings.svelte`, and `AiProviderSettings.svelte`.
- Assets already provides the reference hierarchy: primary work object first, metadata and controls secondary.

## Subagent Strategy

- Explorer subagent: review this plan and the audit for scope creep, missing acceptance criteria, and unsafe slice boundaries before implementation.
- Worker subagents: use only for disjoint implementation slices with non-overlapping ownership. Good candidates are Settings wording and Table View filter disclosure because they should not overlap with AI inspector work.
- QA subagent: after screenshots are captured, inspect evidence against the audit goals: visual hierarchy, density, narrow-state recovery, and usability. The lead agent still owns final acceptance.

## Audit Disposition Matrix

| Audit item | Disposition |
|---|---|
| P1 empty states and narrow-state guidance | Covered by Slice 1. |
| P1 AI surfaces expose too much machinery | Covered by Slice 2 and Slice 6. Documents AI is required in Slice 2 unless explicitly deferred before implementation with component-risk evidence. |
| P1 Prompt Studio navigation is visually heavy | Covered by Slice 3. Focused edit mode and fully hiding variables/output until preview/run are deferred as larger interaction-model changes. |
| P1 Table View exposes filter machinery | Covered by Slice 4. |
| P2 shell chrome gives utilities equal priority | Deferred. This pass focuses on module work surfaces; shell chrome needs a separate layout/priority pass because it affects all modules. |
| P2 Settings language is user-hostile | Covered by Slice 5. |
| P2 Run history is too technical by default | Covered by Slice 6. |
| P2 narrow layout collapses panels without replacing function | Partially covered by Slice 1 copy/action guidance. Drawer/sidebar behavior is deferred unless deliberately scoped because `AppShell.svelte` currently collapses those zones to `0px` below 900px. |
| P3 Assets hierarchy reference | Reference-only. Assets is not changed except as a heuristic. The empty library affordance is deferred because the requested priority list does not include Assets implementation work. |
| Command palette density | Deferred. It is noted in the audit but not in the requested priority list. |
| Documents archived folders consuming sidebar space | Deferred. This is sidebar information architecture rather than the current empty-state/inspector/filter pass. |
| Prompt Studio "No runner registered" toast state | Deferred unless it appears in validation as a regression blocker; the current slices avoid changing runner registration. |

## Slice 1 - Empty States And Narrow-State Guidance

### Scope

Make the first impression useful when no object is selected, and make narrow copy stop pointing to hidden panels.

### Files / Areas

- `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `app-shell/src/renderer/src/modules/workflow/MainView.svelte`
- `app-shell/src/renderer/src/shell/AppShell.svelte` only if a shell-level narrow affordance is directly required.

### Approach

1. Add action-oriented empty copy for Documents: open/select guidance, create/command affordance if an existing command path is available, and narrow-aware wording that references the hidden document list only when visible.
2. Improve Workflow Runner empty state by showing what the selected chain does, current prompt summary, context status, and the existing Run Chain action rather than only "No recent runs."
3. Do not add a narrow drawer or "show tree" button unless shell behavior is deliberately changed in this slice. Otherwise, narrow recovery should use copy and existing global affordances such as the command palette.
4. Avoid new document creation flows, new drawers, or layout persistence changes unless the existing command/visibility controls already support the action.

### Acceptance Criteria

- Documents default empty state explains the next action without feeling broken.
- Narrow Documents state does not tell the user to use a hidden manuscript tree.
- Workflow Runner default gives useful chain context before the first run, using current profile fields. Step visualization, persisted last output, and draft/ready explanations beyond the existing status field are deferred unless existing state already exposes them.
- No new shell zones, persistence fields, IPC channels, or module contract changes.

### Validation

- `npm run typecheck`
- `npm run build`
- Screenshot evidence:
  - `workspace-agents/implementation/screenshots/uiux-empty-states-documents-after-2026-06-26.png`
  - `workspace-agents/implementation/screenshots/uiux-empty-states-documents-narrow-after-2026-06-26.png`
  - `workspace-agents/implementation/screenshots/uiux-empty-states-workflow-after-2026-06-26.png`

## Slice 2 - AI Inspector Progressive Disclosure

### Scope

Reduce default AI inspector density so the next action and current result are primary, while keeping advanced model/context/history controls available.

### Files / Areas

- `app-shell/src/renderer/src/modules/aichat/InspectorView.svelte`
- `app-shell/src/renderer/src/modules/promptstudio/InspectorView.svelte`
- `app-shell/src/renderer/src/modules/documents/InspectorView.svelte`

### Approach

1. Use native `<details>` or existing section styling for progressive sections: Context, Model/Settings, Run History, Developer/Audit.
2. Keep the default-open content focused on "Run" or current context summary. Collapse provider/model/temperature unless the user opens settings.
3. Preserve existing stores and controls; this is disclosure and hierarchy, not new AI capability.
4. Treat Documents AI as in-scope for this slice unless pre-implementation inspection shows that a safe density reduction would require a broader inspector rewrite.

### Acceptance Criteria

- AI Chat inspector no longer shows context tree, model tuning, and full run history all expanded by default.
- Prompt Studio inspector keeps run readiness visible and moves model/context/history detail behind disclosure.
- Documents AI inspector is handled or explicitly deferred before implementation with a concrete reason if the component risk is too high for this pass.

### Validation

- `svelte_autofixer` on edited Svelte components.
- `npm run typecheck`
- `npm run build`
- Screenshot evidence:
  - `workspace-agents/implementation/screenshots/uiux-ai-chat-inspector-after-2026-06-26.png`
  - `workspace-agents/implementation/screenshots/uiux-promptstudio-inspector-after-2026-06-26.png`
  - Documents AI screenshot only if edited in this slice.

## Slice 3 - Prompt Studio Navigation Density

### Scope

Make template navigation faster to scan without changing template storage or behavior.

### Files / Areas

- `app-shell/src/renderer/src/modules/promptstudio/NavView.svelte`
- `app-shell/src/renderer/src/modules/promptstudio/MainView.svelte` only for minor hierarchy or copy changes directly tied to the audit.

### Approach

1. Compact template rows to one or two stable lines with title ellipsis.
2. Replace long comma metadata with compact chips/counts and demote protected/internal labels.
3. Move secondary row actions behind quieter icon/text controls already present in the row; do not add a new menu dependency unless necessary.
4. Keep Import/Export and archive behavior intact.

### Acceptance Criteria

- The template list scans faster and row height is reduced.
- Secondary actions are available but not equal-weight with opening/selecting a template.
- Main workspace keeps Run Template and Preview Prompt visually primary; focused edit mode and hiding variables/output bands are deferred.
- No new template schema, no new command system work, and no prompt execution behavior changes.

### Validation

- `svelte_autofixer` on edited Svelte components.
- `npm run typecheck`
- `npm run build`
- Screenshot evidence:
  - `workspace-agents/implementation/screenshots/uiux-promptstudio-nav-after-2026-06-26.png`

## Slice 4 - Table View Filter Disclosure

### Scope

Keep search, sort, and active filters visible while moving advanced filter machinery behind a disclosure control.

### Files / Areas

- `app-shell/src/renderer/src/modules/tableview/MainView.svelte`

### Approach

1. Add a local UI-only `filtersOpen` state.
2. Keep search, sort, reset, count summary, and active filter chips visible.
3. Move folder, kind, word count, date, and regex mode into an "Filters" disclosure area.
4. Open the disclosure automatically when filters are active only if that improves clarity without surprising the user.

### Acceptance Criteria

- Default Table View no longer presents a full query-builder row.
- Active filters remain visible and clearable.
- Existing capture filter hooks and bulk tools still work.

### Validation

- `svelte_autofixer` on edited Svelte component.
- `npm run typecheck`
- `npm run build`
- Screenshot evidence:
  - `workspace-agents/implementation/screenshots/uiux-table-filters-after-2026-06-26.png`
  - Optional active-filter screenshot if the disclosure behavior changes active-filter presentation.

## Slice 5 - Settings Wording And Grouping

### Scope

Make settings read as end-user tools/features rather than implementation plumbing.

### Files / Areas

- `app-shell/src/renderer/src/shell/ModulePluginSettings.svelte`
- `app-shell/src/renderer/src/shell/DemoModeSettings.svelte`
- `app-shell/src/renderer/src/shell/AiProviderSettings.svelte`
- `app-shell/src/renderer/src/shell/SettingsPanel.svelte` only if grouping order needs to change.

### Approach

1. Rename visible "Plugins" language to "Tools" or "Features" while keeping internal ids and module terminology unchanged.
2. Reword AI settings around "AI Tools" or "Model Settings."
3. Keep demo/developer controls visually secondary and clearly scoped.
4. Do not change module enablement behavior or settings storage keys.

### Acceptance Criteria

- Search and headings no longer make packaged settings feel like a plugin developer console.
- AI setup reads like user-facing model configuration.
- Demo mode remains available but does not dominate ordinary settings.

### Validation

- `svelte_autofixer` on edited Svelte components.
- `npm run typecheck`
- `npm run build`
- Screenshot evidence:
  - `workspace-agents/implementation/screenshots/uiux-settings-wording-after-2026-06-26.png`

## Slice 6 - Run History Summary / Detail Split

### Scope

Make run history useful by default without exposing raw IDs and full prompt/debug detail until requested.

### Files / Areas

- `app-shell/src/renderer/src/shell/RunHistoryList.svelte`
- Optional consumers only if props are needed: Prompt Studio, AI Chat, Documents.

### Approach

1. Keep summary cards to status, time, origin/template/conversation, compact output/error excerpt, and "Use Settings" when available.
2. Improve the expanded state: keep useful result summary and reuse actions immediately visible, and move provider/model/temperature/origin ID/run ID and full output behind a nested "Details" or "Audit" disclosure.
3. If rendered prompt is not currently part of `AiRun`, do not add it in this slice.

### Acceptance Criteria

- Default run history shows what happened and what can be reused.
- Raw run metadata is no longer the default visual payload.
- Existing "Use Settings" behavior still works.

### Validation

- `svelte_autofixer` on edited Svelte component.
- `npm run typecheck`
- `npm run build`
- Screenshot evidence:
  - `workspace-agents/implementation/screenshots/uiux-run-history-summary-after-2026-06-26.png`

## Slice 7 - Module-Specific Default Inspector Behavior

### Scope

Only adjust default inspector visibility if the earlier slices still leave metadata inspectors open where they actively compete with the module task.

### Files / Areas

- `app-shell/src/renderer/src/shell/AppShell.svelte`
- Shell layout persistence service only if already designed for module-aware defaults.

### Approach

1. Reassess after Slices 1-6 screenshots.
2. Prefer no code if disclosure solves the density problem.
3. If needed, add the smallest module-aware default that respects user layout toggles and persistence.

### Acceptance Criteria

- Either implemented with clear module-specific benefit, or deferred because disclosure and empty states are enough.
- No surprising override of persisted user layout.

### Validation

- `npm run typecheck`
- `npm run build`
- Screenshot evidence only if implemented.

## Cross-Slice Validation And Closeout

For each implemented slice:

1. Inspect diff for bloat: list new files, exports, types, helpers, IPC channels, and schema fields. Remove anything not exercised.
2. Run `git diff --check`.
3. Run Svelte autofixer on changed Svelte components.
4. Run `npm run typecheck` and `npm run build` from `app-shell/`.
5. Capture required `SHELL_CAPTURE` screenshots.
6. Inspect screenshots manually.
7. Use QA subagent to review evidence before accepting the visual result.
8. Update this plan with outcome, validation commands, evidence paths, deferrals, and commit hash.
9. Commit and push the verified slice.

At final closeout:

- Create `workspace-agents/session-handoffs/HANDOFF_73.md`.
- Summarize completed slices, commits, validation, screenshot evidence, and remaining deferred issues.
- Confirm working tree is clean and pushed.

## Explicit Out Of Scope

- Token-system rewrite.
- Broad shell redesign.
- New permanent panels or zones.
- New AI features, prompt schemas, provider profiles, or run replay.
- New database schema or IPC channels unless a specific acceptance criterion proves it necessary.
- Reworking Assets, except as a visual reference.
- Command palette redesign unless it becomes a direct dependency of narrow empty-state recovery.

## Outcome Log

### 2026-06-26 - Slice 1 Empty States And Narrow-State Guidance

Status: implemented, pending commit.

Changed:

- `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `app-shell/src/renderer/src/modules/workflow/MainView.svelte`

Outcome:

- Documents empty state now presents a Manuscript-focused prompt, a primary New Chapter action, and a Command Palette recovery action.
- Documents narrow state uses separate responsive copy and no longer points to the hidden manuscript tree.
- Workflow Runner no longer opens to only "No recent runs"; it shows selected chain format/status, prompt summary, included context scope, and next step.
- Workflow step visualization and persisted last output remain deferred because the current workflow profile state only exposes `name`, `format`, `status`, and `prompt`.

Validation:

- `svelte_autofixer` clean on `documents/MainView.svelte`.
- `svelte_autofixer` clean on `workflow/MainView.svelte`.
- `npm run typecheck`
- `npm run build`
- `git diff --check`

Evidence:

- `workspace-agents/implementation/screenshots/uiux-empty-states-documents-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-empty-states-documents-narrow-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-empty-states-workflow-after-2026-06-26.png`

Notes:

- The persistent failed Jobs toast remains visible in screenshots. This is part of the audit's shell chrome/job-state concern and is deferred outside Slice 1.
- QA subagent accepted the screenshots for the Slice 1 goal. Follow-ups deferred: richer Documents inspector empty-state copy and clearer Workflow missing-active-context messaging.

### 2026-06-26 - Slice 2 AI Inspector Progressive Disclosure

Status: completed in commit pending.

Changed:

- `app-shell/src/renderer/src/modules/aichat/InspectorView.svelte`
- `app-shell/src/renderer/src/modules/promptstudio/InspectorView.svelte`
- `app-shell/src/renderer/src/modules/documents/InspectorView.svelte`

Outcome:

- AI Chat inspector now defaults to compact Context, Model, and Runs disclosure summaries instead of expanded context tree, model controls, and run history.
- Prompt Studio inspector now keeps Run Readiness visible while Model Settings, Context, and Run History are collapsed by default.
- Documents AI keeps instruction, primary run actions, preview send controls, and proposal/result status visible while preview actions and rendered prompt/audit variables sit behind nested disclosure.
- No AI store, provider, run, prompt, or persistence behavior changed.

Validation:

- `svelte_autofixer` clean on `aichat/InspectorView.svelte`.
- `svelte_autofixer` clean on `promptstudio/InspectorView.svelte`.
- `svelte_autofixer` clean on `documents/InspectorView.svelte`.
- `npm run typecheck`
- `npm run build`
- `git diff --check`

Evidence:

- `workspace-agents/implementation/screenshots/uiux-ai-chat-inspector-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-promptstudio-inspector-after-2026-06-26.png`
- `workspace-agents/implementation/screenshots/uiux-documents-ai-inspector-after-2026-06-26.png`

Notes:

- Documents still has several AI actions because those are the primary task controls; only preview/audit machinery was demoted.
- QA subagent accepted the screenshots for the Slice 2 goal. Follow-ups deferred: compact Documents AI run metadata chips/status and Prompt Studio left-nav wrapping, which belongs to Slice 3.

### 2026-06-26 - Slice 3 Prompt Studio Navigation Density

Status: implemented, pending QA and commit.

Changed:

- `app-shell/src/renderer/src/modules/promptstudio/NavView.svelte`

Outcome:

- Template rows now use stable compact height, ellipsized titles, and compact metadata rather than long comma-separated tag text.
- Built-in and tag metadata is summarized as a small label/count.
- Secondary row actions remain available on hover/active state but no longer wrap into tall rows.
- Import/export, archive, duplicate, rename, restore, and delete behavior remains unchanged.

Validation:

- `svelte_autofixer` clean on `promptstudio/NavView.svelte`.
- `npm run typecheck`
- `npm run build`
- `git diff --check`

Evidence:

- `workspace-agents/implementation/screenshots/uiux-promptstudio-nav-after-2026-06-26.png`

Notes:

- Focused edit mode and hiding variables/output bands remain deferred as planned; this slice only targeted navigation density.
- QA subagent accepted the screenshot for the Slice 3 goal. Follow-ups deferred: full-title affordance for truncated rows and lower-weight icon treatment for row actions.

### 2026-06-26 - Slice 4 Table View Filter Disclosure

Status: implemented, pending QA and commit.

Changed:

- `app-shell/src/renderer/src/modules/tableview/MainView.svelte`

Outcome:

- Default Table View now shows search, sort, filter disclosure, reset, result summary, active filter chips, and the table.
- Advanced controls for text/regex mode, folder, kind, word count, and date now sit behind a local Filters disclosure.
- Existing filter handlers, active chips, reset behavior, bulk controls, and `data-capture-*` hooks remain in place.
- Worker subagent implemented the single-file patch; lead agent inspected the diff and ran validation.
- QA subagent accepted the screenshot for the Slice 4 goal. Lead agent added a visible chevron and active filter count after QA noted the disclosure could use a clearer affordance.

Validation:

- `svelte_autofixer` clean on `tableview/MainView.svelte`.
- `npm run typecheck`
- `npm run build`
- `git diff --check`

Evidence:

- `workspace-agents/implementation/screenshots/uiux-table-filters-after-2026-06-26.png`

Notes:

- No persistence was added for the disclosure state; it remains local UI state to avoid broadening the slice.
