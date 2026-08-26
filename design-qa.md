# Active Project Highlight Design QA

**Comparison target**

- Source visual truth: `/Users/carlo/.codex/generated_images/01a03ac7-7623-7de3-b900-bb151c541407/exec-64fdadc8-d4e5-458c-85a6-f5318e2c4692.png`
- Renderer implementation: `/Users/carlo/Github/app-shell-project/workspace-agents/implementation/screenshots/active-project-highlight-after-2026-08-25.png`
- Full-view comparison: `/Users/carlo/Github/app-shell-project/workspace-agents/implementation/screenshots/active-project-highlight-design-qa-2026-08-25.png`
- Focused comparison: `/Users/carlo/Github/app-shell-project/workspace-agents/implementation/screenshots/active-project-highlight-design-qa-focus-2026-08-25.png`
- State: light shell, Table View active, project sidebar open, current project `Daylight Won't Save You`, inspector closed.
- Viewport and density: the live Electron window capture is 1159 x 768 pixels; its CSS viewport and device scale factor are not exposed by the accessibility capture. The generated source is 1516 x 1038 pixels with no reliable CSS density metadata. For full-view comparison, each artifact was proportionally fit inside a 700 x 480 pixel panel. For the focused comparison, the source and rendered sidebar crops were proportionally normalized to 600 pixels tall before being placed together.

**Findings**

- No actionable P0, P1, or P2 differences. The rendered current-project row carries the selected concept's three identifying cues: a three-pixel navigation-accent marker, a restrained accent wash, and a subtle inset outline. The treatment is confined to the current row and does not add a badge, type label, or new control.
- The source uses a violet concept accent while the implementation resolves `--accent-nav` for the active theme. This is intentional token mapping, not design drift; it keeps the state consistent across the shell's supported themes.
- The source enlarges the sidebar and typography for concept legibility. The implementation preserves the production sidebar width and existing type scale, so long project names still use the established ellipsis behavior.

**Required fidelity surfaces**

- Fonts and typography: existing family, weight, size, line height, and truncation are unchanged. Hierarchy now comes from the row treatment instead of extra text.
- Spacing and layout rhythm: the row grows from 30 to 34 pixels to support the selected emphasis while retaining the existing section spacing, menu column, radius, and alignment.
- Colors and visual tokens: the wash, outline, and marker all derive from `--accent-nav` and `--color-shell-sidebar`; contrast is visible without competing with the active module or selected document states.
- Image quality and asset fidelity: no image assets are introduced or approximated. The concept is implemented with native renderer styling.
- Copy and content: project names and labels are unchanged; the removed project type remains absent.

**Full-view comparison evidence**

The combined full-view image confirms that the active project reads first within the sidebar without adding clutter or changing the surrounding work surface. The production rendering is denser than the concept by design, but the state hierarchy remains clear.

**Focused region comparison evidence**

The focused sidebar comparison confirms that the marker thickness, quiet fill, inset outline, rounded corners, title placement, and overflow placement all preserve the chosen direction at production scale.

**Comparison history**

- Pass 1: no actionable P0, P1, or P2 findings, so no fix-and-recapture iteration was required.

**Implementation checklist**

- [x] Apply the selected marker, wash, and outline to the current-project row only.
- [x] Use existing theme tokens rather than a fixed concept color.
- [x] Preserve the overflow menu, project switching, and truncation behavior.
- [x] Verify the rendered Electron state against the selected source visual.

**Follow-up polish**

- None required for this slice.

final result: passed
