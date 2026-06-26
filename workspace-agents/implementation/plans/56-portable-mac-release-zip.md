# Plan 56 - Portable Mac Release Zip

## Goal & Scope

Update the Mac release packaging flow so generated distribution zips do not contain AppleDouble `._*` metadata entries that can become real files during ordinary unzip/install workflows and break the signed app bundle.

This is a release-script hardening slice only. It should not repackage the current notarized app unless Carlo explicitly asks to produce a new build.

## Anchor

- Current release script: `app-shell/scripts/package-mac.mjs`.
- Current package command: `npm run package:mac`.
- Existing flow already packages, signs, optionally notarizes, validates stapling, then creates a zip.
- The failure came from the final `ditto -c -k --keepParent ...` zip step producing `._*` entries.

## Approach

1. Replace the final distribution zip command in `package-mac.mjs`.
   - Stop using `ditto` for the distributable zip.
   - Use `/usr/bin/zip -r -y -X` from the parent directory of the `.app`.
   - Preserve symlinks with `-y`.
   - Strip extra zip metadata with `-X`.
   - Keep the existing output name unless there is a strong reason to change it.
2. Add a validation helper inside the script after zip creation.
   - Create a temporary directory.
   - Extract the generated zip using ordinary `/usr/bin/unzip`, not `ditto`.
   - Fail if extraction produces any `._*`, `.DS_Store`, or `__MACOSX` entries.
   - Run `codesign --verify --deep --strict --verbose=4` on the extracted app.
   - Run `xcrun stapler validate` on the extracted app when notarization ran.
   - Run `spctl -a -vvv -t exec` on the extracted app.
   - Remove the temporary directory in a `finally` block.
3. Keep the existing signing/notarization path unchanged.
   - Do not change bundle id, signing identity, entitlements, notarization credentials, or packager settings.
   - Do not run `npm run package:mac` as part of implementation unless Carlo explicitly approves a new packaged build.
4. Add clear console output.
   - Print the zip path.
   - Print that portable zip validation passed.
   - If validation fails, the script should exit non-zero with the underlying command error visible.

## Files / Areas Touched

- `app-shell/scripts/package-mac.mjs`
- Optional documentation note if useful:
  - `workspace-agents/session-handoffs/HANDOFF_66.md` after implementation
  - existing release docs if a release runbook already exists

## Validation

Safe validation without creating a new signed build:

```bash
node --check scripts/package-mac.mjs
```

Implementation-level validation with an existing stapled app, if the helper is factored so it can be called independently:

```bash
/usr/bin/zip -r -y -X <zip-path> "App Shell.app"
/usr/bin/unzip -q <zip-path> -d <tmpdir>
find <tmpdir>/App\ Shell.app -name '._*' -o -name '.DS_Store' -o -name '__MACOSX'
codesign --verify --deep --strict --verbose=4 <tmpdir>/App\ Shell.app
xcrun stapler validate <tmpdir>/App\ Shell.app
spctl -a -vvv -t exec <tmpdir>/App\ Shell.app
```

Full validation when Carlo approves a new release build:

```bash
cd app-shell
npm run package:mac
```

Acceptance criteria:

- Generated zip contains no `._*`, `.DS_Store`, or `__MACOSX` entries.
- Zip extracted by `/usr/bin/unzip` passes `codesign`.
- Extracted app passes `xcrun stapler validate` when notarized.
- Extracted app passes `spctl` as `source=Notarized Developer ID`.
- The script still works when notarization credentials are absent, but skips stapler validation in that mode.

## Risks & Unknowns

- `spctl` may require network/cache state on some machines, but it is the closest local proof for Gatekeeper behavior.
- Existing release artifacts under `app-shell/release/` should not be committed.
- Running `npm run package:mac` overwrites release output; do it only when Carlo wants a new packaged build.

## Out of Scope

- Changing signing identity or entitlements.
- Changing notarization credentials or notary submission method.
- Creating a DMG installer.
- Auto-updater work.
- Rebuilding the current release bundle without explicit approval.
