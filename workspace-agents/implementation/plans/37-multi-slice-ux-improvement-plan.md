# App Shell UX Improvements - Multi-Slice Implementation Plan

## Summary

Implement the seven requested improvements as small, independently reviewable slices, ordered from lowest-risk polish to deeper module behavior. Each slice should be planned, implemented, validated, screenshotted, committed, and left with a clean git status before the next slice begins.

Recommended sequence: **project menu dismiss + web padding → image preview modal → journal rich editor → metadata editability → table filtering/search → PDF reader**.

## Slice 1 - Project Menu Dismiss + Web Viewer Padding

### Objective
Make the project menu close when clicking anywhere outside it, and add modest padding around the Web module viewer.

### Scope and Out of Scope
Scope:
- Project menu closes on outside click, not only when clicking the project/book icon again.
- Preserve Escape-to-close behavior.
- Preserve clicks inside the menu.
- Add approximately `8px` padding around the Web module browser surface.

Out of scope:
- Redesigning the project menu.
- Changing workspace lifecycle actions.
- Changing Web module tabs, bookmarks, or persistence.

### Implementation Approach
- Update the project switcher popover to use a click-away listener or backdrop-style outside-click handling.
- Ensure outside click cleanup is registered/unregistered safely when the menu opens/closes.
- Add padding to the Web module browser container while keeping the `<webview>` full-height inside the padded region.
- Use existing shell tokens where possible, likely `var(--space-2)` for the 8px padding.
- Avoid schema, IPC, or module contract changes.

### Dependencies
- None.

### Suggested Commit Checkpoint
Commit message: `Fix project menu dismissal and web viewer padding`

### Testing Plan
- `npm run typecheck`
- `npm run build`
- Manual app smoke:
  - Open project menu.
  - Click another rail icon, main pane, sidebar, inspector, and status bar; menu closes.
  - Click inside menu; menu remains usable.
  - Press Escape; menu closes.
  - Open Web module; verify visible padding around web surface.

### Snapshot Evidence
- Screenshot with project menu open before outside click if useful.
- Screenshot of Web module after padding is applied.

### Acceptance Criteria
- Project menu closes on any outside click.
- Project menu actions still work.
- Web viewer is no longer edge-to-edge and has consistent visual padding.
- No workspace/project behavior regresses.

### Risks and Rollback Notes
- Risk: outside-click handler may close the menu before menu buttons fire.
- Mitigation: stop propagation or check containment before closing.
- Rollback: revert only the project switcher and Web module style edits.

## Slice 2 - Asset Image Enlargement Modal

### Objective
Let users enlarge image assets from the square/detail preview so they can inspect the actual image more comfortably.

### Scope and Out of Scope
Scope:
- Add an image preview modal or lightbox for selected image assets.
- Open modal from the existing asset preview image or a clear preview action.
- Support close by Escape, backdrop click, and close button.
- Preserve original square/detail preview layout.

Out of scope:
- Image editing.
- Cropping, annotations, zoom/pan tools, or slideshow navigation.
- PDF preview improvements.

### Implementation Approach
- Add a renderer-only modal for image assets in the Assets main view.
- Use the existing `thumbnailDataUrl` for preview initially; if a full source path data URL is already available through existing APIs, use the best available display source without adding a new backend API.
- Keep modal UI simple: centered image, contained max size, darkened/backdrop overlay, asset label, close button.
- Ensure modal does not alter asset records or persistence.

### Dependencies
- Slice 1 can be completed first but is not technically required.

### Suggested Commit Checkpoint
Commit message: `Add asset image preview modal`

### Testing Plan
- `npm run typecheck`
- `npm run build`
- Manual app smoke:
  - Select an image asset.
  - Open preview modal.
  - Close via Escape, backdrop, and close button.
  - Select a non-image asset; modal affordance should not appear or should be disabled.

### Snapshot Evidence
- Screenshot of an image asset detail view.
- Screenshot of enlarged image modal.

### Acceptance Criteria
- Image assets can be enlarged without leaving the Assets module.
- Non-image assets do not show misleading image preview behavior.
- Modal is keyboard dismissible and visually constrained to viewport.
- No asset database records are modified by previewing.

### Risks and Rollback Notes
- Risk: using only thumbnails may not satisfy “what it really looks like” for large images.
- Mitigation: first implementation should use the highest-resolution existing display source; if thumbnails are too small, plan a follow-up API for safe full-file image data.
- Rollback: remove the modal state and markup/styles from the Assets view.

## Slice 3 - Journal Rich Markdown Editing

### Objective
Give Journal entries the same polished Markdown editing experience as Documents instead of showing raw textarea Markdown.

### Scope and Out of Scope
Scope:
- Replace the Journal raw textarea editor with the existing rich Markdown editing pattern used by Documents.
- Preserve Journal entry content as Markdown in the current storage model.
- Preserve title rename, selected entry behavior, import/export behavior, and archived entry behavior.
- Keep Journal-specific layout and date header.

Out of scope:
- Changing Journal persistence schema.
- Adding AI review, document versions, or document tree behavior to Journal.
- Changing exported Journal Markdown format.

### Implementation Approach
- Reuse the existing TipTap/Markdown editor approach already used in Documents.
- Prefer extracting or reusing an existing editor wrapper only if it avoids real duplication; otherwise keep this slice narrowly focused.
- Bind editor content to `selectedJournalEntry.content`.
- Ensure editor resets cleanly when switching entries.
- Preserve Markdown round-trip so imported/exported entries remain compatible.

### Dependencies
- None, but do after Slice 2 to keep risk progression clean.

### Suggested Commit Checkpoint
Commit message: `Add rich editor for journal entries`

### Testing Plan
- `npm run typecheck`
- `npm run build`
- Manual app smoke:
  - Create/select Journal entry.
  - Enter headings, bold/italic, bullets, and plain paragraphs.
  - Switch entries and confirm content persists.
  - Import/export Journal Markdown still works.
  - Archived entry restore behavior still works.

### Snapshot Evidence
- Screenshot of Journal entry showing formatted Markdown.
- Screenshot after switching entries and returning to the formatted entry.

### Acceptance Criteria
- Journal no longer displays raw Markdown while editing common Markdown structures.
- Stored/exported content remains Markdown.
- Existing Journal lifecycle features still work.
- No shell/module contract changes are introduced.

### Risks and Rollback Notes
- Risk: editor initialization may stale when selected entry changes.
- Mitigation: key the editor by selected entry ID or explicitly update editor content on selection changes.
- Rollback: restore textarea Journal editor without touching persistence.

## Slice 4 - Safe Metadata Editability

### Objective
Make as much metadata editable as safely possible without corrupting provenance, imported source facts, or detected technical metadata.

### Scope and Out of Scope
Scope:
- Audit existing metadata surfaces across Documents, Journal, and Assets.
- Make safe user-owned metadata editable:
  - Document title and editable source/frontmatter-style fields where already persisted.
  - Asset label, comments, and tags.
  - Journal title and any safe user-authored metadata already supported by import/export.
- Keep system/provenance metadata read-only:
  - Source path, original filename, checksum, MIME type, file size, image dimensions, PDF page count/title/author when detected from source unless already modeled as user-overridable.
  - Created/updated timestamps.
- Clearly distinguish editable fields from read-only fields in inspectors.

Out of scope:
- Syncing edited metadata back to original source files.
- Adding destructive file mutation.
- Adding a new generalized metadata schema unless required by current persisted data.
- AI-generated metadata workflows.

### Implementation Approach
- Start with an audit pass in the implementation plan/checkpoint notes before code edits.
- Use existing persistence APIs where fields are already writable.
- Add small, targeted update calls only where required for currently persisted metadata.
- Prefer inline edit controls in inspectors over broad modal forms.
- Treat provenance as immutable display data.
- If source/frontmatter metadata is currently persisted as structured data, support editing simple string/boolean/number fields only; leave complex nested metadata read-only for this slice.

### Dependencies
- Slice 3 should land first so Journal metadata UX can align with the editor experience.

### Suggested Commit Checkpoint
Commit message: `Add safe metadata editing surfaces`

### Testing Plan
- `npm run typecheck`
- `npm run build`
- Manual app smoke:
  - Edit safe Document metadata and reload/switch away/back.
  - Edit Asset comments/tags/label and confirm persistence.
  - Confirm read-only provenance fields cannot be edited.
  - Duplicate workspace if relevant and confirm metadata copies correctly.
  - Export documents/assets/journals and confirm expected metadata behavior remains intact.

### Snapshot Evidence
- Screenshot of editable metadata controls.
- Screenshot showing read-only provenance fields clearly distinguished.
- Optional screenshot after edited metadata persists across selection/reload.

### Acceptance Criteria
- User-owned metadata can be edited and persists.
- Provenance and detected technical fields remain read-only.
- No source files are mutated.
- Existing import/export/lifecycle behavior remains valid.

### Risks and Rollback Notes
- Risk: over-editing detected metadata could break trust in import provenance.
- Mitigation: hard rule that source and detected fields stay read-only in this slice.
- Rollback: revert inspector edit controls and any new narrow update handlers.

## Slice 5 - Table View Filtering and Search

### Objective
Improve Table View so users can filter and search documents more effectively.

### Scope and Out of Scope
Scope:
- Add a search input for document title and content.
- Improve filters beyond the current kind-only filtering.
- Add clear/reset behavior.
- Persist table filter/search state only if the current table state persistence pattern already supports it cleanly.
- Preserve open-document behavior from table rows.

Out of scope:
- Full-text database indexing.
- Saved filter presets.
- Cross-module global search.
- Asset or Journal search unless already represented as table rows.

### Implementation Approach
- Extend the existing Table View state slice to include a search query and any additional simple filters.
- Apply filters in framework-agnostic table state logic, not directly in Svelte markup.
- Recommended v1 filters:
  - Kind: all/chapter/scene/folder.
  - Search: title + content substring match.
  - Sort: preserve existing sort options.
- Add a compact filter toolbar above the table.
- Show empty-state copy when no rows match the current filters.
- Keep row selection stable when filters change.

### Dependencies
- Slice 4 should land first so the table does not need to be redesigned around metadata fields twice.

### Suggested Commit Checkpoint
Commit message: `Add table view search and filters`

### Testing Plan
- `npm run typecheck`
- `npm run build`
- Manual app smoke:
  - Search by title.
  - Search by body text.
  - Filter by kind.
  - Combine search + kind filter.
  - Reset filters.
  - Open a filtered document from the table.
  - Confirm selection updates when the selected row is filtered out.

### Snapshot Evidence
- Screenshot of Table View with filter toolbar.
- Screenshot of a filtered/search result state.
- Screenshot of empty filtered state.

### Acceptance Criteria
- Users can search table rows by title/content.
- Users can filter by document kind.
- Search/filter/sort combinations behave predictably.
- Table row opening still routes to Documents correctly.

### Risks and Rollback Notes
- Risk: content search may be slow on very large document sets if done fully in renderer.
- Mitigation: acceptable for v1 local in-memory table; note DB-backed search as future hardening if needed.
- Rollback: remove search/filter additions and restore previous table state slice.

## Slice 6 - PDF Reader Experience

### Objective
Let users read whole PDF assets comfortably from inside the app.

### Scope and Out of Scope
Scope:
- Add a PDF reader experience for PDF assets.
- Start from Assets module, not a new dedicated room.
- Provide page navigation, current page/total page display, and fit-to-width or fit-to-page behavior.
- Preserve existing PDF metadata display.
- Handle missing/unreadable PDF files gracefully.

Out of scope:
- PDF annotation.
- Text selection/extraction.
- OCR.
- Dedicated PDF room.
- Persisted reading position unless it is trivial and uses existing module state cleanly.

### Implementation Approach
- Add a PDF reader view/modal launched from selected PDF asset.
- Prefer a proven renderer library if already present; otherwise add the smallest appropriate PDF rendering dependency after checking current package constraints.
- Render one page at a time for v1, with Previous/Next controls and page number input or stepper.
- Keep source file immutable.
- Use existing asset file path/open metadata. If renderer cannot safely read the path directly, add a narrow main/preload API to stream or convert the PDF page data.
- Include clear empty/error states for missing source path, missing file, encrypted/unsupported PDF, or render failure.

### Dependencies
- Slice 2 should land first because it establishes modal preview patterns for Assets.
- Slice 4 should land first so PDF metadata remains clearly read-only.

### Suggested Commit Checkpoint
Commit message: `Add PDF reader for asset records`

### Testing Plan
- `npm run typecheck`
- `npm run build`
- Manual app smoke:
  - Open a PDF asset.
  - Navigate first, next, previous, and last pages.
  - Resize window and confirm page remains readable.
  - Select a non-PDF asset and confirm PDF reader controls are absent.
  - Try a missing-file PDF record if feasible and confirm graceful error.

### Snapshot Evidence
- Screenshot of PDF reader opened on page 1.
- Screenshot of PDF reader on a later page.
- Screenshot of missing/unavailable PDF error state if feasible.

### Acceptance Criteria
- A user can read an entire PDF asset page by page.
- PDF rendering is contained within Assets and does not require a new room.
- Missing or unsupported PDFs fail gracefully.
- Existing asset import/export/archive/delete behavior remains intact.

### Risks and Rollback Notes
- Risk: PDF rendering can add dependency and packaging complexity.
- Mitigation: keep v1 reader isolated to Assets and avoid changing the module contract.
- Rollback: remove PDF reader component/API/dependency and retain existing metadata-only PDF handling.

## Recommended Slice Order

1. Project menu dismiss + Web padding.
2. Asset image enlargement modal.
3. Journal rich Markdown editing.
4. Safe metadata editability.
5. Table View filtering and search.
6. PDF reader experience.

## Final Validation Checklist

Run from `app-shell/` after each slice:
- `npm run typecheck`
- `npm run build`
- `git diff --check`

Run after the full sequence:
- `npm run typecheck`
- `npm run build`
- Any existing contrast/audit command used by the project if UI colors or focus states changed.
- Manual smoke across Projects, Documents, Journal, Assets, Table View, and Web.
- Confirm `git status --short --branch` is clean after final commit.

## Required Evidence

Capture screenshots under `implementation/screenshots/` during implementation:
- Project menu and Web padding.
- Image preview modal.
- Journal rich editor.
- Metadata inspector editable/read-only state.
- Table filters/search result and empty state.
- PDF reader page view and error state if feasible.

Each committed slice should include its own screenshot evidence when UI-visible.

## Documentation Updates

After the relevant slices land:
- Update the latest session handoff with completed slice, evidence, and next recommended action.
- Update `.agent/knowledge/WORKSPACE_ORIENTATION.md` only if the implemented behavior becomes durable project orientation.
- Update `CLAUDE.md` only for major durable capability milestones, not small UI polish.
- Add or update an implementation plan file if the coding agent treats metadata editing or PDF reading as an ambitious slice.

## Open Questions and Assumptions

Assumptions:
- The project menu icon referenced is the `WorkspaceSwitcher` book/project button in the activity rail.
- Web padding should be visual padding around the browser surface, not inside loaded web content.
- Image enlargement can begin with the best existing image preview source; full-resolution loading is a follow-up only if current thumbnails are insufficient.
- Journal should preserve Markdown storage/export and only improve the editing/rendering UX.
- Metadata provenance fields remain read-only unless a later explicit override model is designed.
- PDF reader should start inside Assets as a modal/view, not as a dedicated room.

Open questions for later refinement:
- Whether edited frontmatter-style metadata should export back into document/journal Markdown headers.
- Whether the table should eventually include Assets and Journal rows or remain document-only.
- Whether PDF reading position should persist per asset after the first reader slice.
