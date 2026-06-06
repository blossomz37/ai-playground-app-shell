# Add a Gray Theme to App Shell

## Summary

Add a fourth explicit theme option, **Gray**, using Carlo’s 12-step gray palette from `/Users/carlo/.myagents/tools/styles/gray-theme.md` as the neutral foundation. This is a narrow theming slice: keep the existing Light, Dark, and System themes; do not install Radix or replace the current App Shell token system.

The implementation should map the 12 gray steps onto the existing App Shell theme tokens in `tokens.css`, extend theme mode plumbing to recognize `gray`, make Gray selectable in Appearance settings, extend contrast auditing to include it, and capture screenshot evidence.

## Key Changes

- Add `gray` to the shared `ThemeMode` type, then update renderer, preload/browser-shell, IPC, and startup handling so `gray` is a valid persisted theme preference.
- In Electron main-process theme sync, map `gray` to native `light` behavior for `nativeTheme.themeSource` and startup background color, because Electron only accepts `light`, `dark`, or `system`.
- Add `[data-theme="gray"]` to `app-shell/src/renderer/src/styles/tokens.css`.
- Use the 12-step gray palette as source tokens:
  - `--gray-1 #FCFCFC`
  - `--gray-2 #F9F9F9`
  - `--gray-3 #F0F0F0`
  - `--gray-4 #E8E8E8`
  - `--gray-5 #E0E0E0`
  - `--gray-6 #D9D9D9`
  - `--gray-7 #CECECE`
  - `--gray-8 #BBBBBB`
  - `--gray-9 #8D8D8D`
  - `--gray-10 #838383`
  - `--gray-11 #646464`
  - `--gray-12 #202020`
- Map App Shell tokens from that scale:
  - backgrounds/shell zones from `gray-1` through `gray-4`
  - borders from `gray-6` through `gray-8`
  - text from `gray-10` through `gray-12`
  - focus/action/accent from `gray-8`, `gray-11`, and `gray-12`
  - editor table tokens from the same gray scale
- Keep `--color-danger`, `--color-success`, and `--color-warn` colored for scanability; do not make alerts/status feedback monochrome in this slice.
- Add Gray to `AppearanceSettings.svelte` as a normal theme radio option.
- Extend `SHELL_CAPTURE_THEME` support to accept `gray`, so validation can save gray-theme screenshots.
- Extend `npm run audit:contrast` so it audits `dark`, `light`, and `gray`.

## Implementation Notes

- Do not add Radix as a dependency. Use Radix’s 12-step model only as a mapping pattern.
- Keep `system` behavior unchanged: removing `data-theme` still lets OS preference choose dark/light through the existing media query.
- The default `:root` dark palette should stay unchanged; `[data-theme="dark"]` should still mirror it.
- The new Gray theme is an explicit light-neutral theme, not an OS-driven pair.
- If the main process currently casts persisted theme directly into `nativeTheme.themeSource`, replace that with a small helper like `toNativeThemeSource(mode)` so `gray` safely maps to `light`.

## Test Plan

Run from `/Users/carlo/Github/app-shell-project/app-shell`:

```bash
npm run typecheck
npm run build
npm run audit:contrast
```

For Svelte validation:

- Run the Svelte autofixer on changed `.svelte` files, at minimum `AppearanceSettings.svelte`.
- Fix any autofixer findings and rerun until clean.

Manual/UI validation:

- Open Settings → Appearance.
- Confirm Light, Dark, Gray, and System are all visible.
- Select Gray and confirm the app changes immediately.
- Close and relaunch the app; confirm Gray persists.
- Switch back to Light, Dark, and System; confirm existing behavior still works.

Screenshot evidence:

```bash
SHELL_CAPTURE_THEME=gray SHELL_CAPTURE=../implementation/screenshots/gray-theme-after-2026-06-05.png npm run start
SHELL_CAPTURE_THEME=gray SHELL_CAPTURE_SETTINGS=1 SHELL_CAPTURE=../implementation/screenshots/gray-theme-settings-after-2026-06-05.png npm run start
```

Record both screenshots in the implementation summary or handoff.

## Assumptions

- Gray is added as a fourth explicit theme option named `Gray`.
- The gray theme uses the 12-step light gray palette from `/Users/carlo/.myagents/tools/styles/gray-theme.md`.
- Semantic status colors remain colored for usability.
- No package/dependency changes are needed.
- This slice should be committed as one logical unit after validation passes.

## Implementation Outcome - 2026-06-05

Implemented. Gray is now a fourth explicit persisted theme mode alongside Light, Dark, and System.

What landed:

- Added `gray` to `ThemeMode`.
- Added `app-shell/src/main/core/theme.ts` for main-process theme validation and Electron native-theme mapping.
- Mapped Gray to Electron native `light` mode for `nativeTheme.themeSource` and startup background decisions.
- Added `[data-theme="gray"]` to `tokens.css` using the 12-step gray palette.
- Added Gray to the Appearance Settings theme selector.
- Extended `SHELL_CAPTURE_THEME=gray` support and capture-time preference seeding.
- Extended `npm run audit:contrast` to audit Dark, Light, and Gray.

Validation:

- Svelte autofixer clean for `AppearanceSettings.svelte`.
- `npm run typecheck`
- `npm run build`
- `npm run audit:contrast`
- `SHELL_CAPTURE_THEME=gray SHELL_CAPTURE=../implementation/screenshots/gray-theme-after-2026-06-05.png npm run start`
- `SHELL_CAPTURE_THEME=gray SHELL_CAPTURE_SETTINGS=1 SHELL_CAPTURE=../implementation/screenshots/gray-theme-settings-after-2026-06-05.png npm run start`

Screenshot evidence:

- `implementation/screenshots/gray-theme-after-2026-06-05.png`
- `implementation/screenshots/gray-theme-settings-after-2026-06-05.png`
