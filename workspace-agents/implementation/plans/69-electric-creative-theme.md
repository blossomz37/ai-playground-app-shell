# Plan 69 - Electric Creative Theme

## Summary

Add the Electric Creative design language (`/Users/carlo/BOOKHUB/agents/knowledge/DESIGN.md`) to App Shell as a new selectable theme named `electric`, alongside the existing `light`, `dark`, `gray`, and `system` modes.

This is a **palette pass, not a reskin**. It changes color token values and adds one theme mode. It does not change spacing, radii, type scale, chip design, progress bars, component structure, or bundled fonts. Those are recorded in "Deferred Upgrades" for a later decision.

Public interface changes: one new union member on `ThemeMode`. If implementation appears to require changes to `ModuleContext`, `LayoutState`, IPC, SQLite schema, or the design-token API beyond adding a `[data-theme="electric"]` block, stop and update this plan before coding.

## Design Decisions Already Made

| Decision | Choice | Rationale |
|---|---|---|
| Ship as new theme or replace existing | New theme, additive | Nothing existing breaks; side-by-side comparison possible |
| Keep per-zone accent colors | Keep them | Carlo: an assortment that supports the workspace is wanted, provided it does not distract |
| Zone accent palette | **Wider spread** (violet / teal / plum / warm flare) | Four near-violet hues would be indistinguishable, defeating the purpose of zone color |
| Ember reserved for selection/focus/action | Yes, but in Slice 2 | Requires component edits, not token edits; kept out of the pure-palette slice |
| Bundle the five brand typefaces | Deferred | Offline Electron app requires locally bundled font files; separate unit of work |

## Current-State Findings

Established by inspection on 2026-08-23:

- `src/renderer/src/styles/tokens.css` is the single source of color truth. Themes are palette blocks keyed on `[data-theme="..."]`.
- 54 Svelte files, only 26 hardcoded hex values across 7 files. Token discipline is good.
- Theme mode is enumerated in exactly four places: `src/shared/module-contract.ts:31`, `src/main/core/theme.ts:4`, `src/main/core/theme.ts:11`, `src/renderer/src/shell/AppearanceSettings.svelte:5`.
- Zone accents (`--accent-nav`, `--accent-editor`, `--accent-inspector`, `--accent-status`) are used ~100 times, almost always via `color-mix()` at 7%-30% strength. They are quiet washes and hairlines, not loud fills.
- The `gray` theme already flattens all four zone accents to one blue (`tokens.css:218-221`). Precedent exists for a theme setting its own accent policy.
- `--color-fg-accent` is aliased to `--color-accent` at `tokens.css:41`. This is a contrast hazard for this theme (see Slice 1 risks).
- `--font-mono` already lists `JetBrains Mono` first, so the technical voice renders correctly wherever the font is installed. No bundling needed for the mono role.

## Implementation Slices

### Slice 1 - Electric Palette as a New Theme

Goal: `electric` is selectable in Appearance settings and renders as a near-black indigo frame around a bright editorial page, with four distinguishable zone accents drawn from the brand family.

Likely files:

- `app-shell/src/renderer/src/styles/tokens.css` (new `[data-theme="electric"]` block)
- `app-shell/src/shared/module-contract.ts` (add `'electric'` to `ThemeMode`)
- `app-shell/src/main/core/theme.ts` (add to `themeModes`; map to `light` in `toNativeThemeSource`)
- `app-shell/src/renderer/src/shell/AppearanceSettings.svelte` (add picker option)

Proposed token values. These are the starting point, not frozen; adjust during screenshot review.

```css
[data-theme="electric"] {
  /* Surfaces - bright working page */
  --color-bg-base:     #fbfaff;  /* page field */
  --color-bg-surface:  #ffffff;  /* paper */
  --color-bg-overlay:  #f2effa;  /* lilac mist */
  --color-bg-active:   #fff4ec;  /* ember wash */

  /* Text */
  --color-fg-primary:  #373245;  /* body ink        11.9:1 */
  --color-fg-secondary:#514a68;  /* muted dark */
  --color-fg-muted:    #6f6980;  /* muted ink        5.0:1 - contrast floor */

  /* Accent - ember */
  --color-accent:      #ff7a45;  /* fills, focus, progress only */
  --color-accent-dim:  #fff4ec;
  --color-action-text: #c0461a;  /* ember text       4.9:1 */
  --color-fg-accent:   #c0461a;  /* OVERRIDE the alias - see risks */

  /* Semantic - values provisional, must pass the Slice 1 distinguishability check */
  --color-danger:      #a31d2e;  /* leans red, not rust, to separate from ember */
  --color-success:     #2d7a52;
  --color-warn:        #9a6410;

  /* Borders */
  --color-border:        #ded9ea;  /* hairline - decorative only */
  --color-border-strong: #6f6980;  /* real control boundary */

  /* Shell chrome - dark indigo frame */
  --color-shell-topbar:    #100d24;  /* indigo void */
  --color-shell-rail:      #16122f;  /* secondary void */
  --color-shell-status:    #100d24;
  /* Shell body - bright field */
  --color-shell-sidebar:   #ffffff;
  --color-shell-main:      #fbfaff;
  --color-shell-inspector: #f2effa;

  --color-hover:            rgb(16 13 36 / 0.05);
  --color-panel-glint:      rgb(255 255 255 / 0.70);
  --color-focus-ring:       #ff7a45;
  --color-focus-ring-offset:#fbfaff;

  /* Zone accents - wider spread, one family plus one cool outlier */
  --accent-nav:       #6b5fd6;  /* violet     - from the brand gradient */
  --accent-editor:    #3e8e93;  /* teal       - the outlier, for zone legibility */
  --accent-inspector: #8e5fc7;  /* plum */
  --accent-status:    #ffb054;  /* warm flare - from the brand gradient, sits on indigo */

  /* Editor table */
  --editor-table-border:    #ded9ea;
  --editor-table-header-bg: #f2effa;
  --editor-table-header-fg: #100d24;
  --editor-table-cell-bg:   #ffffff;
  --editor-table-selection: #8e5fc7;
  --editor-table-resize:    #ff7a45;

  /* Depth - indigo-tinted, never neutral black */
  --shadow-panel:       0 10px 26px rgb(16 13 36 / 0.08), 0 0 0 1px rgb(16 13 36 / 0.05);
  --shadow-active-glow: 0 0 0 1px color-mix(in srgb, var(--color-accent) 40%, transparent),
                        0 6px 18px color-mix(in srgb, var(--color-accent) 18%, transparent);
}
```

Also required in `theme.ts`:

```ts
const themeModes: ThemeMode[] = ['light', 'dark', 'gray', 'electric', 'system']

export function toNativeThemeSource(mode: ThemeMode): NativeThemeSource {
  return mode === 'gray' || mode === 'electric' ? 'light' : mode
}
```

`themeStartupBackground` returns `#f5f3f0` for light-family modes. Acceptable for Slice 1; optionally return `#fbfaff` for `electric` to avoid a one-frame flash of the wrong off-white on launch.

Known risks, to be checked explicitly during this slice:

1. **`--color-fg-accent` contrast.** The alias at `tokens.css:41` resolves to bright ember `#ff7a45`, which is 2.5:1 on the page field and fails as text. The block above overrides it to `#c0461a`. Verify no component reads `--color-accent` directly for text.
2. **`color-mix()` percentages were tuned against dark backgrounds.** At 7%-15% over a white sidebar, zone tints and selection washes may be too faint to see. The existing `light` and `gray` themes share this exposure, so compare against them rather than treating any faintness as new. Raise mix percentages in the component only if the theme-level fix is insufficient, and record any component edit as scope growth.
3. **Danger vs. link.** Rust-family danger and ember link text can read as the same color. The proposed `#a31d2e` leans red deliberately. Confirm the two are distinguishable side by side; if not, push danger further from ember rather than moving the link color.
4. **Warm flare on indigo only.** `--accent-status` `#ffb054` is chosen for the dark status bar. Confirm no light-surface component consumes `--accent-status` as text.

Acceptance criteria:

- `electric` appears in Appearance settings and persists across restart.
- The composition reads as a dark indigo frame (topbar, rail, status bar) around a bright page (sidebar, main, inspector).
- The four zone accents are distinguishable from each other at a glance.
- Bright ember `#ff7a45` appears only as fill, border, focus ring, or progress - never as body or link text on a light surface.
- Muted text is at or above `#6f6980`; nothing fainter.
- Focus rings remain visible on both the indigo chrome and the bright page.
- No component file is edited. If a component edit proves unavoidable, stop and record it here first.
- No new dependency, no font bundling, no spacing or radius change.

Screenshot evidence: `electric-theme-documents-after-2026-08-23.png`, `electric-theme-settings-after-2026-08-23.png`, `electric-theme-tableview-after-2026-08-23.png`.

Validation: Svelte autofixer on any touched Svelte file, `cd app-shell && npm run typecheck`, `cd app-shell && npm run build`, `git diff --check`.

Out of scope: component edits, selection-signal changes, fonts, spacing, radii, type scale.

### Slice 2 - Separate Zone Signal from Selection Signal

Goal: a zone accent means "which panel am I in." Ember means "this is selected, focused, or the primary action." Today `--accent-nav` does both jobs, so a highlighted row is ambiguous.

Gate: do not start until Slice 1 screenshots are accepted.

Likely files, from the current-state scan:

- `src/renderer/src/modules/documents/DocumentTreeRow.svelte:179,189,221` (selected and active row)
- `src/renderer/src/shell/WorkspaceSwitcher.svelte:385,552,561` (active workspace)
- `src/renderer/src/modules/documents/DocumentSearchPanel.svelte:241,340` (active result)
- `src/renderer/src/modules/assets/InspectorView.svelte:375` (active typeahead result)
- `src/renderer/src/modules/aichat/NavView.svelte:194` (active item)
- `src/renderer/src/shell/ActivityRail.svelte:378-401` (active module)

Approach: introduce a `--accent-selection` semantic token. Default it to the current zone accent in every existing theme so `light`, `dark`, and `gray` are visually unchanged. Set it to ember in `electric`. Then repoint the selection-only usages above from `--accent-*` to `--accent-selection`.

Acceptance criteria:

- `light`, `dark`, and `gray` render identically to before, verified by before/after screenshots.
- In `electric`, selected and active items read ember; zone identity tint remains the zone hue.
- Selection is still expressed by at least two signals (wash plus border), not color alone.
- No change to component structure or markup beyond the CSS custom property being read.

Screenshot evidence: `electric-selection-split-after-<date>.png`, plus one unchanged-theme regression shot per existing theme.

Validation: same gates as Slice 1.

Out of scope: everything in Deferred Upgrades.

## Deferred Upgrades

Recorded so the decision is available later. None of these are authorized by this plan.

| Item | Why deferred | Rough size |
|---|---|---|
| Bundle Anton, Bricolage Grotesque, Hanken Grotesk, Atkinson Hyperlegible | Offline Electron app needs local font files, a licence check, `@font-face` wiring, and a type-role mapping. Not palette work. | Medium |
| Type scale to the DESIGN.md reference (18px body, 1.65 line height) | App Shell currently runs 14px body. Changing it reflows every view. | Large |
| Chip and tag redesign (4px, pale fill, quiet border) | Component work across several modules. | Small-medium |
| Progress and meter treatment (visible numerator/denominator, pale track, ember fill) | Component work; DESIGN.md 3.6. | Small |
| Radius alignment (4px chip / 6px control / 8px card) | Current tokens are 4/6/10. Only the card radius differs. | Trivial, but visual |
| Reading-width cap near 720-760px for long-form views | Interacts with the panel layout system. | Medium |
| The optional cosmic brand gradient for identity moments | Flourish, not a surface. No current placement. | Small |

## Fresh Session Notes

- The design language source of truth is `/Users/carlo/BOOKHUB/agents/knowledge/DESIGN.md`. It is a cross-project brand file, not owned by this repo. Do not edit it from here.
- Section 15 of that file is a review checklist. Use it during screenshot review, but only for the parts this plan covers - the brand, colour, and accessibility rows. The density, form, and typography rows depend on deferred work and will not pass yet.

---

## Slice 1 Outcome — 2026-08-23

**Status: code complete, gates green, screenshots captured. Accepted pending Carlo's review.**

Delivered:

- `[data-theme="electric"]` palette block at `app-shell/src/renderer/src/styles/tokens.css:232`.
- `ThemeMode` extended at `app-shell/src/shared/module-contract.ts:31`.
- Mode registered and mapped to the light native source in `app-shell/src/main/core/theme.ts:4,11`.
- `themeStartupBackground` returns `#fbfaff` for `electric`, avoiding a launch flash of the light theme's warmer `#f5f3f0`.
- Appearance picker entry ("⚡ Electric") in `app-shell/src/renderer/src/shell/AppearanceSettings.svelte:8`.

Zero component files edited, as required.

Validation: `npm run typecheck` clean, `npm run build` clean, `git diff --check` clean.

Screenshots in `workspace-agents/implementation/screenshots/`:
`electric-theme-documents-after-2026-08-23.png`,
`electric-theme-settings-after-2026-08-23.png`,
`electric-theme-tableview-after-2026-08-23.png`.

### Plan Deviation

The plan proposed overriding `--color-fg-accent` to fix the ember contrast hazard. **That fix was wrong.** `--color-fg-accent` (`tokens.css:43`) is a dead token with zero consumers. The live hazard is `--color-accent` itself, which is read as text at 20 sites and as a fill at 7.

Implemented instead: `--color-accent: #c0461a` for this theme. It is 4.9:1 as text on the page field and carries near-white at ~5.3:1 as a fill, so both roles pass without any component edit. Bright ember `#ff7a45` is retained for `--color-focus-ring` only, where it sits on either the indigo chrome or a light surface as a non-text outline.

### Risk Register Resolution

| Risk | Outcome |
|---|---|
| 1. Ember-as-text contrast | **Resolved**, via the deviation above. Diagnosis in the plan was wrong; the fix is sound. |
| 2. `color-mix()` tuned for dark backgrounds | **No problem found.** Zone tints and washes read correctly on white. The violet nav accent is visible on the active rail icon; the teal editor accent reads on the Documents eyebrow and primary button. |
| 3. Danger vs. link confusability | **Resolved.** `#a31d2e` trash icons are clearly distinct from `#c0461a` links in the Settings and Table screenshots. |
| 4. Warm flare on light surfaces | **No problem found.** `--accent-status` appears only on the indigo status bar. |

### Findings for Slice 2

Screenshots surfaced three real defects. All are component-level and were correctly excluded from this slice. Findings 1 and 2 are the strongest evidence yet that Slice 2 is needed.

1. **Ember is wallpaper in Table View.** `.kind-badge` at `src/renderer/src/modules/tableview/MainView.svelte:1427` is `color: var(--color-accent); background: var(--color-accent-dim)`. Every row's Kind cell renders ember-on-ember-wash — 43 orange chips in the capture. This is the exact anti-pattern in DESIGN.md §2.6 and §13. Per §3.4 a classification chip should read as metadata first: pale neutral fill, quiet border, muted text. One-line fix.

2. **Selection is indistinguishable from category.** `tr.selected td` at `src/renderer/src/modules/tableview/MainView.svelte:1363` is `color-mix(--color-accent 12%)` — the same ember wash the badges use. In the capture the selected "chapters" row is only marginally warmer than the 42 unselected rows around it. DESIGN.md §8.5 requires at least two selection signals; there is currently one, and it collides. Needs a wash plus an accent border, and the badges must stop using ember.

3. **Muted text pushed below the contrast floor.** `.empty-hint` at `src/renderer/src/modules/documents/InspectorView.svelte:1372` is `color-mix(in srgb, var(--color-fg-muted) 78%, transparent)`. `--color-fg-muted` is already at the 5.0:1 floor, so the 78% lightening lands near 3.4:1. DESIGN.md §4.2 forbids this. **Pre-existing across every light theme**, not introduced here; electric only makes it more obvious. Worth sweeping for other `color-mix(... --color-fg-muted ...%, transparent)` sites at the same time.

Findings 1 and 2 should be folded into Slice 2's file list.
