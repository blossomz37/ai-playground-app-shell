# Session Handoff 32 - Universal Rename And Header Alignment

_Session: 2026-06-05 · Slice: universal named-item rename support and fixed-zone header alignment_

## What Changed

- Added shared renderer rename control `app-shell/src/renderer/src/shell/InlineRename.svelte`.
- Added inline/sidebar rename support for Journal entries, asset display labels, AI conversations, Workflow Runner profiles, Web bookmarks, and Prompt Studio templates.
- Added editable main-header title affordances for Journal entries, Assets, Workflow profiles, and Prompt Studio templates.
- Preserved Documents rename behavior and moved Documents nav/editor toolbar headers onto shared shell header classes.
- Added settings-backed rename methods:
  - `JournalStateSlice.renameEntry`
  - `AssetsStateSlice.renameAsset`
  - `WorkflowStateSlice.renameProfile`
  - `WebStateSlice.renameBookmark`
- Added explicit SQLite-backed AI rename APIs through shared types, repository, orchestrator, IPC, preload, renderer registry, and browser-preview shell:
  - `renameConversation({ workspaceId, id, title })`
  - `renameTemplate({ workspaceId, id, name })`
- Shared Prompt Studio selected-template identity between nav and main surfaces; rename no longer depends on local-only component selection.
- Added shared header token/classes:
  - `--shell-zone-header-h`
  - `.zone-header`
  - `.zone-title`
  - `.zone-header-actions`
- Converted sidebar headers and single-row main headers/toolbars to the shared 42px row height. Web tab strip is the aligned main header row; URL bar remains a second row below it.

## Decisions

- Prompt chains used the plan's minimum acceptable path in this slice: Workflow Runner profiles stay settings-backed, now with persistent renamed names. Full `ai_prompt_chains` hydration/rename should be its own follow-up because the Workflow UI is still seed-profile based.
- Asset rename changes only `AssetItem.name`, not `filePath`, PDF/image metadata, or the source file.
- Web bookmark rename changes only `WebBookmark.title`, not URL, tab title, page title, or history title.

## Evidence

- Svelte autofixer clean on every changed `.svelte` file, including `InlineRename.svelte`.
- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- `git diff --check`
- Screenshot evidence:
  - `implementation/screenshots/universal-rename-documents-after-2026-06-05.png`
  - `implementation/screenshots/universal-rename-ai-after-2026-06-05.png`
  - `implementation/screenshots/header-alignment-after-2026-06-05.png`

## Notes

- The screenshot files exist locally under `implementation/screenshots/`; screenshot files appear ignored by git status in this checkout.
- `implementation/plans/29-universal-rename-and-header-alignment.md` now includes an implementation outcome section.
- Commit made: `Add universal rename support`.
