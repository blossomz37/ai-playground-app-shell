# Session Handoff 22 - UX Duplication Cleanup

_Session: 2026-06-05 · Slice: Plan 24 follow-up for discoverability, duplication, and section borders_

## What Changed

- Moved project/workspace access out of the macOS titlebar area and into a compact project switcher at the top of the Activity Rail.
- Added `WorkspaceSwitcher.svelte` for current project identity, project switching, and new project creation.
- Kept the current project visible once in the switcher menu; the switch list now shows only other projects.
- Removed context-strip module labels, breadcrumbs, and secondary context text so labels like `Manuscript` and `Journal` do not repeat near their own sidebar headings.
- Replaced the Documents title header with a sticky editing toolbar for paragraph, heading, bold, italic, strike, and blockquote controls.
- Removed the URL line from Web tabs; the tab keeps the page title while the address bar and inspector retain URL details.
- Removed the duplicated `Journal` sidebar heading.
- Added shared `--border-zone` and applied it to shell/section dividers so adjacent panes use the same border thickness.
- Extended the dev-only screenshot capture hook with `SHELL_CAPTURE_OPEN_WORKSPACE_MENU=1`.

## Evidence

Validation passed from `app-shell/`:

```bash
npm run audit:contrast
npm run typecheck
npm run build
```

Contrast summary:

```text
Contrast audit passed: all measured token pairs meet targets.
```

Screenshot evidence:

- `implementation/screenshots/ux-cleanup-documents-after-2026-06-05.png`
- `implementation/screenshots/ux-cleanup-web-after-2026-06-05.png`
- `implementation/screenshots/ux-cleanup-journal-after-2026-06-05.png`
- `implementation/screenshots/ux-cleanup-project-menu-after-2026-06-05.png`

Visual checks:

- Documents no longer shows the `Manuscript` breadcrumb or a separate document-title header.
- Web no longer repeats the URL inside the open tab.
- Journal no longer repeats `Journal` in adjacent headers.
- Project menu clears the window controls and no longer repeats the current project in the switch list.

Svelte autofixer was run clean on every changed Svelte component, including:

- `app-shell/src/renderer/src/shell/WorkspaceSwitcher.svelte`
- `app-shell/src/renderer/src/shell/AppShell.svelte`
- `app-shell/src/renderer/src/shell/ActivityRail.svelte`
- `app-shell/src/renderer/src/shell/ContextStrip.svelte`
- `app-shell/src/renderer/src/shell/Sidebar.svelte`
- `app-shell/src/renderer/src/shell/Inspector.svelte`
- `app-shell/src/renderer/src/shell/StatusBar.svelte`
- `app-shell/src/renderer/src/modules/documents/MainView.svelte`
- `app-shell/src/renderer/src/modules/documents/NavView.svelte`
- `app-shell/src/renderer/src/modules/web/MainView.svelte`
- `app-shell/src/renderer/src/modules/web/NavView.svelte`
- `app-shell/src/renderer/src/modules/journal/MainView.svelte`
- `app-shell/src/renderer/src/modules/journal/NavView.svelte`
- `app-shell/src/renderer/src/modules/assets/NavView.svelte`
- `app-shell/src/renderer/src/modules/aichat/NavView.svelte`
- `app-shell/src/renderer/src/modules/workflow/MainView.svelte`
- `app-shell/src/renderer/src/modules/workflow/NavView.svelte`
- `app-shell/src/renderer/src/modules/tableview/NavView.svelte`
- `app-shell/src/renderer/src/modules/promptstudio/NavView.svelte`

## Carry Forward

- Archive/delete project actions were not added because the workspace service does not currently expose those operations. The new project switcher is the intended place for them when the backing actions exist.
- Document and journal content can still contain their own heading text; this pass removed shell/header duplication, not authored document body content.
- Screenshot files are ignored by git per `.gitignore`, but remain in `implementation/screenshots/` as local evidence.

## Recommended Next Prompt

```text
/goal Pursue this goal: inspect App Shell screenshots after the UX duplication cleanup and identify the next narrow clutter/accessibility hardening slice.

Before editing, read:
1. AGENTS.md
2. CLAUDE.md
3. .agent/knowledge/WORKSPACE_ORIENTATION.md
4. session-handoffs/HANDOFF_22.md
5. implementation/plans/24-ux-discoverability-accessibility-pass.md

Start with live repo evidence:
- git status --short --branch
- npm run audit:contrast
- npm run typecheck
- npm run build

Scope:
- Be discerning about close-proximity repeated labels and redundant panel titles.
- Prefer one narrow cleanup slice over broad redesign.
- Preserve ModuleContext, IPC contracts, and database schema unless a new plan explicitly calls for changing them.
```
