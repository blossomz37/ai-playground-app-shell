# Project Menu and Work-Surface Clutter Audit — 2026-08-25

## Scope

Combined UX and screenshot review of the project menu, Table View, Documents,
Jobs, and Prompt Studio at a 1280×720 viewport. The immediate implementation
removes project-type labels from current, active, and archived project rows.

User goal: identify controls or secondary information that obstruct selecting
a project or doing the primary work, especially when that information can live
behind disclosure or in a more appropriate surface.

## Step 1 — Project menu: improved, with one remaining high-impact issue

Evidence:

- `../screenshots/project-menu-clutter-audit-2026-08-25/01-table-empty-before.jpg`
- `../screenshots/project-menu-clutter-audit-2026-08-25/02-project-types-removed-after.jpg`
- `../screenshots/project-menu-clutter-audit-2026-08-25/07-electron-project-types-removed-after.png`

The type labels duplicated creation metadata in the narrowest part of the menu.
Removing them gives names the full content lane and preserves the type in the
workspace record and creation form.

Remaining issue: duplicate, archive, and delete controls still occupy 92 pixels
on every row. Long names therefore remain truncated even after the type-label
fix. These are management actions, not project-selection actions. A single
keyboard-accessible overflow menu per row, or actions revealed only after row
selection with an accessible fallback, would make the project name the primary
signal.

## Step 2 — Table View: needs cleanup

Evidence:

- `../screenshots/project-menu-clutter-audit-2026-08-25/04-table-toolbar-and-row-detail.jpg`
- `../screenshots/project-menu-clutter-audit-2026-08-25/08-electron-table-inspector-clutter.png`

The Row Detail inspector uses roughly a quarter of the window for six read-only
values. It squeezes the primary table while leaving most of the inspector empty;
at the slightly narrower browser capture width, the table entered horizontal
overflow. Default the inspector closed for Table View, or move row detail to a
compact disclosure/popover that appears on selection.

The toolbar also offers Sort and Ascending controls while every table header is
already sortable. That duplicates the same decision in two places. Keep header
sorting as the fast path and move the explicit sort controls plus reset into the
Filters disclosure. The isolated reset control wrapping onto a second row is a
visible sign that the toolbar no longer fits the available work lane.

## Step 3 — Documents: generally healthy, moderate focus opportunity

Evidence:

- `../screenshots/project-menu-clutter-audit-2026-08-25/03-documents-chrome.jpg`

The editor itself remains the visual center and the formatting toolbar is
compact. The main opportunity is contextual: when the inspector is open with
no AI task underway, the expanded AI section consumes writing width for an
instruction field and three actions. Collapse the AI section when idle and
expand it when the author invokes an AI action; keep Annotations, Version
History, and Metadata behind their existing disclosures.

## Step 4 — Jobs: empty drawer is healthy; status signaling is duplicated

Evidence:

- `../screenshots/project-menu-clutter-audit-2026-08-25/05-jobs-empty-drawer.jpg`

The drawer is compact and the empty states are understandable. No drawer
redesign is needed. Current source still signals active or failed jobs in both
the top-toolbar briefcase and the status bar. Keep one persistent entry point;
use the status bar for active progress/failure detail and let the toolbar icon
open the drawer without repeating the same status badge.

## Step 5 — Prompt Studio: needs cleanup

Evidence:

- `../screenshots/project-menu-clutter-audit-2026-08-25/06-prompt-row-actions-and-inspector.jpg`

The selected prompt name is truncated by four always-visible management actions
(Rename, Copy, Archive, Delete). This repeats the project-menu problem. Move
those actions into one accessible overflow menu and preserve the row for prompt
identity and selection. Export and Import are also secondary library-management
actions and can share a library overflow menu instead of taking permanent
sidebar width.

## Accessibility notes and limits

- Existing icon actions have accessible names, which should be preserved if
  actions move into overflow menus.
- Truncated visible names particularly affect zoomed and low-vision use even
  when screen readers still receive a full accessible label.
- Horizontal overflow caused by the Table inspector is likely to worsen at
  browser zoom or narrower window sizes.
- Screenshots and DOM inspection do not prove focus order, keyboard trapping,
  screen-reader announcements, contrast compliance, or responsive behavior at
  every supported width. Those require interaction and assistive-technology
  checks.

## Recommended cleanup order

1. Consolidate per-row management actions in Project Menu and Prompt Studio.
2. Default Table View row detail closed and remove duplicate sort controls.
3. De-duplicate active/failed Jobs signaling.
4. Collapse idle AI controls in the Documents inspector.
