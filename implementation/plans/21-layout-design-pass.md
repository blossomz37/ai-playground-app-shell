# Plan 21 - Layout Design Pass

## Summary

Refine the existing fixed-zone app shell into a durable, module-friendly desktop workspace layout that can support authoring, AI tools, research, assets, tables, workflow runs, and future modules without redesigning the shell each time. This is the structural pass that should happen before the Jewel Box CSS pass.

The pass will keep the current architecture but improve the design hierarchy:

- Add a persistent **context strip** below the titlebar.
- Make the **inspector closed by default** and clearly on-demand.
- Strengthen the visual hierarchy: rail = tool, sidebar = module inventory, main = protected work surface, inspector = contextual detail.
- Move the **status bar to full shell width** so it reads as stable app chrome.
- Lightly polish Documents as the reference module, without doing the full Jewel Box visual theme yet.

## Key Changes

- **Shell chrome**
  - Restructure the shell grid to four rows: titlebar, context strip, body, full-width status bar.
  - Keep the activity rail, sidebar, main pane, and inspector as fixed shell zones.
  - Preserve existing resize/toggle/zen behavior, updating handle positions for the new titlebar + context strip height.
  - Keep shell layout stable across modules; modules fill zones but do not create new layout regions.

- **Context strip**
  - Add a shell-owned `ContextStrip` component.
  - Display, left to right: active workspace, active module, contextual breadcrumb/active object, and compact shell actions.
  - Include explicit controls for sidebar toggle, inspector toggle, zen mode, command palette, and jobs/settings where appropriate.
  - Add a small renderer-side context descriptor store so future modules can contribute breadcrumb/action metadata without changing the main-process module contract.

- **Inspector behavior**
  - Change fresh-layout defaults to `inspectorVisible: false` in Electron and browser-preview defaults.
  - Preserve existing persisted user layout state; if a saved layout has the inspector open, do not override it.
  - Make the context-strip inspector toggle the primary affordance, with accessible labels like `Show inspector` / `Hide inspector`.
  - Documents inspector remains collapsible internally, but the whole inspector is progressive disclosure.

- **Visual hierarchy**
  - Use semantic layout tokens or local CSS variables for row heights, panel widths, chrome backgrounds, and canvas surfaces.
  - Make the main pane visually dominant: lower-contrast side panels, restrained borders, clearer active states, and stable scroll containment.
  - Normalize shell chrome density so it feels like a professional desktop workspace rather than stacked demo panels.
  - Keep this pass structurally restrained: do not add the full jewel palette, glow language, or deep theme polish planned for Plan 22.

- **Documents reference module**
  - Move document location/context emphasis into the context strip.
  - Keep the editor canvas calm and dominant.
  - Tighten Documents nav/header and inspector spacing enough to match the new shell hierarchy.
  - Do not redesign other module internals in this slice; they should remain functional under the new chrome.

## Interfaces And Types

- Add a renderer-only shell context descriptor, for example:
  - `ShellContextTrailItem`: `{ id, label, commandId? }`
  - `ShellContextAction`: `{ id, label, commandId, disabled? }`
  - `ShellContextDescriptor`: `{ moduleId, primaryLabel?, secondaryLabel?, trail?, actions? }`
- Do **not** change the main-process `ModuleContext` contract in this pass.
- Do **not** add new database tables or migrations.
- Update `LayoutState` defaults only; the shape can remain unchanged unless implementation discovers a concrete need.

## Implementation Notes

- This plan is the durable artifact for the slice: `implementation/plans/21-layout-design-pass.md`.
- Main implementation areas:
  - Shell layout/chrome components under `app-shell/src/renderer/src/shell/`
  - Layout defaults in the main layout service and browser preview shell
  - Documents renderer views as the reference module alignment pass
- Use Svelte 5 runes style consistent with the existing code.
- Run the Svelte autofixer on every changed `.svelte` file before final validation.
- Avoid module-specific shell hacks. If Documents needs context data, feed it through the new renderer context descriptor pattern so future modules can reuse the same path.

## Test Plan

- From `app-shell/`, run:
  - `npm run typecheck`
  - `npm run build`
- Validate interactions:
  - Fresh launch shows inspector closed.
  - Context strip shows workspace, module, and Documents active document context.
  - Cmd+I and the context-strip toggle open/close the inspector.
  - Sidebar resize, inspector resize, sidebar toggle, and zen mode still work.
  - Documents editing, word count, save state, and version/history inspector still work.
  - Non-Documents modules still render without broken context/status chrome.
- Capture screenshot evidence in `implementation/screenshots/`:
  - Before screenshot of current Documents layout.
  - After screenshot of Documents with inspector closed.
  - After screenshot of Documents with inspector open.
  - After screenshot of at least one non-Documents module, such as Web or AI Chat.
- Use names like:
  - `layout-design-pass-before-2026-06-04.png`
  - `layout-design-pass-documents-after-2026-06-04.png`
  - `layout-design-pass-documents-inspector-after-2026-06-04.png`
  - `layout-design-pass-module-after-2026-06-04.png`

## Assumptions And Defaults

- Inspector default: **closed by default** for fresh layouts.
- Status placement: **full shell width**.
- Scope: **shell chrome plus Documents reference polish**.
- Theme depth: **structural polish only**. Full Jewel Box tokens, zone accents, and prose-surface styling belong in Plan 22.
- The activity rail remains a permanent first-class zone.
- The context strip is shell-owned and durable; it should support future modules without creating arbitrary new panel zones.
- The goal is not a visual reskin. The goal is a clearer, more resilient layout model that can handle many module types while preserving a stable user mental model.
