# App Shell UI/UX Review - 2026-06-26

## Scope

This review covers the current Electron/Svelte App Shell UI from fresh `SHELL_CAPTURE` evidence. The baseline is the project goal in `docs/architecture/shell-platform-spec.md`: a compact, keyboard-first, local-first desktop shell with consistent panel grammar across modules.

The review focuses on visual polish, visual prioritization, usability, whether the user sees too much information, and whether elements consume more space than they earn.

## Evidence

Screenshots are saved in `workspace-agents/implementation/ui-ux-audit-2026-06-26/screenshots/`.

- `01-documents-default.png` - Documents default, sidebar open, inspector hidden.
- `02-documents-ai-inspector.png` - Documents with editor toolbar, AI inspector, pending proposal.
- `03-prompt-studio-default.png` - Prompt Studio default.
- `04-prompt-studio-run-history.png` - Prompt Studio with run-history inspector.
- `05-ai-chat-context.png` - AI Chat with context/model/run inspector.
- `06-table-view-default.png` - Table View default.
- `07-assets-default.png` - Assets image preview.
- `08-workflow-runner-default.png` - Workflow Runner default.
- `09-settings-ai.png` - Settings searched for `ai`.
- `10-command-palette.png` - Command palette searched for `document`.
- `11-jobs-panel.png` - Jobs/toast state.
- `12-documents-narrow.png` - Documents at 900 x 1000.
- `13-web-default.png` - Web module with page inspector.

## Executive Summary

The app is visually calm and structurally coherent, but it often feels more like an engineering workbench than a human-centered writing tool. The shell grammar is stable: rail, sidebar, main pane, inspector, status area, command palette, and settings all behave consistently. That foundation is worth preserving.

The main UX issue is not raw ugliness. It is prioritization. Many screens expose the full machinery of the system at once: folders, archived folders, toggles, model controls, run history, context, variable chips, technical IDs, plugin state, provider status, job status, and command surfaces. This makes powerful features visible, but it also makes the user work to understand what matters right now.

The strongest screen is Assets because the user sees the object of work first. The weakest moments are empty or narrow states where the app tells the user to act on UI that is not visible, and AI surfaces where control panels compete with the actual writing/chat task.

## Prioritized Findings

### P1 - Default states can feel empty or broken before they feel usable

Evidence: `01-documents-default.png`, `08-workflow-runner-default.png`, `11-jobs-panel.png`, `12-documents-narrow.png`.

Documents opens to a mostly blank canvas with "No document open." The next action is in the far-left tree, but the main pane does not help the user choose a document, create one, or continue recent work. Workflow Runner similarly shows a mostly empty main area with only "No recent runs." In the narrow viewport, the app says "Select a document in the manuscript tree," but the tree is hidden by responsive layout.

Why it matters: a user should not have to infer whether they are in the right place. Empty states should answer "what can I do now?" and should never point to hidden UI.

Recommended direction:

- Make empty states action-oriented: "Open recent document," "Create chapter," "Show manuscript tree," or "Run selected chain."
- On narrow layouts, change copy and affordances to match the collapsed panels.
- Consider selecting the first relevant document/project by default when demo/sample content is active.

### P1 - AI surfaces expose too much operational machinery at once

Evidence: `02-documents-ai-inspector.png`, `04-prompt-studio-run-history.png`, `05-ai-chat-context.png`.

Documents AI shows instruction input, action chips, preview chips, pending proposals, source verification, apply/copy/reject, annotations, version history, and metadata in the same inspector. Prompt Studio shows prompt template, tags, variables, output, run settings, context, run history, status, and technical run detail at once. AI Chat shows conversation, context tree, model/provider controls, temperature, status, and run history together.

Why it matters: the user is trying to write, revise, ask, or run. The app keeps showing how the system works. That creates cognitive drag and makes important actions less obvious.

Recommended direction:

- Split AI inspectors into progressive sections: "Run", "Context", "History", "Advanced".
- Keep the default inspector focused on the next action and the result. Hide provider/model/temperature and raw run history behind disclosure unless the user opens them.
- Treat technical run metadata as an audit/detail view, not the default user-facing view.

### P1 - Prompt Studio navigation is visually heavy

Evidence: `03-prompt-studio-default.png`, `04-prompt-studio-run-history.png`.

The prompt template list uses tall rows, long wrapped titles, comma-separated tag text, and inline controls such as "Name" and "Copy." This makes a compact utility panel feel like a long document, and it reduces scan speed. The selected template's main editor also has large empty vertical space while variable chips and output occupy persistent bands.

Why it matters: Prompt Studio is a precision tool. It should help users quickly choose, edit, preview, and run. The current list and workspace make the user parse too much structure before acting.

Recommended direction:

- Make template rows one or two lines with ellipsis, compact tag chips/counts, and an overflow menu for secondary actions.
- Promote "Run Template" and "Preview Prompt"; demote template metadata until needed.
- Consider a focused edit mode where variables/output/history appear only after preview or run.

### P1 - Table View exposes filter machinery before user intent is clear

Evidence: `06-table-view-default.png`.

The top row shows search, text/regex, folder, kind, min words, max words, date, sort key, and sort direction all at once. The document list itself is readable, but the first visual impression is a database admin filter bar.

Why it matters: this surface should support scanning and managing writing assets. When all filters are visible all the time, the UI makes the user feel like they are operating a query console.

Recommended direction:

- Keep search, active filters, and sort visible.
- Move advanced filters into a single "Filters" disclosure or side panel.
- Show active filter chips only when applied.

### P2 - Shell chrome gives secondary controls equal visual priority

Evidence: all screenshots, especially `01-documents-default.png`, `05-ai-chat-context.png`, `13-web-default.png`.

The top-right controls, rail icons, jobs badge, sidebar toggles, inspector toggle, command icon, and settings icon all have similar visual weight. `JOBS` is the only top action with a text label, so it can appear more important than the active module task.

Why it matters: consistent chrome is good, but equal-weight controls create visual noise. Users should quickly see the module's primary task before global utilities.

Recommended direction:

- Keep global chrome compact and lower contrast unless active/alerting.
- Reserve strong button styling for module-primary actions like Run, Apply, Send, Import, or Create.
- Add labels/tooltips consistently, but avoid making utility labels louder than the work surface.

### P2 - Settings language is internally accurate but user-hostile

Evidence: `09-settings-ai.png`.

"Core & Custom Plugins," "Search plugins," "Custom Plugins," "AI Chat Disabled," and demo-mode copy about training/screenshots/offline testing read like internal system controls. This is true to the platform architecture, but not necessarily to a writer using a packaged app.

Why it matters: settings are where users decide whether they trust the app. Internal implementation language makes the app feel less polished and less productized.

Recommended direction:

- For end-user builds, use "Features" or "Tools" rather than "Plugins" unless the app truly exposes a plugin ecosystem.
- Split developer/demo controls away from ordinary user settings.
- Make AI setup read like "AI Tools" or "Model Settings" rather than module plumbing.

### P2 - Run history is useful but too technical by default

Evidence: `04-prompt-studio-run-history.png`, `05-ai-chat-context.png`, `RunHistoryList.svelte`.

Expanded run history shows provider, model, temp, origin, completed time, Run ID, rendered prompt, and output. This is excellent for debugging, but excessive as the default history experience.

Why it matters: users usually need to answer "what happened, can I reuse it, can I inspect it?" They do not always need raw IDs and full rendered prompts.

Recommended direction:

- Default history card: status, time, template/conversation, short output/result, "Use settings," "Open details."
- Put Run ID, rendered prompt, and raw metadata behind "Details" or "Developer/Audit."

### P2 - Narrow layout collapses panels without replacing their function

Evidence: `12-documents-narrow.png`, `AppShell.svelte`.

The shell intentionally collapses sidebar and inspector at `max-width: 900px`. The layout becomes visually clean, but the user loses the document tree and inspector. The empty state still references the hidden manuscript tree, and there is no obvious inline recovery path.

Why it matters: even if desktop is primary, users resize windows. Collapsing panels should not strand the task.

Recommended direction:

- Add responsive empty-state actions: "Open documents," "Open inspector," "Command palette."
- Consider a drawer pattern for the sidebar/inspector in narrow mode.
- Audit every empty state for references to hidden panels.

### P3 - Assets shows the best hierarchy and should become the model

Evidence: `07-assets-default.png`.

Assets puts the selected image in the center, gives it breathing room, keeps metadata secondary, and groups actions at the bottom. It feels more user-centered because the object of attention is unmistakable.

Why it matters: this proves the current visual system can feel humane without a redesign. The problem is mostly composition and disclosure, not tokens.

Recommended direction:

- Use the Assets pattern as a heuristic: object first, metadata second, tools third.
- Apply that heuristic to Documents, AI Chat, Prompt Studio, and Workflow Runner.

## Surface Notes

### Documents

Healthy: editor typography and AI proposal actions are clear when a document is open. Source verification is valuable and should stay visible when relevant.

Needs work: default empty state, archived folders taking persistent sidebar space, AI inspector density, and toolbar/action competition.

### Prompt Studio

Healthy: the conceptual pieces are correct: templates, prompt body, variable support, preview/run, output, and history.

Needs work: template list density, visible technical chips, always-on variable band, run-history detail density, and "No runner registered" toast state.

### AI Chat

Healthy: conversation list, chat transcript, composer, and context panel are recognizable and coherent.

Needs work: right inspector mixes context, model tuning, status, and run history. The chat task should stay dominant unless the user opens advanced settings.

### Table View

Healthy: table columns are legible and useful.

Needs work: advanced filters dominate the first row. Make the table feel like a writing dashboard, not a query builder.

### Assets

Healthy: strongest hierarchy in the app. The asset is primary, metadata and actions are secondary.

Needs work: the left library is mostly empty in the captured state; if common, it needs a better library affordance.

### Workflow Runner

Healthy: simple chain list and one primary "Run Chain" action.

Needs work: selected chain main area is too empty. A user needs to see what the chain does, its steps, last output, and why it is draft/ready.

### Web

Healthy: browser structure is familiar, with bookmarks/history/sidebar and page inspector.

Needs work: this is one of the busiest shell compositions: rail, web sidebar, tabs/address bar, page, and inspector all compete. Default inspector should likely be closed unless the user asks for page details.

### Settings

Healthy: modal is compact and searchable.

Needs work: language and grouping are too implementation-facing. Demo/developer settings should be separated from everyday user settings.

### Command Palette

Healthy: command search is clear and keyboard-first.

Needs work: row height and large modal consume significant space. It is acceptable for a command palette, but grouping and secondary descriptions could make results more scannable.

## Recommended Implementation Order

1. Fix empty states and narrow-state copy/actions.
2. Reduce default AI inspector density with collapsible sections or tabs.
3. Simplify Prompt Studio nav rows and move secondary row actions to overflow.
4. Collapse Table View advanced filters by default.
5. Reword Settings from internal module/plugin language to user-facing feature language.
6. Split run history into summary cards plus details.
7. Make default inspector visibility module-specific: open when it is the task, closed when it is metadata.

## Bloat Guardrails

- Do not redesign the token system first. The current palette, spacing, and typography are workable.
- Do not add new AI features to solve density. This is mostly disclosure, copy, and hierarchy.
- Do not make every panel card-based. The app already benefits from restrained desktop utility styling.
- Avoid adding another permanent panel. Prefer better defaults, collapsible sections, and context-aware empty states.

## Validation Notes

- Fresh evidence captured with `SHELL_CAPTURE`.
- Optional modules were explicitly enabled for corrected Prompt Studio, AI Chat, and Workflow Runner captures.
- One Web capture logged a Chromium service-worker storage warning, but the screenshot rendered and was usable for visual review.
- No application code was changed in this review.
