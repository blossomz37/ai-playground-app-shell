# Universal Rename And Header Alignment

## Summary

Add consistent rename support for user-owned named items across the shell: documents, journal entries, assets, AI chats, prompt chains, web bookmarks/hyperlinks, and prompt templates. At the same time, normalize sidebar and main-view header heights so horizontal borders align across the fixed shell zones.

## Current Findings

- Documents already have a shell-owned rename path through `documents.update(id, { title })` and inline rename in `Documents/NavView.svelte`.
- AI conversations and prompt templates are SQLite-backed in `ai_conversations` and `ai_prompt_templates`; templates can be upserted with `saveTemplate`, but chats do not yet expose a direct rename API.
- Prompt chains already have SQLite tables (`ai_prompt_chains`, `ai_chain_runs`, `ai_chain_step_runs`), but the current Workflow UI still uses static `WorkflowProfile` seed data in `workflow-state.ts`.
- Journal entries, assets, workflow profiles, and web bookmarks are currently renderer/shared-state objects persisted through shell settings snapshots, not first-class SQLite tables.
- “Hyperlinks” currently maps best to Web bookmarks and visible bookmark labels. Browser history/page titles should remain page-owned unless a later feature adds user annotations.
- Header heights are inconsistent:
  - Documents nav uses `min-height: 42px`.
  - Documents main toolbar uses `min-height: 42px`.
  - Legacy nav headers in Assets, AI Chat, Table View, Workflow, and Web use `padding: var(--space-3)` without an explicit height.
  - Prompt Studio nav uses a bare `header` with `padding: var(--space-4)`.
  - Main-view headers vary: Journal uses large top padding, Workflow uses `var(--space-4) var(--space-6)`, Prompt Studio uses `var(--space-4) var(--space-5)`, Web has separate tab-strip and URL-bar rows.
- The shell wrappers (`Sidebar.svelte`, `MainPane.svelte`, `Inspector.svelte`) do not currently provide a shared header slot or shared header height; each module owns its own header styling.

## Goals

- Rename every visible, user-owned named item from the place where it appears.
- Route SQLite-backed rename operations through shell-owned APIs.
- Preserve existing unsaved editor/chat/template content during rename.
- Keep source files safe: asset rename changes the app display name only, not the filesystem filename.
- Use one shared header height token/class so sidebar and main-view border lines align.
- Keep module boundaries intact: modules call shell primitives or shared state methods; they do not patch shell internals.

## Non-Goals

- Filesystem rename for imported assets.
- Bulk rename.
- Rename history/versioning.
- Keyboard-only rename workflows beyond preserving Enter/Escape behavior where inline rename exists.
- Renaming browser history entries loaded from page metadata.
- Migrating every settings-backed module to SQLite in this slice.

## Rename Model

Use a small shared rename vocabulary rather than inventing different UX in each module:

- `Rename` command/menu item opens inline rename for list rows and editable title controls for main headers.
- Enter commits; Escape cancels; blur commits only when the value changed and is valid.
- Blank labels are rejected with a toast and the original label restored.
- The active/selected item remains selected after rename.
- Dirty content in the active editor or prompt surface remains dirty and untouched.
- Rename changes `updatedAt`/`modified` where that concept exists.

## Data And API Plan

### Documents

- Keep existing `documents.rename` command and `DocumentsStateSlice.updateDoc`.
- Reuse the existing inline rename behavior as the reference implementation.
- Confirm it still works after shared rename UI extraction.

### Journal Entries

- Add `renameEntry(id, title)` to `JournalStateSlice`.
- Update `preview` only if needed; do not alter `content`.
- Update `modified`.
- Persist through the existing journal settings snapshot.
- Add inline rename in `journal/NavView.svelte` and an editable title affordance in `journal/MainView.svelte`.

### Assets

- Add `renameAsset(id, name)` to `AssetsStateSlice`.
- Rename `AssetItem.name` as the display label.
- Preserve `filePath`, metadata `title`, and source file contents.
- Persist through the existing assets settings snapshot.
- Add inline rename in `assets/NavView.svelte` and a rename action in the main/detail surface.

### AI Chats

- Add repository/orchestrator/core API for `renameConversation({ workspaceId, id, title })`.
- Add shell API/preload/IPC/state wiring.
- Update `AiChatStateSlice.renameConversation(id, title)`.
- Add inline rename in `aichat/NavView.svelte`.
- Preserve all messages and selected conversation state.

### Prompt Templates

- Add explicit `renameTemplate({ workspaceId, id, name })` even though `saveTemplate` can already upsert names.
- Extend Prompt Studio state so selected template identity is shared between nav and main surfaces instead of only local component state.
- Add inline rename in `promptstudio/NavView.svelte` and editable template name in `promptstudio/MainView.svelte`.
- Preserve prompt body, variables, tags, provider settings, and run output while renaming.

### Prompt Chains

- Decide within implementation whether this slice should expose the existing `ai_prompt_chains` table directly or keep Workflow profiles settings-backed for now.
- Preferred path:
  - Add `listPromptChains`, `renamePromptChain`, and later-compatible chain state methods through the AI repository/orchestrator.
  - Hydrate Workflow Runner from `ai_prompt_chains` when rows exist, falling back to current static profiles as seeds.
  - Rename chain `name` without changing `stepsJson`.
- Minimum acceptable path if chain DB wiring proves too large:
  - Add `renameProfile(id, name)` to `WorkflowStateSlice`.
  - Persist profile names in the workflow settings snapshot.
  - Leave a follow-up note that Workflow still needs full prompt-chain DB adoption.

### Web Bookmarks And Hyperlinks

- Add `renameBookmark(id, title)` to `WebStateSlice`.
- Apply rename only to `WebBookmark.title`.
- Do not rewrite `url`, tab title, page title, or history title.
- Add inline rename in `web/NavView.svelte` bookmark rows.
- If the active page is bookmarked, refresh the displayed bookmark label immediately.

## Shared UI Plan

- Add a small reusable inline rename helper/component only if it reduces duplication after Documents and one other module are adapted.
- Candidate: `renderer/src/shell/InlineRename.svelte` with:
  - `value`
  - `ariaLabel`
  - `onCommit(value)`
  - `onCancel()`
  - autofocus/select behavior via Svelte 5 attachment
- Keep styling compact and list-row friendly.
- Reuse existing context menu infrastructure for row-level Rename where rows already have context menus.
- Add rename icon buttons only where there is no row context menu or obvious inline title target.

## Header Alignment Plan

### Shared Token

- Add a shell layout token, likely in `tokens.css`:
  - `--shell-zone-header-h: 42px`
- Add shared utility classes in a single shell/global stylesheet:
  - `.zone-header`
  - `.zone-title`
  - optional `.zone-header-actions`
- `.zone-header` should use:
  - `min-height: var(--shell-zone-header-h)`
  - `height: var(--shell-zone-header-h)` where content is single-row
  - `display: flex`
  - `align-items: center`
  - `border-bottom: var(--border-zone)`
  - horizontal padding only, not vertical padding

### Sidebar Headers

- Convert module nav headers to the shared class:
  - Documents
  - Journal
  - Assets
  - AI Chat
  - Table View
  - Workflow Runner
  - Web Bookmarks/History section headers
  - Prompt Studio
- For Web, keep section headers aligned internally, but note that the sidebar has two stacked section headers by design.

### Main Headers

- Convert single-row main headers/toolbars to the shared height:
  - Documents editor toolbar
  - Journal entry header
  - Workflow runner header
  - Prompt Studio template header
- For modules without a main header (Assets, Table View, AI Chat empty/feed), either:
  - add a lightweight shared main header, or
  - document that the main content begins without a border line and therefore has no line to align.
- For Web:
  - Treat the tab strip as the main header row and make it `--shell-zone-header-h`.
  - Keep URL bar as a second row below it.
  - Confirm its first border aligns with the sidebar header border.

## Implementation Steps

1. Add the shared header token/classes and update Documents first as the reference module.
2. Convert the remaining sidebar headers to the shared class.
3. Convert main-view headers/toolbars and verify border alignment across modules.
4. Extract or standardize inline rename behavior from Documents.
5. Add settings-backed rename methods for Journal, Assets, Workflow fallback profiles, and Web bookmarks.
6. Add SQLite-backed rename APIs for AI conversations and prompt templates.
7. Add prompt-chain rename support, using the preferred DB-backed path if it stays within the slice.
8. Wire UI rename affordances in each module.
9. Update shell/module contract docs where new shell APIs are exposed.
10. Validate with typecheck, build, contrast audit, Svelte autofixer, and screenshots.

## Validation Plan

- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- Svelte autofixer for every changed `.svelte` file.
- Browser/Electron smoke:
  - Rename a document from the tree and confirm active editor content remains intact.
  - Rename a journal entry and confirm content remains intact.
  - Rename an asset and confirm source path is unchanged.
  - Rename an AI chat and confirm messages remain.
  - Rename a prompt template and confirm prompt body/run output remain.
  - Rename a prompt chain/profile and confirm prompt/steps remain.
  - Rename a bookmark and confirm URL remains unchanged.
  - Try blank rename and confirm rejection.
  - Reload and confirm persisted labels remain for SQLite-backed and settings-backed items.
  - Switch across modules and confirm sidebar/main header borders align.
- Screenshot evidence:
  - `implementation/screenshots/universal-rename-documents-after-2026-06-05.png`
  - `implementation/screenshots/universal-rename-ai-after-2026-06-05.png`
  - `implementation/screenshots/header-alignment-after-2026-06-05.png`

## Risks And Decisions

- Prompt chains are the largest uncertainty because the DB schema exists but the Workflow UI currently uses static profiles. Keep the implementation honest: either wire chains to the DB in this slice or explicitly land the settings-backed fallback with a follow-up plan.
- Header normalization may expose modules that do not currently have main headers. Do not add decorative headers just to create symmetry; only add headers when they provide real context or actions.
- Asset rename must not imply a filesystem rename. Use UI language like “Rename asset label” in tooltips if needed.
- Web bookmark rename must not fight page-title updates. Bookmark labels are user-owned; tab/history titles are page-owned.
