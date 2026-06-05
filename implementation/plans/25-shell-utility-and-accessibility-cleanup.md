# Shell Utility Clutter And Accessibility Cleanup

## Summary

Use the post-cleanup screenshots to run one narrow shell-chrome hardening pass. The selected pass is **utility action consolidation**, anchored by the confirmed duplicate Settings gear issue: keep the **top-right Settings gear** and remove the **bottom-left Activity Rail Settings gear**.

Observed issue list for this pass:

- Duplicate Settings entry points: bottom-left rail gear and top-right context-strip gear.
- Activity Rail keyboard order currently includes Settings as a rail control, so removing it requires updating roving focus behavior.
- Top-right toolbar remains dense, but this pass should not redesign it; preserve existing sidebar, inspector, zen, command palette, Jobs, and Settings actions.

## Key Changes

- Remove the Settings button from `ActivityRail.svelte`.
- Remove `rail-settings` from Activity Rail roving focus state, keyboard navigation, fallback control selection, and tooltip handling.
- Keep `shell.settings`, `Cmd+,`, command palette access, and the top-right Settings gear unchanged.
- Keep Settings visually grouped with other shell-level actions in the context strip.
- Do not change `ModuleContext`, IPC contracts, database schema, workspace services, or SettingsPanel behavior.

## Test Plan

- Run from `app-shell/`: `npm run audit:contrast`, `npm run typecheck`, `npm run build`.
- Keyboard-smoke the Activity Rail:
  - Arrow Up/Down cycles through project switcher/module controls/More without landing on removed Settings.
  - Home/End still land on valid rail controls.
  - More flyout still opens, closes with Esc, and activates advanced modules.
- Confirm Settings still opens from:
  - Top-right gear.
  - `Cmd+,`.
  - Command palette command.
- Capture screenshot evidence showing only one visible Settings gear in Documents and at least one advanced-module state.

## Assumptions

- The top-right Settings gear is the single surviving Settings control.
- This is small enough to implement directly without a new numbered implementation plan.
- Documentation update can be limited to the next handoff unless implementation reveals a broader stale-doc mismatch.