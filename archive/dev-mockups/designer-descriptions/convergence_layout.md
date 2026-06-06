They all describe the same core pattern: **a desktop-style app shell for a document/editor workspace.**

Common ground across claude-description.md (line 1), chatgpt-description.md (line 1), and gemini-description.md (line 7):

**Three-pane layout:** left navigation/file tree, central editor/canvas, right inspector/properties panel.

**IDE / Obsidian / VS Code mental model:** not a simple webpage, but a productivity workspace.

**Persistent app chrome:** top title/global controls, secondary context or breadcrumb bar, bottom status bar.

**Document-centric workflow:** the center canvas is the main focus; surrounding panels support navigation, context, and metadata.

**Resizable/collapsible side panels:** left panel open by default, right inspector available on demand.

**Designer vocabulary overlap:** app shell, workspace layout, split panes, dockable panels, inspector, status bar, editor canvas, navigation-content-inspector pattern.

---
The cleanest shared label would be:

> A document-centric, three-pane desktop app shell with persistent chrome, left navigation, central editor canvas, right inspector, and bottom status bar.

In project terms, they’re all converging on the same architectural direction already in the repo: a fixed-zone shell where modules fill navigation, main, inspector, and status regions.