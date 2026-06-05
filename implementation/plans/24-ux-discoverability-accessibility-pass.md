# Plan 24 - UX Discoverability And Accessibility Pass

## Summary

Address the deeper UX issues intentionally deferred from Plan 23: make AI Chat useful before the first message, make the activity rail understandable and keyboard-friendly, make the Documents inspector earn its space, calm manuscript table styling, and replace screenshot-only contrast checks with measured accessibility targets.

This is a focused UX hardening pass over the Plan 21 fixed-zone layout, the Plan 22 Jewel Box token/theme layer, and the Plan 23 chrome ownership decisions. It should not reopen shell architecture.

## Anchors

- `0-shell-platform-spec.md` §12 Q7: the shell owns fixed zones; modules fill existing zones only.
- `0-shell-platform-spec.md` §12 Q9: theming is a documented token API, not one-off private component colors.
- `3-module-contract.md` §5: modules use `ModuleContext`; this slice must not change that contract.
- `implementation/plans/21-layout-design-pass.md`: preserve fixed shell zones, context strip, full-width status bar, saved layout behavior, and inspector default behavior.
- `implementation/plans/22-jewel-box-css-pass.md`: preserve Jewel Box tokens and role-based shell surfaces.
- `implementation/plans/23-chrome-dedupe-and-product-language.md`: preserve workspace/title/status ownership and product-language cleanup.
- `implementation/user_feedback/user_01_feedback.md` and `implementation/user_feedback/user_02_feedback.md`: source feedback for rail discoverability, inspector language, AI Chat empty state, editorial tables, and measured contrast.

## Non-Negotiable Boundaries

- Do not change `ModuleContext`, IPC contracts, module activation, document persistence semantics, or database schema.
- Do not add database migrations. Plan 24 is achievable with renderer state, existing AI context candidates, CSS tokens, and shell/component markup.
- Preserve fixed-zone shell architecture, context strip ownership, full-width status bar, Plan 23 chrome dedupe decisions, persisted resize/toggle/zen behavior, and current saved layout state behavior.
- Do not add new shell regions. The rail More popover is an overlay attached to the existing rail, not a new panel zone.
- Do not deeply redesign every module. Touch non-Documents modules only where required for rail grouping, labels, focus behavior, and contrast.

## Design Decisions

### AI Chat Empty State

- Replace the blank chat canvas with an empty state when there is no selected conversation or the selected conversation has no messages.
- Empty state should be writer-facing and action-oriented, not explanatory product copy.
- Suggested prompts should be visible as compact buttons:
  - `Analyze pacing`
  - `Find continuity issues`
  - `Suggest a stronger opening`
  - `Summarize this chapter`
  - `Question the character motivation`
- Clicking a suggested prompt should populate and focus the input, not auto-send. Sending remains explicit.
- Reuse existing AI context candidate state from `app-shell/src/renderer/src/store/ai.ts`; do not create a new attachment persistence model.
- Add a small `Context` affordance inside or adjacent to the input:
  - Shows included context count when candidates exist, e.g. `Context 2`.
  - Opens a compact popover/list of available context candidates with included/excluded toggles using `toggleAiContextCandidate`.
  - If no document/context is available, shows a disabled or quiet state with user-facing text such as `No manuscript context`.
- Add an attachment affordance only as a disabled/future affordance if real file attachment is not implemented in this slice. It must not imply files are attached when they are not.
- Make the send button quieter while input is empty and visually primary only once text exists.

### Rail Discoverability

- Keep the rail as the shell-owned module navigation surface.
- Add grouping inside `ActivityRail.svelte` without changing manifests:
  - Primary visible modules: Documents, AI Chat, Journal, Assets.
  - Advanced modules behind `More`: Workflow Runner, Table View, Web, Prompt Studio.
  - Settings remains bottom utility.
- The `More` button should open a compact flyout from the existing rail. Selecting an advanced module activates it through the same `onSelect(mod.id)` path as visible rail items.
- If the active module is advanced, the More button should show active state and an accessible label like `More modules, Web active`.
- Add consistent accessible names and visible focus treatment to every rail control. Native `title` can remain as a fallback, but the implementation should provide a consistent tooltip pattern rather than relying only on browser title behavior.
- Add keyboard behavior:
  - Rail buttons use a roving `tabindex` pattern or equivalent single-tab-stop navigation.
  - Arrow Up/Down moves through visible rail items.
  - Enter/Space activates the focused item.
  - Home/End jump to first/last visible rail control.
  - Esc closes the More flyout.
- Do not make the rail wider or add permanent text labels; discoverability comes from grouping, tooltips, focus states, and the More menu.

### Inspector Usefulness

- In the Documents inspector, remove collapsible treatment from metadata-only sections. A six-row metadata panel should be flat and scannable.
- Rename `History` to `Snapshots`.
- Keep the underlying `document_versions` data and code-level `versions` naming unchanged unless a small local variable rename improves readability. This is a UI language change, not a data model change.
- Resolve saved/current/snapshot language:
  - Status bar owns current save state: `saved` / `unsaved`.
  - Inspector Snapshots explains previous preserved states.
  - Empty state should say: `No snapshots yet. Earlier saved text will appear here after this document changes.`
  - Do not say `save to create one` while the app also says the current document is saved.
- Keep Title in the inspector only if the inspector remains a facts panel; avoid adding duplicate prominence. The editor header remains the document title owner.
- Treat enum-like metadata consistently. `Kind` and `Format` should both be plain fields or both compact chips; prefer plain fields unless a chip has a real scanning benefit.

### Editorial Table Styling

- Make manuscript tables feel like document content, not app chrome.
- Add document-editor table role tokens in `tokens.css`, for example:
  - `--editor-table-border`
  - `--editor-table-header-bg`
  - `--editor-table-header-fg`
  - `--editor-table-cell-bg`
  - `--editor-table-selection`
  - `--editor-table-resize`
- Apply those tokens in `Documents/MainView.svelte` TipTap table selectors.
- Reduce saturated accent usage. Borders should be quiet and consistent across dark/light themes.
- Prefer horizontal row rules and subtle header weight over heavy full grids. Preserve enough cell boundaries for editing and resizing.
- Keep TipTap table behavior unchanged, including selection and column resize handles.

### Measured Contrast And Accessibility

- Add a measured contrast audit instead of relying on screenshot sampling.
- Add `app-shell/scripts/audit-contrast.mjs` and an npm script such as `npm run audit:contrast`.
- The script should compute WCAG-style contrast ratios from token pairs in `tokens.css`, resolving simple `var(...)` chains and direct hex/rgb values.
- Minimum targets:
  - Normal and small functional text: `4.5:1`.
  - Large text and non-text UI indicators: `3:1`.
  - Focus rings against adjacent surfaces: `3:1`.
  - Disabled controls are exempt only when they are truly disabled; muted functional text is not exempt.
- Audit required pairs for both dark and light themes:
  - `--color-fg-primary`, `--color-fg-secondary`, and `--color-fg-muted` on shell topbar, rail, sidebar, main, inspector, status, and overlay surfaces.
  - Rail inactive, hover, active, and More states.
  - Context strip text/action states.
  - AI Chat placeholder/input/action states.
  - Inspector labels, values, snapshots empty text, and section titles.
  - Document table header/body/border tokens.
  - Focus ring token against shell surfaces.
- Add or adjust tokens such as `--color-focus-ring`, `--color-focus-ring-offset`, and stronger secondary/muted text roles if existing tokens cannot meet targets.
- Screenshots remain required for visual review, but contrast pass/fail must come from the audit script.

## Implementation Order

1. **Contrast foundation first**
   - Add focus and editorial table tokens in `tokens.css`.
   - Add the contrast audit script and npm script.
   - Tune text and focus tokens until the measured pairs pass for dark and light themes.

2. **Shared discoverability primitives**
   - Add consistent focus-ring CSS for shell icon/text buttons.
   - Add a lightweight tooltip pattern for rail/context controls. Keep it local to shell components unless a small reusable component is clearly cleaner.

3. **Activity rail**
   - Refactor `ActivityRail.svelte` to classify modules into visible primary modules and advanced modules.
   - Add More flyout behavior, keyboard navigation, accessible labels, focus management, and tooltip consistency.
   - Confirm module activation still uses existing module list and `onSelect` callback.

4. **AI Chat**
   - Update `modules/aichat/MainView.svelte` empty state, prompt suggestions, calmer input/send treatment, and context affordance.
   - Use existing `aiContextCandidates`, `refreshAiContext`, `toggleAiContextCandidate`, and `includedAiContextCandidates`.
   - Keep send behavior and AI invocation contract unchanged.
   - Keep `modules/aichat/NavView.svelte` grammar behavior from Plan 23.

5. **Documents inspector**
   - Update `modules/documents/InspectorView.svelte` from collapsible metadata/history sections to flat metadata plus Snapshots.
   - Rewrite empty and explanatory language so saved state and snapshots are not conflated.
   - Keep version list data loading untouched.

6. **Documents tables**
   - Update TipTap table CSS in `modules/documents/MainView.svelte` to use editorial table tokens.
   - Preserve table resize/selection affordances and markdown round-trip behavior.

7. **Validation and screenshots**
   - Run typecheck, build, contrast audit, Svelte autofixer on changed `.svelte` files, keyboard smoke checks, and screenshot captures.

## Files / Areas Touched

- `app-shell/package.json` — add contrast audit npm script.
- `app-shell/scripts/audit-contrast.mjs` — measured token contrast report.
- `app-shell/src/renderer/src/styles/tokens.css` — focus, contrast, and editorial table tokens.
- `app-shell/src/renderer/src/styles/global.css` — shared focus-visible baseline if needed.
- `app-shell/src/renderer/src/shell/ActivityRail.svelte` — grouping, More flyout, keyboard navigation, tooltips, focus states.
- `app-shell/src/renderer/src/shell/ContextStrip.svelte` — focus/tooltip consistency only if shared treatment requires it.
- `app-shell/src/renderer/src/modules/aichat/MainView.svelte` — empty state, suggestions, context affordance, input/send treatment.
- `app-shell/src/renderer/src/modules/documents/InspectorView.svelte` — flat metadata and Snapshots language.
- `app-shell/src/renderer/src/modules/documents/MainView.svelte` — editorial TipTap table styling.

## Risks And Unknowns

- `More` flyout keyboard behavior can easily become fiddly. Keep it simple and test with keyboard-only navigation before polishing visuals.
- Tooltip implementation should not create duplicate screen-reader announcements. Use `aria-label` for accessible names and keep visual tooltips presentational unless they add extra content.
- Contrast tokens may reveal that Plan 22 muted text roles are too faint across multiple surfaces. Fix at the token level where possible instead of one-off component overrides.
- AI Chat context affordance should truthfully represent current context candidates. Do not show attachment claims unless the data is actually included in `invokeAi`.
- `Snapshots` language is UI-facing. If a future slice adds manual snapshot creation, it can strengthen the metaphor, but this slice should not add persistence.

## Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
npm run audit:contrast
```

Run the Svelte autofixer on every changed `.svelte` file and resolve required fixes before final validation.

Interaction checks:

- AI Chat with no conversation or no messages shows suggested prompts and no large dead void.
- Suggested prompt click fills/focuses the input and does not auto-send.
- Send button is quiet/disabled when input is empty and works when text is present.
- AI Chat context affordance shows included context count when a document context exists and does not imply fake attachments.
- Rail tab order is predictable; arrow keys, Home/End, Enter/Space, and Esc work.
- More flyout opens, closes, activates advanced modules, and marks active advanced module state.
- Tooltips and accessible names are consistent for rail, More, settings, context strip icon actions, and ambiguous module controls.
- Documents inspector shows flat metadata and Snapshots, with no save/version contradiction.
- Document tables look quieter in both dark and light themes while remaining editable.
- Sidebar toggle, inspector toggle/Cmd+I, resize handles, zen mode, command palette, settings, jobs panel, saved layout restore, and module switching still work.

Screenshot evidence:

- `implementation/screenshots/ux-discoverability-aichat-empty-dark-after-2026-06-04.png`
- `implementation/screenshots/ux-discoverability-aichat-context-after-2026-06-04.png`
- `implementation/screenshots/ux-discoverability-rail-more-after-2026-06-04.png`
- `implementation/screenshots/ux-discoverability-documents-inspector-after-2026-06-04.png`
- `implementation/screenshots/ux-discoverability-documents-table-dark-after-2026-06-04.png`
- `implementation/screenshots/ux-discoverability-documents-table-light-after-2026-06-04.png`

Record the `npm run audit:contrast` output summary in the final implementation handoff so the contrast result is inspectable without re-running the app.

## Out Of Scope

- No implementation in this planning slice.
- No database migrations or document version schema changes.
- No new attachment persistence, file upload pipeline, or AI tool-calling workflow.
- No redesign of the Plan 21 layout, context strip, status bar, workspace switcher, or saved layout behavior.
- No global module manifest changes for rail grouping unless a later slice decides grouping belongs in manifests.
- No deep redesign of Web, Workflow Runner, Prompt Studio, Table View, Journal, or Assets internals.
- No public product rename or About/Settings version redesign.

## Implementation Result

Implemented on 2026-06-04.

- Added measured contrast tokens and `npm run audit:contrast`; dark and light measured token pairs pass Plan 24 targets.
- Added shared focus-visible treatment plus stronger action and muted text roles.
- Grouped the activity rail into primary visible modules and advanced modules behind More, with accessible names, tooltips, roving keyboard movement, and active advanced-module state.
- Replaced AI Chat's first-use void with prompt starters, an explicit context popover backed by existing AI context candidates, a disabled future attachment affordance, and quieter empty-input send treatment.
- Changed AI Chat state initialization so fresh conversations start empty and allow the new starter prompt UI to own first use.
- Flattened the Documents inspector metadata panel, renamed History to Snapshots, and removed save/snapshot contradiction from empty copy.
- Added editorial document table tokens and applied them to TipTap tables in both themes.
- Extended the dev-only `SHELL_CAPTURE` hook for Plan 24 evidence states: capture theme, inspector open, rail More open, AI context open, fresh AI conversation, and selection clearing.

Validation passed from `app-shell/`:

```bash
npm run audit:contrast
npm run typecheck
npm run build
```

Contrast audit summary:

```text
Contrast audit passed: all measured token pairs meet targets.
```

Screenshot evidence:

- `implementation/screenshots/ux-discoverability-aichat-empty-dark-after-2026-06-04.png`
- `implementation/screenshots/ux-discoverability-aichat-context-after-2026-06-04.png`
- `implementation/screenshots/ux-discoverability-rail-more-after-2026-06-04.png`
- `implementation/screenshots/ux-discoverability-documents-inspector-after-2026-06-04.png`
- `implementation/screenshots/ux-discoverability-documents-table-dark-after-2026-06-04.png`
- `implementation/screenshots/ux-discoverability-documents-table-light-after-2026-06-04.png`
