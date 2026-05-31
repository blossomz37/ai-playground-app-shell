# Assets PDF and Audio Hardening Research

_Date: 2026-05-31_

## Goal

Extend the Assets import metadata layer beyond raster images so PDFs and audio files show useful previews and metadata without moving parsing logic into Svelte views.

## Current Anchor

- Existing image hardening decodes imported image metadata in Electron main IPC and stores normalized metadata in `AssetsStateSlice`.
- Keep that pattern: native import boundary enriches `AssetImportCandidate`; shared state persists normalized fields; Svelte only renders.

## Researched Findings

### Electron thumbnail support

Electron exposes `nativeImage.createThumbnailFromPath(path, size)` on macOS and Windows. It returns a `NativeImage` thumbnail preview for a local file path.

Source: https://www.electronjs.org/docs/latest/api/native-image

This is a strong fit for the shell because the project is macOS-first and the Assets module already imports local file paths. Use it as the first thumbnail path for PDFs and potentially other non-image files.

### PDF metadata

Use `pdf-lib` for low-risk PDF metadata, especially page count:

- Current npm version checked live: `1.17.1`
- API exposes `PDFDocument.load(...)` and `getPageCount()`
- Also exposes title/author/subject/creation/modification metadata getters

Source: https://pdf-lib.js.org/docs/api/classes/pdfdocument

This does not render pages. Pair it with Electron OS thumbnailing for the initial PDF preview.

### PDF rendering fallback

PDF.js can render the first page to a Node canvas and can report document metadata/page count. Mozilla's Node examples use `pdfjs-dist/legacy/build/pdf.mjs`, `getDocument`, `doc.numPages`, `getPage(1)`, `page.getViewport(...)`, and page rendering to canvas.

Sources:

- https://github.com/mozilla/pdf.js/wiki/frequently-asked-questions
- https://github.com/mozilla/pdf.js/tree/master/examples/node
- https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/node/getinfo.mjs
- https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/node/pdf2png/pdf2png.mjs

Compatibility note:

- Current `pdfjs-dist` checked live: `6.0.227`, engine `node >=22.13.0 || >=24`
- App currently uses `electron@32`, whose release line embeds Node `20.16.0`
- Older `pdfjs-dist@5.4.624` still advertises `node >=20.16.0 || >=22.3.0`; later 5.x and 6.x require newer Node.

Recommendation: do not start with PDF.js unless OS thumbnails are insufficient. If needed before upgrading Electron, pin a compatible 5.4.x version and prove it in a spike.

### MP3/audio metadata

Use `music-metadata` for audio imports:

- Current npm version checked live: `11.12.3`
- Engine: Node `>=18`, compatible with Electron 32's embedded Node
- `parseFile(filePath)` is designed for local filesystem metadata extraction
- It returns format details such as codec, duration, bit rate, and tags such as album/artist/title/track
- `selectCover(common.picture)` selects embedded cover art when present

Sources:

- https://www.npmjs.com/package/music-metadata
- https://github.com/Borewit/music-metadata

Because `music-metadata` is ESM, import it dynamically from the main-process metadata helper if needed.

## Recommended Implementation Shape

1. Add an asset metadata helper under `app-shell/src/main/assets/metadata.ts`.
2. Move current raster image decoding from `ipc.ts` into that helper.
3. For PDFs:
   - Use `pdf-lib` to read page count and document metadata.
   - Use `nativeImage.createThumbnailFromPath(filePath, { width: 512, height: 512 })` for first preview thumbnail.
   - Store `pageCount`, `title`, `author`, and `thumbnailDataUrl` when available.
4. For MP3/audio:
   - Use `music-metadata.parseFile(filePath, { duration: true })`.
   - Store `durationSeconds`, `bitrate`, `sampleRate`, `codec`, `title`, `artist`, `album`, and `year`.
   - Use embedded cover art as thumbnail when present; otherwise show an audio placeholder.
5. Extend `AssetItem` with a generic `metadata` object rather than adding many top-level fields for every type.
6. Keep UI compact:
   - Library row: thumbnail/icon, name, primary metadata line.
   - Main preview: PDF thumbnail or audio cover art.
   - Inspector: structured type-specific rows.

## Risks

- Parsing untrusted files can be slow or fail. Metadata extraction should be best-effort and non-fatal.
- Large PDFs/audio files should not block the renderer. Keep parsing in main and consider moving expensive fallback rendering into a job if it becomes slow.
- Data URLs stored in settings are acceptable for bounded thumbnails, but keep the thumbnail edge size capped.
- PDF.js current major is not compatible with Electron 32's Node line, so avoid unpinned latest PDF.js in this app.

## Proposed Next Slice

`Assets hardening: PDF page counts/thumbnails and MP3 metadata/cover art`

Validation:

- Import one PDF and one MP3.
- Confirm persisted metadata in `shell_settings`.
- Capture Assets screenshot showing PDF page count/thumbnail and MP3 duration/cover art or placeholder.
- Run `npm run typecheck` and `npm run build`.
