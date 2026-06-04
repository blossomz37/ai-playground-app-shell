# Plan 23 - Chrome Dedupe And Product Language Pass

## Summary

Use the feedback in `implementation/user_feedback/` to reduce repeated shell metadata, clarify ownership of top chrome, and remove prototype/internal language from the normal writing UI. This is a focused shell/Documents/AI Chat cleanup over the Plan 21 layout and Plan 22 Jewel Box theme, not a new layout architecture pass.

## Key Changes

- Make the top-left workspace switcher canonical:
  - Keep it in the titlebar, add a chevron so it reads as an interactive selector, and preserve `-webkit-app-region: no-drag`.
  - Remove workspace name/type from the context strip and status bar.
  - Keep workspace type visible only inside the switcher/menu, not persistently in multiple chrome rows.

- Make the context strip module + navigation only:
  - Show active module and a left-aligned nav trail such as `Manuscript / Chapter 1 - The Arrival`.
  - Remove document metadata from breadcrumbs: no word count, kind, or saved state there.
  - Replace generic fallback text like `No active object` with module-aware user language, e.g. `No document open`, `No conversation selected`, or hide the trail when no useful context exists.
  - Protect short nav labels from collapsing to `M...`; truncate the longest document segment first.

- Simplify status ownership:
  - For Documents, status bar owns live document state: word count and saved/unsaved state.
  - Remove document title from the status bar because the editor header owns it.
  - Show Jobs in the status bar only when queued/running/failed/recently completed; otherwise keep the status area quiet.
  - Remove persistent `App Shell v0.1.0` from normal chrome; leave version for Settings/About later.

- Clean product language and small visual states:
  - Change `SAVE` treatment so clean/disabled does not look like a dead control; hide or soften save action when not dirty.
  - Replace AI Chat raw emoji avatars with simple Jewel Box glyph/avatar styling.
  - Fix AI Chat conversation grammar: `1 message`, not `1 messages`.
  - Raise contrast for small muted chrome text, inactive rail icons, uppercase labels, command/action text, and placeholders without changing the Plan 22 palette model.

## Compatibility

- Do not change `ModuleContext`, IPC contracts, database schema, migrations, or module activation.
- Preserve fixed shell zones, context strip row, full-width status bar, persisted resize/toggle behavior, inspector default behavior, Cmd+I, zen mode, command palette, settings, and jobs panel behavior.
- Scope implementation to shared shell chrome, Documents context/status behavior, and small AI Chat language/avatar cleanup. Do not deeply redesign AI Chat, rail grouping, inspector workflows, or editor tables in this slice.

## Test Plan

- From `app-shell/`, run:
  - `npm run typecheck`
  - `npm run build`
- Run Svelte autofixer on changed `.svelte` files.
- Visual/interaction checks:
  - Workspace/project name appears once in persistent chrome.
  - Documents title appears in the editor header and inspector only, not breadcrumb/status.
  - Word count and save state appear in one persistent place.
  - Context trail remains readable with inspector open.
  - Non-Documents modules no longer show `No active object`.
  - AI Chat renders without raw OS emoji avatars and uses correct message grammar.
  - Dark and light themes remain readable; muted text no longer reads disabled.
  - Sidebar toggle, inspector toggle/Cmd+I, resize handles, zen mode, command palette, settings, and jobs panel still work.
- Capture screenshot evidence:
  - `chrome-dedupe-documents-dark-after-2026-06-04.png`
  - `chrome-dedupe-documents-light-after-2026-06-04.png`
  - `chrome-dedupe-documents-inspector-after-2026-06-04.png`
  - `chrome-dedupe-aichat-after-2026-06-04.png`

## Notes For Plan 24

Plan 24 should handle the deeper UX items intentionally deferred from this cleanup slice:

- AI Chat empty-state redesign: suggested prompts, context/attachment affordance, calmer send/input treatment.
- Rail discoverability: grouping, “More” behavior for advanced modules, focus rings, tooltip consistency, and keyboard navigation review.
- Inspector usefulness: rename History to Snapshots if appropriate, resolve save-vs-version language, decide whether metadata-only inspector sections should be flat rather than collapsible.
- Editorial table styling: make manuscript tables quieter and more document-native across dark/light themes.
- Broader contrast/accessibility audit with measured contrast targets rather than screenshot sampling.
