# Jewel Box CSS Pass

## Summary

Upgrade the live app’s CSS from a generic neutral theme into a reusable **Jewel Box shell theme**, based on the shared language in the mockups. Scope the first pass to shared shell chrome plus the Documents module, with a quiet centered prose canvas rather than a literal paper page.

## Key Changes

- Extend `app-shell/src/renderer/src/styles/tokens.css` with durable jewel and role tokens:
  - Palette: `--jewel-ruby #9F1239`, `--jewel-amber #B45309`, `--jewel-citrine #CA8A04`, `--jewel-emerald #047857`, `--jewel-sapphire #1D4ED8`, `--jewel-amethyst #6D28D9`, `--jewel-tourmaline #BE185D`.
  - Shell roles: `--color-shell-topbar`, `--color-shell-sidebar`, `--color-shell-main`, `--color-shell-inspector`, `--color-shell-status`, `--color-border-strong`, `--color-hover`, `--shadow-panel`.
  - Zone accents: `--accent-nav`, `--accent-editor`, `--accent-inspector`, `--accent-status`, mapped to emerald, sapphire, amethyst, and emerald/citrine respectively.
  - Keep light/dark/system support; do not remove existing generic tokens.

- Update shared shell chrome in `AppShell.svelte` and shell components:
  - Give topbar, rail, sidebar, inspector, resize handles, and status bar distinct surface roles instead of one flat `--color-bg-surface`.
  - Add subtle border hierarchy, hover states, active bars, restrained glow on active controls, and compact uppercase label styling.
  - Preserve current layout, persisted resizing, zen mode, command palette, settings, and jobs behavior.

- Upgrade Documents module styling:
  - Nav tree: use emerald/amethyst active indicators, tighter row states, clearer folder/file hierarchy, and stable ellipsis behavior.
  - Main editor: use a quiet centered prose canvas, improved heading/body rhythm, refined serif defaults, wider breathing room, and subtle selection/table/accent styling.
  - Inspector: use amethyst-accented section headers, denser metadata rows, badge/chip treatment for kind/status fields, and clearer history cards.
  - Floating toolbar: align with Jewel Box chrome using shared panel shadow, active sapphire/amethyst treatment, and consistent button radii.

## Interfaces / Compatibility

- No TypeScript API, IPC, database, module contract, or behavior changes.
- CSS tokens become the public design surface for future modules; existing tokens remain supported so other modules do not break.
- No wholesale mockup CSS import. Implement by translating shared mockup patterns into the current Svelte structure.

## Test Plan

- Run from `app-shell/`:
  - `npm run typecheck`
  - `npm run build`
- Capture screenshot evidence after the pass:
  - Documents module in dark theme.
  - Documents module in light theme.
  - Sidebar and inspector visible.
  - Sidebar/inspector collapsed or resized.
- Visual acceptance:
  - App still reads as the same fixed-zone shell.
  - Documents is clearly more polished and writing-focused.
  - Active nav, editor, inspector, and status states use distinct jewel roles.
  - Text remains readable in both themes and does not overflow controls.

## Assumptions

- First pass applies visibly to shared shell chrome and Documents only.
- Editor direction is **Quiet Canvas**: centered prose with refined typography, not a literal paper sheet and not a fully dark manuscript-only treatment.
- Other modules may inherit improved shell tokens immediately, but their internal UI cleanup is deferred unless required to avoid obvious visual clashes.
