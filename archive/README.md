# Archive

Point-in-time artifacts from the **2026-05-29 decision phase**. Kept for provenance — they are **not needed for forward development**. The decisions they produced are authoritative in `0-shell-platform-spec.md` §12.

If you're a new agent orienting to this workspace: you can safely skip this folder. Start with `CLAUDE.md` and `HANDOFF.md` at the root, then `reference/`.

## Contents

**Agent implementation plans and screenshot evidence of completion:**
`plans-1-through-29.zip`
`screenshots-20260529-20260605.zip`

**Decision record (how the stack was chosen):**
- `decision-questionnaire.md` — the 11-question framework, with leans and rationale
- `decision-questionnaire.html` — the interactive form Carlo filled in (auto-save, export)
- `decision-answers.md` — Carlo's submitted answers (the raw input; superseded by §12 of the spec)

**Background research (decisions now made, so superseded):**
- `application-categories.md` — app-category taxonomy → resolved: it's an authoring workbench
- `boilerplate-shells.md` — scaffold/runtime survey → resolved: Electron
- `app_shell_architectures.html` — interactive runtime/framework configurator → resolved: Electron + Svelte
- `app_shell_styling.html` — single-file CSS demo → superseded by draftwell's actual `styles/` token system (see `reference/draftwell-anchor-analysis.md` §4)

Note: the still-useful *technique* doc `single-file-css.md` was kept in `reference/`, not archived, because it informs the theming/chrome implementation that's still ahead.
