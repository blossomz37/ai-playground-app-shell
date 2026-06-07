# Plan 48 - Web Browser UI Enhancements

_Created: 2026-06-07_

## Goal

Refine the first-party Web module so the browser room reads as a usable workspace surface instead of a debug-heavy prototype. The pass should improve the Web inspector, address bar security/status affordance, Bookmarks/History navigation, toolbar hierarchy, and narrow-viewport behavior without changing the shell/module architecture.

## Canonical Plan Location

Save and maintain the implementation plan at:

`workspace-agents/implementation/plans/48-web-browser-ui-enhancements.md`

If a future agent needs to preserve a working copy elsewhere, copy from this canonical file and note the duplicate path in the relevant session handoff.

## Anchors

- `.ideas/ui-feedback-claude.md` - source feedback and priorities.
- `docs/architecture/shell-platform-spec.md` section 12 Q7/Q10/Q13 - fixed zones, future LAN/iPad client, Web module boundary.
- `docs/architecture/module-contract.md` - modules fill shell zones through the module contract.
- `workspace-agents/implementation/AGENTS.md` - planning, screenshot evidence, and validation rules.
- Current implementation:
  - `app-shell/src/renderer/src/modules/web/MainView.svelte`
  - `app-shell/src/renderer/src/modules/web/NavView.svelte`
  - `app-shell/src/renderer/src/modules/web/InspectorView.svelte`
  - `app-shell/src/shared/state/web-state.ts`
  - `app-shell/src/renderer/src/shell/ContextStrip.svelte`
  - `app-shell/src/renderer/src/shell/StatusBar.svelte`
  - `app-shell/src/renderer/src/shell/AppShell.svelte`

## Current Read

- The Web module is already a first-party bundled module, not shell core.
- The browser surface uses Electron `<webview>`, not `BrowserView`, so the feedback about BrowserView/WebContentsView bounds is not directly actionable yet.
- The Web inspector currently shows protocol, bookmark status, tab history count, history index, and persistent session state. That is useful for debugging but low-value for daily browsing.
- The left navigation stacks Bookmarks and History in one column, which will degrade as history grows.
- The shell context strip mixes icon-only controls with text actions, including `Jobs`, and the hierarchy is not clearly tied to active work.
- Existing layout primitives already support sidebar/inspector visibility, persisted sizes, resize handles, and zen mode. This plan should reuse those primitives.

## Slice Order

1. Web inspector and URL bar clarity.
2. Web navigation hierarchy and bookmark/history polish.
3. Shell toolbar/jobs hierarchy for Web-adjacent work.
4. Narrow-viewport collapse behavior and visual QA.
5. Final documentation and next-session handoff.

Each implementation slice should be completed, validated, and committed before moving to the next slice.

---

## Slice 1 - Web Inspector and URL Bar Clarity

### Objective

Make the Web inspector user-facing by default and move security/protocol state into the address bar.

### Scope

- Add a protocol/security glyph or compact status affordance inside or immediately adjacent to the URL input.
- Remove or demote the `Protocol` row from the Web inspector.
- Rework idle inspector content around page information that helps a user decide what is open:
  - Title
  - Domain or readable URL
  - Bookmark state/action
  - Current tab history preview
  - Loading state if available
- Keep the inspector inside the existing fixed inspector zone.

### Non-Goals

- Do not implement certificate inspection, permissions UI, content blocking, or browser security enforcement.
- Do not migrate away from `<webview>`.
- Do not build an agent action overlay.

### Approach

1. Add derived URL metadata in `app-shell/src/renderer/src/modules/web/state.ts` or locally in `MainView.svelte`/`InspectorView.svelte` if the metadata is purely presentational.
2. Update `MainView.svelte` so the address bar includes a lock/globe/status icon derived from the current URL.
3. Update `InspectorView.svelte` to remove debug-heavy rows and present page info with clearer hierarchy.
4. Preserve command and state behavior for navigation, reload, and bookmark toggling.
5. Keep CSS token-based and avoid platform-native styling assumptions.

### Files / Areas Touched

- `app-shell/src/renderer/src/modules/web/MainView.svelte`
- `app-shell/src/renderer/src/modules/web/InspectorView.svelte`
- Possibly `app-shell/src/renderer/src/modules/web/state.ts`

### Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
SHELL_CAPTURE_MODULE=shell.web SHELL_CAPTURE=../workspace-agents/implementation/screenshots/web-browser-inspector-url-after-2026-06-07.png npm run start
```

Required evidence:

- `workspace-agents/implementation/screenshots/web-browser-inspector-url-after-2026-06-07.png`
- Screenshot must show the Web module with the URL security/status affordance visible and the inspector no longer centered on protocol/history-index telemetry.

### Suggested Commit

`Update web browser inspector and URL bar`

---

## Slice 2 - Web Navigation Hierarchy and Bookmark/History Polish

### Objective

Make the Web sidebar easier to scan by separating Bookmarks and History into explicit modes and reducing row noise.

### Scope

- Replace stacked Bookmarks + History sections with a segmented control:
  - `Bookmarks`
  - `History`
- Keep Bookmarks as the default segment.
- Show bookmark/history rows with title first and domain or shortened URL second.
- Preserve bookmark rename and open-in-new-tab actions.
- Preserve global history opening behavior.
- Keep current persistent Web state shape unless a tiny UI-only state field is necessary.

### Non-Goals

- Do not add folders, tags, search, bulk edit, or drag sorting.
- Do not implement full favicon resolution unless it is trivial and local to the current URL metadata.
- Do not change bookmark/history persistence semantics.

### Approach

1. Add local segment state to `NavView.svelte`.
2. Render one list at a time instead of stacked lists.
3. Add a small URL/domain formatter in `NavView.svelte` if not shared elsewhere.
4. Keep row actions keyboard-accessible and visible on hover/focus.
5. Ensure empty states are quiet and useful if either list is empty.

### Files / Areas Touched

- `app-shell/src/renderer/src/modules/web/NavView.svelte`
- Possibly `app-shell/src/renderer/src/modules/web/state.ts` if a shared domain formatter or derived row model is justified.

### Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
SHELL_CAPTURE_MODULE=shell.web SHELL_CAPTURE=../workspace-agents/implementation/screenshots/web-browser-nav-bookmarks-after-2026-06-07.png npm run start
SHELL_CAPTURE_MODULE=shell.web SHELL_CAPTURE_WEB_NAV=history SHELL_CAPTURE=../workspace-agents/implementation/screenshots/web-browser-nav-history-after-2026-06-07.png npm run start
```

Implementation note: if `SHELL_CAPTURE_WEB_NAV=history` does not exist yet, either add a narrow capture hook for this slice or capture History with an interactive validation path and document the fallback in the handoff.

Required evidence:

- `workspace-agents/implementation/screenshots/web-browser-nav-bookmarks-after-2026-06-07.png`
- `workspace-agents/implementation/screenshots/web-browser-nav-history-after-2026-06-07.png`

### Suggested Commit

`Update web browser navigation`

---

## Slice 3 - Shell Toolbar and Jobs Hierarchy

### Objective

Clarify the shell context strip so Jobs, command palette, settings, sidebar, inspector, and zen controls have a consistent hierarchy.

### Scope

- Keep the context strip shell-owned.
- Make `Jobs` visually consistent with the rest of the toolbar while still discoverable.
- If active jobs exist, show that state in a compact way using the existing jobs store.
- Preserve existing command ids and keyboard/command-palette behavior.
- Keep existing tooltips/accessible labels or improve them where labels are unclear.

### Non-Goals

- Do not redesign the whole shell topbar.
- Do not move Jobs into the Web inspector.
- Do not add a new jobs data model.
- Do not implement per-module agent activity yet.

### Approach

1. Audit `ContextStrip.svelte`, `JobsPanel.svelte`, and `StatusBar.svelte` together so job state is not duplicated incoherently.
2. Replace the text-only `Jobs` peer button with a token-based icon/text or icon/badge treatment that fits the existing toolbar rhythm.
3. Ensure active/failed jobs are visible either in the context strip or status bar without crowding the Web URL bar.
4. Verify that command palette, settings, sidebar, inspector, and zen controls still work.

### Files / Areas Touched

- `app-shell/src/renderer/src/shell/ContextStrip.svelte`
- `app-shell/src/renderer/src/shell/StatusBar.svelte`
- Possibly `app-shell/src/renderer/src/shell/JobsPanel.svelte`
- Possibly `app-shell/src/renderer/src/store/jobs.ts`

### Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
SHELL_CAPTURE_MODULE=shell.web SHELL_CAPTURE=../workspace-agents/implementation/screenshots/web-browser-toolbar-after-2026-06-07.png npm run start
SHELL_CAPTURE_MODULE=shell.web SHELL_CAPTURE_OPEN_JOBS=1 SHELL_CAPTURE=../workspace-agents/implementation/screenshots/web-browser-jobs-panel-after-2026-06-07.png npm run start
```

Implementation note: if `SHELL_CAPTURE_OPEN_JOBS=1` is not currently supported, use the existing `shell:capture-open-jobs` hook or add the smallest capture flag needed in `app-shell/src/main/capture/evidence.ts`.

Required evidence:

- `workspace-agents/implementation/screenshots/web-browser-toolbar-after-2026-06-07.png`
- `workspace-agents/implementation/screenshots/web-browser-jobs-panel-after-2026-06-07.png`

### Suggested Commit

`Update shell toolbar job controls`

---

## Slice 4 - Narrow-Viewport Collapse Behavior and Visual QA

### Objective

Define a durable narrow-viewport behavior for the shell zones that Web and future LAN/iPad-facing renderer work can rely on.

### Scope

- Add or refine CSS/layout behavior so rail, sidebar, main pane, and inspector do not overlap at narrow widths.
- Prefer existing layout toggles and persisted `LayoutState`; avoid creating a second layout system.
- Define Web-specific responsive behavior for the tab strip, URL bar, segmented sidebar, and inspector content.
- Verify that the Web `<webview>` remains visible, non-overlapping, and scrollable without double-scrollbar artifacts caused by the surrounding shell CSS.

### Non-Goals

- Do not build the LAN/iPad client.
- Do not implement touch-specific gestures.
- Do not replace shell fixed zones.
- Do not migrate from `<webview>` to BrowserView/WebContentsView in this slice.

### Approach

1. Inspect current shell CSS grid and module CSS at desktop, tablet-ish, and narrow widths.
2. Add CSS media queries or container-safe constraints only where needed.
3. For narrow widths, prioritize main pane and provide predictable collapsed side zones.
4. Make Web tab titles, URL bar controls, and row text truncate cleanly.
5. Capture evidence for normal desktop and narrow viewport states.

### Files / Areas Touched

- `app-shell/src/renderer/src/shell/AppShell.svelte`
- `app-shell/src/renderer/src/shell/ActivityRail.svelte`
- `app-shell/src/renderer/src/shell/Sidebar.svelte`
- `app-shell/src/renderer/src/shell/Inspector.svelte`
- `app-shell/src/renderer/src/modules/web/MainView.svelte`
- `app-shell/src/renderer/src/modules/web/NavView.svelte`
- `app-shell/src/renderer/src/modules/web/InspectorView.svelte`
- Possibly `app-shell/src/shared/module-contract.ts`, `app-shell/src/main/core/layout.ts`, and `app-shell/src/renderer/src/browser-shell.ts` only if default layout behavior changes.

### Validation

Run from `app-shell/`:

```bash
npm run typecheck
npm run build
SHELL_CAPTURE_MODULE=shell.web SHELL_CAPTURE=../workspace-agents/implementation/screenshots/web-browser-desktop-after-2026-06-07.png npm run start
SHELL_CAPTURE_MODULE=shell.web SHELL_CAPTURE_VIEWPORT=768x1024 SHELL_CAPTURE=../workspace-agents/implementation/screenshots/web-browser-narrow-after-2026-06-07.png npm run start
```

Implementation note: if `SHELL_CAPTURE_VIEWPORT` is not available, add the smallest evidence hook needed or use the in-app Browser/Playwright path to capture a narrow viewport. Record the exact evidence path in the plan outcome and handoff.

Required evidence:

- `workspace-agents/implementation/screenshots/web-browser-desktop-after-2026-06-07.png`
- `workspace-agents/implementation/screenshots/web-browser-narrow-after-2026-06-07.png`

### Suggested Commit

`Update web browser responsive layout`

---

## Slice 5 - Final Docs and Handoff

### Objective

Close the Web browser UI enhancement pass with durable documentation and a fresh next-session handoff.

### Scope

- Update this plan with completion notes, final evidence paths, and commit hashes for each successful slice.
- Update durable docs only if behavior or architecture materially changed:
  - `CLAUDE.md`
  - `.agent/knowledge/WORKSPACE_ORIENTATION.md`
  - `docs/architecture/modules-overview.md`
  - a future `docs/modules/web.md` if created during the work
- Write a new numbered handoff in `workspace-agents/session-handoffs/HANDOFF_59.md` after the last successful slice.
- Include the next suggested slice, any known gaps, validation performed, and exact screenshot evidence paths.

### Non-Goals

- Do not rewrite historical handoffs.
- Do not promote `.ideas/ui-feedback-claude.md` into canonical architecture truth.
- Do not add broad roadmap items unrelated to Web browser UI.

### Validation

Run from repo root and `app-shell/`:

```bash
git status --short --branch
git diff --check
cd app-shell
npm run typecheck
npm run build
```

Required evidence:

- Final screenshots from slices 1-4.
- `HANDOFF_59.md` with validation, evidence, commits, and not-built items.
- Clean or intentionally explained `git status --short --branch`.

### Suggested Commit

`Add web browser UI handoff`

---

## Cross-Slice Evidence Requirements

Every successful UI-visible slice must gather evidence before commit:

1. `npm run typecheck`
2. `npm run build`
3. At least one screenshot under `workspace-agents/implementation/screenshots/`
4. Plan update or handoff note listing the evidence path
5. `git status --short --branch`

Use `SHELL_CAPTURE` when possible because it saves repo-local evidence from the Electron app itself.

## Commit Policy

After each successful slice:

1. Review `git diff --check`.
2. Confirm the diff is limited to the slice.
3. Stage only files touched for that slice.
4. Commit with the suggested message or a similarly scoped message.
5. Record the commit hash in this plan or the final handoff.

Do not batch unrelated slices into one commit. Do not commit failed or partially validated work.

## Risks and Unknowns

- Some screenshot capture flags referenced above may not exist yet. Add only narrow evidence hooks when needed, and remove dead capture scaffolding if it is not used.
- `<webview>` behavior can differ from normal DOM content. Treat clipping or scroll issues as CSS/webview integration bugs first; do not jump to a WebContentsView migration without a separate plan.
- Shell toolbar changes affect every module, so keep Slice 3 small and verify at least Web plus one non-Web module if the visual change is broad.
- Narrow-viewport behavior may expose stale assumptions in persisted `LayoutState`; update `app-shell/src/renderer/src/browser-shell.ts` if layout defaults change.
- Real favicon resolution could pull the work into network/cache/security behavior. Keep it deferred unless implemented as a small display-only improvement.

## Acceptance Criteria

- Web address bar shows protocol/security state without relying on the inspector.
- Web inspector is useful when idle and no longer dominated by protocol/history-index/session telemetry.
- Web sidebar separates Bookmarks and History through a clear segmented control.
- Bookmark and history rows are easier to scan, with title primary and URL/domain secondary.
- Shell Jobs control is visually coherent with the context strip and remains discoverable.
- Narrow viewport does not produce obvious overlap, text overflow, or incoherent double-scrollbar behavior in the Web module.
- Each successful slice has typecheck/build proof, screenshot evidence, and its own commit.
- After the final successful slice, `HANDOFF_59.md` exists and points future agents to this plan, evidence, commits, and remaining work.

## Intentionally Not Built

- No agent browser automation surface.
- No agent action log or target-element overlay.
- No browser security/certificate detail panel.
- No WebContentsView migration.
- No bookmark folders, tags, search, sync, or import/export.
- No LAN/iPad client implementation.
- No new shell zone or module contract change unless required by proven responsive behavior.

---

## Outcome - 2026-06-07

Completed in commit `b43ef33` (`Update web browser workspace UI`).

### Delivered

- Added a compact URL security/status affordance in the Web address field.
- Reworked the Web inspector around page title, readable domain/URL, bookmark action, loading state, open tab count, saved status, and recent tab history.
- Replaced stacked Bookmarks/History navigation with a segmented control.
- Updated bookmark/history rows so titles are primary and domains/short URLs are secondary; History also shows visited time.
- Updated the shell Jobs control to use the same icon-button rhythm as the rest of the context strip, with active/failed badge support from the existing jobs store.
- Added narrow viewport behavior that keeps the rail and main web surface visible while temporarily collapsing sidebar and inspector zones below 900px without changing persisted layout state.
- Added focused capture hooks for:
  - `SHELL_CAPTURE_WEB_NAV=bookmarks|history`
  - `SHELL_CAPTURE_OPEN_JOBS=1`
  - `SHELL_CAPTURE_VIEWPORT=<width>x<height>`

### Evidence

- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Screenshots:
  - `workspace-agents/implementation/screenshots/web-browser-inspector-url-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/web-browser-nav-bookmarks-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/web-browser-nav-history-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/web-browser-toolbar-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/web-browser-jobs-panel-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/web-browser-desktop-after-2026-06-07.png`
  - `workspace-agents/implementation/screenshots/web-browser-narrow-after-2026-06-07.png`

### Notes

- The only new code abstraction is `app-shell/src/renderer/src/modules/web/url-display.ts`, shared by the URL bar, sidebar rows, and inspector to avoid duplicating URL parsing/display logic across Svelte components.
- The Web module still uses Electron `<webview>` with `persist:app-shell-web`.
- No shell/module contract changes were made.
- The implementation was committed as one UI pass after validation rather than as four isolated slice commits because the shared helper, capture hooks, and screenshots were validated together.
