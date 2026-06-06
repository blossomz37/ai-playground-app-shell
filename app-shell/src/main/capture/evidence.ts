import { app, BrowserWindow } from 'electron'
import { basename, dirname, join } from 'path'
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs'
import { isThemeMode } from '../core/theme'
import { getDb } from '../core/db'

/**
 * Dev-only UI-evidence capture. Gated by the SHELL_CAPTURE env var.
 *
 *   SHELL_CAPTURE=<png-path> [SHELL_CAPTURE_DELAY=<ms>] npm run start
 *
 * The app captures its own window via webContents.capturePage() — no macOS
 * screen-recording permission needed — writes the PNG, then quits for a clean
 * one-shot. Used to produce `implementation/screenshots/*.png` from a sandbox
 * where `screencapture` (TCC-blocked) and the computer-use MCP (saves off-repo)
 * can't deposit a file. See implementation/AGENTS.md › "Capturing UI evidence".
 */
export function maybeCaptureForEvidence(win: BrowserWindow): void {
  const out = process.env['SHELL_CAPTURE']
  if (!out) return
  const delay = Number(process.env['SHELL_CAPTURE_DELAY'] ?? 3500)
  const moduleId = process.env['SHELL_CAPTURE_MODULE']
  const documentId = process.env['SHELL_CAPTURE_DOCUMENT']
  const aiPrompt = process.env['SHELL_CAPTURE_AI_PROMPT']
  const aiProviderId = process.env['SHELL_CAPTURE_AI_PROVIDER']
  const aiModel = process.env['SHELL_CAPTURE_AI_MODEL']
  const jobType = process.env['SHELL_CAPTURE_JOB_TYPE']
  const markdownMessage = process.env['SHELL_CAPTURE_MARKDOWN_MESSAGE']
  const documentMarkdown = process.env['SHELL_CAPTURE_DOCUMENT_MARKDOWN']
  const webUrl = process.env['SHELL_CAPTURE_WEB_URL']
  const openSettings = process.env['SHELL_CAPTURE_SETTINGS'] === '1'
  const captureTheme = process.env['SHELL_CAPTURE_THEME']
  const openRailMore = process.env['SHELL_CAPTURE_OPEN_RAIL_MORE'] === '1'
  const openWorkspaceMenu = process.env['SHELL_CAPTURE_OPEN_WORKSPACE_MENU'] === '1'
  const openAssetImagePreview = process.env['SHELL_CAPTURE_OPEN_ASSET_IMAGE_PREVIEW'] === '1'
  const openPdfReader = process.env['SHELL_CAPTURE_OPEN_PDF_READER'] === '1'
  const pdfReaderPage = Number(process.env['SHELL_CAPTURE_PDF_READER_PAGE'] ?? 1)
  const openAiContext = process.env['SHELL_CAPTURE_OPEN_AI_CONTEXT'] === '1'
  const newAiConversation = process.env['SHELL_CAPTURE_NEW_AI_CONVERSATION'] === '1'
  const showInspector = process.env['SHELL_CAPTURE_SHOW_INSPECTOR'] === '1'
  const tableSearch = process.env['SHELL_CAPTURE_TABLE_SEARCH']
  const tableKind = process.env['SHELL_CAPTURE_TABLE_KIND']
  const workspaceImportRoot = process.env['SHELL_CAPTURE_WORKSPACE_IMPORT_ROOT']
  const documentLifecycleSmoke = process.env['SHELL_CAPTURE_DOCUMENT_LIFECYCLE_SMOKE'] === '1'
  const documentExportDir = process.env['SHELL_CAPTURE_DOCUMENT_EXPORT_DIR']
    ?? join(app.getPath('temp'), `app-shell-document-export-${Date.now()}`)
  const journalLifecycleSmoke = process.env['SHELL_CAPTURE_JOURNAL_LIFECYCLE_SMOKE'] === '1'
  const journalSmokeDir = process.env['SHELL_CAPTURE_JOURNAL_DIR']
    ?? join(app.getPath('temp'), `app-shell-journal-lifecycle-${Date.now()}`)
  const journalImportDir = join(journalSmokeDir, 'import')
  const journalExportDir = join(journalSmokeDir, 'export')
  const assetsDbSmoke = process.env['SHELL_CAPTURE_ASSETS_DB_SMOKE'] === '1'
  const selectAssetMediaType = process.env['SHELL_CAPTURE_SELECT_ASSET_MEDIA_TYPE']
  const assetsImportDir = process.env['SHELL_CAPTURE_ASSETS_IMPORT_DIR']
    ?? join(process.cwd(), '..', 'sample-assets-import')
  const assetsExportDir = process.env['SHELL_CAPTURE_ASSETS_EXPORT_DIR']
    ?? join(process.cwd(), '..', 'sample-assets-export')
  const interactionDelay = Number(process.env['SHELL_CAPTURE_INTERACTION_DELAY'] ?? 900)
  const webviewTimeout = Number(process.env['SHELL_CAPTURE_WEBVIEW_TIMEOUT'] ?? 12000)
  let workspaceSmokeCleanup: { initialWorkspaceId: string; workspaceIds: string[] } | null = null
  let workspaceSmokeDocumentId: string | null = null
  let documentSmokeCleanupIds: string[] = []
  let journalSmokeCleanup: { workspaceId: string; previousSnapshot: unknown } | null = null
  let assetsSmokeCleanupIds: string[] = []
  let assetsSmokeExportPaths: string[] = []
  let tableFilterCleanup = false

  async function waitForWebviewRender(): Promise<void> {
    if (moduleId !== 'shell.web') return

    await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const startedAt = Date.now()
        const timeout = ${JSON.stringify(webviewTimeout)}

        function inspect() {
          const webview = document.querySelector('webview.web-surface')
          if (!webview) {
            if (Date.now() - startedAt > timeout) return resolve('missing')
            return setTimeout(inspect, 150)
          }

          const isLoading = typeof webview.isLoading === 'function' ? webview.isLoading() : false
          const title = typeof webview.getTitle === 'function' ? webview.getTitle() : ''
          const url = typeof webview.getURL === 'function' ? webview.getURL() : ''
          const appStillLoading = Boolean(document.querySelector('.web-surface') && document.querySelector('.spinning'))

          const inspectGuest = typeof webview.executeJavaScript === 'function'
            ? webview.executeJavaScript(\`
                (() => ({
                  readyState: document.readyState,
                  textLength: document.body?.innerText?.trim().length ?? 0,
                  viewportHeight: window.innerHeight,
                  scrollHeight: Math.max(
                    document.body?.scrollHeight ?? 0,
                    document.documentElement?.scrollHeight ?? 0
                  )
                }))()
              \`).catch(() => null)
            : Promise.resolve(null)

          inspectGuest.then((guest) => {
            const guestReady = guest &&
              (guest.readyState === 'interactive' || guest.readyState === 'complete') &&
              guest.textLength > 80 &&
              guest.scrollHeight >= Math.max(300, guest.viewportHeight * 0.75)
            if (!isLoading && !appStillLoading && (title || url) && guestReady) {
              return setTimeout(() => resolve('ready'), 600)
            }
            if (Date.now() - startedAt > timeout) return resolve('timeout')
            setTimeout(inspect, 200)
          })
        }

        inspect()
      })
    `)
  }

  // Delay so async IPC-loaded data (document tree, active doc) has rendered.
  setTimeout(async () => {
    try {
      if (documentId) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('shell:capture-select-document', { detail: ${JSON.stringify(documentId)} }))`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (aiPrompt) {
        await win.webContents.executeJavaScript(`
          (async () => {
            const workspace = await window.shell.workspace.get()
            const contextCandidates = await window.shell.ai.collectContext({
              workspaceId: workspace.id,
              activeDocumentId: ${JSON.stringify(documentId ?? null)},
              includeDescendants: true
            })
            await window.shell.ai.invoke({
              workspaceId: workspace.id,
              moduleId: ${JSON.stringify(moduleId ?? 'shell.aichat')},
              originType: 'chat',
              originId: 'capture-smoke',
              prompt: ${JSON.stringify(aiPrompt)},
              providerId: ${JSON.stringify(aiProviderId ?? undefined)},
              model: ${JSON.stringify(aiModel ?? undefined)},
              contextCandidates
            })
          })()
        `)
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (moduleId) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: ${JSON.stringify(moduleId)} }))`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (documentId) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('shell:capture-select-document', { detail: ${JSON.stringify(documentId)} }))`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (webUrl) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('web:capture-navigate', { detail: ${JSON.stringify(webUrl)} }))`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (jobType) {
        await win.webContents.executeJavaScript(`
          (async () => {
            await window.shell.jobs.submit(${JSON.stringify(jobType)}, {
              originId: 'capture-job',
              prompt: 'Run a short capture workflow and report the current workspace context.'
            })
            window.dispatchEvent(new CustomEvent('shell:capture-open-jobs'))
          })()
        `)
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (markdownMessage) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('shell:capture-ai-message', { detail: ${JSON.stringify(markdownMessage)} }))`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (documentMarkdown) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('shell:capture-document-markdown', { detail: ${JSON.stringify(documentMarkdown)} }))`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (workspaceImportRoot) {
        const result = await win.webContents.executeJavaScript(`
          (async () => {
            const sourceRoot = ${JSON.stringify(workspaceImportRoot)}
            const initialWorkspace = await window.shell.workspace.get()
            const imported = await window.shell.workspace.importFolder({
              root: sourceRoot,
              name: 'Lifecycle Smoke Import',
              type: 'authoring'
            })
            const importedDocs = await window.shell.documents.list(imported.id)
            const duplicate = await window.shell.workspace.duplicate(imported.id)
            const duplicateDocs = await window.shell.documents.list(duplicate.id)
            const metadataDoc = importedDocs.find((doc) => doc.title === 'alpha' && doc.metadataJson)
              ?? importedDocs.find((doc) => doc.metadataJson)
            const duplicateMetadataDoc = duplicateDocs.find((doc) => doc.title === metadataDoc?.title && doc.metadataJson)
              ?? duplicateDocs.find((doc) => doc.metadataJson)
            const metadata = metadataDoc?.metadataJson ? JSON.parse(metadataDoc.metadataJson) : null
            const duplicateMetadata = duplicateMetadataDoc?.metadataJson ? JSON.parse(duplicateMetadataDoc.metadataJson) : null
            await window.shell.workspace.archive(imported.id)
            const archivedRows = await window.shell.workspace.list({ includeArchived: true })
            await window.shell.workspace.restore(imported.id)
            await window.shell.workspace.switch(imported.id)

            return {
              initialWorkspaceId: initialWorkspace.id,
              importedWorkspaceId: imported.id,
              duplicateWorkspaceId: duplicate.id,
              metadataDocumentId: metadataDoc?.id ?? null,
              importedDocCount: importedDocs.length,
              duplicateDocCount: duplicateDocs.length,
              folderTitles: importedDocs.filter((doc) => doc.kind === 'folder').map((doc) => doc.title).sort(),
              fileTitles: importedDocs.filter((doc) => doc.kind === 'chapter').map((doc) => doc.title).sort(),
              contentMatched: importedDocs.some((doc) => doc.title === 'alpha' && doc.content.includes('Imported markdown.'))
                && importedDocs.some((doc) => doc.title === 'scene-note' && doc.content.includes('Scene note text.')),
              unsupportedSkipped: !importedDocs.some((doc) => doc.title === 'unsupported'),
              metadataPersisted: Boolean(metadata),
              duplicateMetadataPersisted: Boolean(duplicateMetadata),
              frontmatterStripped: metadataDoc ? !metadataDoc.content.trimStart().startsWith('---') : false,
              relatedCount: Array.isArray(metadata?.related) ? metadata.related.length : 0,
              importedWordCount: metadata?.word_count ?? null,
              sourceStatus: metadata?.status ?? null,
              sourceDescription: metadata?.description ?? null,
              noFrontmatterUnchanged: importedDocs.some((doc) => doc.title === 'plain-note' && doc.content.includes('No frontmatter here.')),
              sourcePathCount: importedDocs.filter((doc) => doc.sourcePath).length,
              checksumCount: importedDocs.filter((doc) => doc.sourceChecksum).length,
              archivedAfterArchive: archivedRows.some((workspace) => workspace.id === imported.id && workspace.archivedAt),
              cleanupScheduled: true
            }
          })()
        `)
        workspaceSmokeCleanup = {
          initialWorkspaceId: String(result.initialWorkspaceId),
          workspaceIds: [String(result.importedWorkspaceId), String(result.duplicateWorkspaceId)]
        }
        workspaceSmokeDocumentId = result.metadataDocumentId ? String(result.metadataDocumentId) : null
        console.log('[SHELL_CAPTURE_WORKSPACE_SMOKE]', JSON.stringify(result))
        if (workspaceSmokeDocumentId) {
          await new Promise<void>((resolve) => {
            win.webContents.once('did-finish-load', () => resolve())
            win.webContents.reload()
          })
        }
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (workspaceSmokeDocumentId) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('shell:capture-select-document', { detail: ${JSON.stringify(workspaceSmokeDocumentId)} }))`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (documentLifecycleSmoke) {
        const result = await win.webContents.executeJavaScript(`
          (async () => {
            const workspace = await window.shell.workspace.get()
            window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.documents' }))
            const root = await window.shell.documents.create({
              workspaceId: workspace.id,
              kind: 'folder',
              title: 'Lifecycle Export Smoke',
              parentId: null,
              sortOrder: 0
            })
            const overview = await window.shell.documents.create({
              workspaceId: workspace.id,
              kind: 'chapter',
              title: 'Overview',
              parentId: root.id,
              sortOrder: 0
            })
            await window.shell.documents.save(overview.id, '# Overview\\n\\nExport smoke overview.')
            const scenes = await window.shell.documents.create({
              workspaceId: workspace.id,
              kind: 'folder',
              title: 'Scenes',
              parentId: root.id,
              sortOrder: 1
            })
            const firstScene = await window.shell.documents.create({
              workspaceId: workspace.id,
              kind: 'scene',
              title: 'Scene Notes',
              parentId: scenes.id,
              sortOrder: 0
            })
            await window.shell.documents.save(firstScene.id, '# Scene Notes\\n\\nFirst exported scene.')
            const secondScene = await window.shell.documents.create({
              workspaceId: workspace.id,
              kind: 'scene',
              title: 'Scene Notes',
              parentId: scenes.id,
              sortOrder: 1
            })
            await window.shell.documents.save(secondScene.id, '# Scene Notes\\n\\nSecond exported scene.')

            const exportResult = await window.shell.documents.exportSubtree(root.id, {
              targetDir: ${JSON.stringify(documentExportDir)}
            })
            await window.shell.documents.archive(root.id, { recursive: true })
            const archivedAfterArchive = await window.shell.documents.listArchived(workspace.id)
            const activeAfterArchive = await window.shell.documents.list(workspace.id)
            const restored = await window.shell.documents.restore(root.id, { recursive: true })
            const activeAfterRestore = await window.shell.documents.list(workspace.id)
            const archivedAfterRestore = await window.shell.documents.listArchived(workspace.id)
            await window.shell.documents.archive(root.id, { recursive: true })
            window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.documents' }))

            return {
              workspaceId: workspace.id,
              rootDocumentId: root.id,
              generatedDocumentIds: [root.id, overview.id, scenes.id, firstScene.id, secondScene.id],
              expectedContents: {
                overview: '# Overview\\n\\nExport smoke overview.',
                firstScene: '# Scene Notes\\n\\nFirst exported scene.',
                secondScene: '# Scene Notes\\n\\nSecond exported scene.'
              },
              exportResult,
              archivedAfterArchiveCount: archivedAfterArchive.filter((doc) => doc.id === root.id || doc.parentId === root.id || doc.parentId === scenes.id).length,
              hiddenAfterArchive: !activeAfterArchive.some((doc) => doc.id === root.id),
              restoredCount: restored.length,
              visibleAfterRestore: activeAfterRestore.some((doc) => doc.id === root.id),
              archivedAfterRestoreCount: archivedAfterRestore.filter((doc) => doc.id === root.id || doc.parentId === root.id || doc.parentId === scenes.id).length
            }
          })()
        `)
        documentSmokeCleanupIds = Array.isArray(result.generatedDocumentIds)
          ? result.generatedDocumentIds.map(String)
          : []

        const filesWritten = Array.isArray(result.exportResult?.filesWritten)
          ? result.exportResult.filesWritten.map(String)
          : []
        const foldersWritten = Array.isArray(result.exportResult?.foldersWritten)
          ? result.exportResult.foldersWritten.map(String)
          : []
        const fileContents = filesWritten.map((filePath) => existsSync(filePath) ? readFileSync(filePath, 'utf8') : '')
        const fileBasenames = filesWritten.map(filePath => basename(filePath)).sort()
        const smokeResult = {
          ...result,
          exportedFilesExist: filesWritten.length === 3 && filesWritten.every((filePath) => existsSync(filePath)),
          exportedFoldersExist: foldersWritten.length === 2 && foldersWritten.every((folderPath) => existsSync(folderPath)),
          collisionHandled: fileBasenames.includes('Scene Notes.md') && fileBasenames.includes('Scene Notes-2.md'),
          contentMatched: fileContents.includes(result.expectedContents?.overview)
            && fileContents.includes(result.expectedContents?.firstScene)
            && fileContents.includes(result.expectedContents?.secondScene),
          cleanupScheduled: documentSmokeCleanupIds.length > 0
        }
        console.log('[SHELL_CAPTURE_DOCUMENT_LIFECYCLE_SMOKE]', JSON.stringify(smokeResult))
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (journalLifecycleSmoke) {
        mkdirSync(journalImportDir, { recursive: true })
        mkdirSync(journalExportDir, { recursive: true })
        const firstImportPath = join(journalImportDir, 'capture-entry.md')
        const secondImportPath = join(journalImportDir, 'capture-entry-copy.md')
        const plainImportPath = join(journalImportDir, 'plain-note.md')
        writeFileSync(firstImportPath, [
          '---',
          'title: "Capture Journal"',
          'date: "2026-06-05"',
          'fullDate: "Friday, June 5, 2026"',
          'created: "2026-06-05 09:00"',
          'modified: "2026-06-05 09:15"',
          'mood: "Focused"',
          'tags:',
          '  - capture',
          '  - journal',
          '---',
          '',
          '# Capture Journal',
          '',
          'Imported journal body.'
        ].join('\n'), 'utf8')
        writeFileSync(secondImportPath, [
          '---',
          'title: "Capture Journal"',
          'date: "2026-06-05"',
          'fullDate: "Friday, June 5, 2026"',
          'created: "2026-06-05 10:00"',
          'modified: "2026-06-05 10:20"',
          'mood: "Curious"',
          'tags:',
          '  - capture',
          '  - archive',
          '---',
          '',
          '# Capture Journal',
          '',
          'Archived journal body.'
        ].join('\n'), 'utf8')
        writeFileSync(plainImportPath, [
          '# Plain Note',
          '',
          'Plain import body.'
        ].join('\n'), 'utf8')

        const result = await win.webContents.executeJavaScript(`
          (async () => {
            const workspace = await window.shell.workspace.get()
            window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.journal' }))
            await new Promise((resolve) => setTimeout(resolve, 250))
            if (typeof window.__journalCaptureLifecycleSmoke !== 'function') {
              throw new Error('Journal capture lifecycle hook is not installed.')
            }
            const result = await window.__journalCaptureLifecycleSmoke({
              importFilePaths: ${JSON.stringify([firstImportPath, secondImportPath, plainImportPath])},
              exportDir: ${JSON.stringify(journalExportDir)}
            })
            return { workspaceId: workspace.id, ...result }
          })()
        `)
        journalSmokeCleanup = {
          workspaceId: String(result.workspaceId),
          previousSnapshot: result.previousSnapshot
        }

        const filesWritten = Array.isArray(result.exportResult?.filesWritten)
          ? result.exportResult.filesWritten.map(String)
          : []
        const exportedContents = filesWritten.map((filePath) => existsSync(filePath) ? readFileSync(filePath, 'utf8') : '')
        const exportedBasenames = filesWritten.map(filePath => basename(filePath)).sort()
        const smokeResult = {
          ...result,
          previousSnapshot: Boolean(result.previousSnapshot),
          exportedFilesExist: filesWritten.length === 2 && filesWritten.every((filePath) => existsSync(filePath)),
          collisionHandled: exportedBasenames.includes('Capture Journal.md') && exportedBasenames.includes('Capture Journal-2.md'),
          exportedFrontmatterMatched: exportedContents.every(content => content.trimStart().startsWith('---'))
            && exportedContents.some(content => content.includes('mood: "Focused"'))
            && exportedContents.some(content => content.includes('  - "journal"')),
          exportedBodyMatched: exportedContents.some(content => content.includes('Imported journal body.'))
            && exportedContents.some(content => content.includes('Archived journal body.')),
          importedBodyStripped: !String(result.firstImported?.content ?? '').trimStart().startsWith('---'),
          importedTagsMatched: Array.isArray(result.firstImported?.tags) && result.firstImported.tags.includes('journal'),
          plainImportDefaulted: result.defaultedImported?.title === 'Plain Note',
          cleanupScheduled: Boolean(result.previousSnapshot)
        }
        console.log('[SHELL_CAPTURE_JOURNAL_LIFECYCLE_SMOKE]', JSON.stringify(smokeResult))
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (assetsDbSmoke) {
        mkdirSync(assetsExportDir, { recursive: true })
        const importFilePaths = readdirSync(assetsImportDir, { withFileTypes: true })
          .filter(entry => entry.isFile() && !entry.name.startsWith('.'))
          .map(entry => join(assetsImportDir, entry.name))
          .sort()

        const result = await win.webContents.executeJavaScript(`
          (async () => {
            const workspace = await window.shell.workspace.get()
            window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.assets' }))
            await new Promise((resolve) => setTimeout(resolve, 250))
            if (typeof window.__assetsCaptureDbSmoke !== 'function') {
              throw new Error('Assets capture DB smoke hook is not installed.')
            }
            const result = await window.__assetsCaptureDbSmoke({
              importFilePaths: ${JSON.stringify(importFilePaths)},
              exportDir: ${JSON.stringify(assetsExportDir)}
            })
            document.querySelector('button[aria-label="Show inspector"]')?.click()
            return { workspaceId: workspace.id, ...result }
          })()
        `)

        assetsSmokeCleanupIds = Array.isArray(result.importedIds)
          ? result.importedIds.map(String)
          : []
        const filesWritten = Array.isArray(result.exportResult?.filesWritten)
          ? result.exportResult.filesWritten.map(String)
          : []
        const manifestPath = result.exportResult?.manifestPath ? String(result.exportResult.manifestPath) : ''
        assetsSmokeExportPaths = [...filesWritten, manifestPath].filter(Boolean)
        const manifest = manifestPath && existsSync(manifestPath)
          ? JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>
          : null
        const sourceExistsAfterDelete = result.deletedSourcePath
          ? existsSync(String(result.deletedSourcePath))
          : false

        const smokeResult = {
          ...result,
          importSourceCount: importFilePaths.length,
          exportedFilesExist: filesWritten.length > 0 && filesWritten.every(filePath => existsSync(filePath)),
          manifestExists: Boolean(manifestPath && existsSync(manifestPath)),
          manifestAssetCount: Array.isArray(manifest?.['assets']) ? manifest['assets'].length : 0,
          missingFilesRecorded: Array.isArray(result.exportResult?.missingFiles),
          sourceExistsAfterDatabaseDelete: sourceExistsAfterDelete,
          cleanupScheduled: assetsSmokeCleanupIds.length > 0
        }
        console.log('[SHELL_CAPTURE_ASSETS_DB_SMOKE]', JSON.stringify(smokeResult))
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (openSettings) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('shell:capture-open-settings'))`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (isThemeMode(captureTheme) && captureTheme !== 'system') {
        await win.webContents.executeJavaScript(
          `document.documentElement.setAttribute('data-theme', ${JSON.stringify(captureTheme)})`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      } else if (captureTheme === 'system') {
        await win.webContents.executeJavaScript('document.documentElement.removeAttribute("data-theme")')
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (showInspector) {
        await win.webContents.executeJavaScript(`
          document.querySelector('button[aria-label="Show inspector"]')?.click()
        `)
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (newAiConversation) {
        await win.webContents.executeJavaScript(`
          document.querySelector('button[title="New conversation"]')?.click()
        `)
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (openRailMore) {
        await win.webContents.executeJavaScript(`
          document.querySelector('button[data-rail-id="rail-more"]')?.click()
        `)
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (openWorkspaceMenu) {
        await win.webContents.executeJavaScript(`
          document.querySelector('button[aria-haspopup="menu"][aria-label^="Project menu"]')?.click()
        `)
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (selectAssetMediaType) {
        await win.webContents.executeJavaScript(`
          (async () => {
            window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.assets' }))
            await new Promise((resolve) => setTimeout(resolve, 250))
            const selector = '.asset-open[data-media-type=' + CSS.escape(${JSON.stringify(selectAssetMediaType)}) + ']'
            const assetRow = document.querySelector(selector)
            if (!assetRow) throw new Error('No ${selectAssetMediaType} asset row available for capture.')
            assetRow.click()
          })()
        `)
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (openAssetImagePreview) {
        await win.webContents.executeJavaScript(`
          (async () => {
            window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.assets' }))
            await new Promise((resolve) => setTimeout(resolve, 250))
            const imageRows = Array.from(document.querySelectorAll('.asset-open[data-media-type="image"]'))
            const imageAsset = imageRows.find((row) => row.textContent?.includes('600 x 900')) ?? imageRows[0]
            if (!imageAsset) throw new Error('No image asset row available for preview capture.')
            imageAsset.click()
            await new Promise((resolve) => setTimeout(resolve, 250))
            const trigger = document.querySelector('button.asset-preview-trigger')
            if (!trigger) throw new Error('Image preview trigger is not available.')
            trigger.click()
          })()
        `)
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (openPdfReader) {
        await win.webContents.executeJavaScript(`
          (async () => {
            window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.assets' }))
            await new Promise((resolve) => setTimeout(resolve, 250))
            const pdfRows = Array.from(document.querySelectorAll('.asset-open[data-media-type="pdf"]'))
            const pdfAsset = pdfRows[0]
            if (!pdfAsset) throw new Error('No PDF asset row available for reader capture.')
            pdfAsset.click()
            await new Promise((resolve) => setTimeout(resolve, 250))
            const trigger = document.querySelector('[data-capture-pdf-open]')
              ?? Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Read PDF'))
            if (!trigger) throw new Error('PDF reader trigger is not available.')
            trigger.click()
            await new Promise((resolve) => setTimeout(resolve, 1200))
            const targetPage = ${JSON.stringify(Number.isFinite(pdfReaderPage) ? Math.max(1, Math.floor(pdfReaderPage)) : 1)}
            if (targetPage > 1) {
              const input = document.querySelector('[data-capture-pdf-reader] input[type="number"]')
              if (!input) throw new Error('PDF page input is not available.')
              input.value = String(targetPage)
              input.dispatchEvent(new Event('input', { bubbles: true }))
              input.dispatchEvent(new Event('blur', { bubbles: true }))
              await new Promise((resolve) => setTimeout(resolve, 1200))
            }
          })()
        `)
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (tableSearch !== undefined || tableKind) {
        await win.webContents.executeJavaScript(`
          (async () => {
            window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.tableview' }))
            await new Promise((resolve) => setTimeout(resolve, 250))
            const searchInput = document.querySelector('[data-capture-table-search]')
            const kindSelect = document.querySelector('[data-capture-table-kind]')
            if (!searchInput || !kindSelect) throw new Error('Table capture controls are not available.')
            if (${JSON.stringify(tableSearch !== undefined)}) {
              searchInput.value = ${JSON.stringify(tableSearch ?? '')}
              searchInput.dispatchEvent(new Event('input', { bubbles: true }))
            }
            if (${JSON.stringify(Boolean(tableKind))}) {
              kindSelect.value = ${JSON.stringify(tableKind ?? '')}
              kindSelect.dispatchEvent(new Event('change', { bubbles: true }))
            }
          })()
        `)
        tableFilterCleanup = true
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (openAiContext) {
        await win.webContents.executeJavaScript(`
          document.querySelector('button[aria-haspopup="dialog"]')?.click()
        `)
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      await win.webContents.executeJavaScript('window.getSelection()?.removeAllRanges()')
      await waitForWebviewRender()
      const img = await win.webContents.capturePage()
      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, img.toPNG())
      console.log('[SHELL_CAPTURE] wrote', out)
    } catch (err) {
      console.error('[SHELL_CAPTURE] failed:', err)
    } finally {
      if (workspaceSmokeCleanup) {
        try {
          const cleanupResult = await win.webContents.executeJavaScript(`
            (async () => {
              const workspaceIds = ${JSON.stringify(workspaceSmokeCleanup.workspaceIds)}
              const initialWorkspaceId = ${JSON.stringify(workspaceSmokeCleanup.initialWorkspaceId)}
              for (const id of workspaceIds) {
                const rows = await window.shell.workspace.list({ includeArchived: true })
                if (rows.some((workspace) => workspace.id === id)) {
                  await window.shell.workspace.delete(id)
                }
              }
              const rowsAfterDelete = await window.shell.workspace.list({ includeArchived: true })
              if (rowsAfterDelete.some((workspace) => workspace.id === initialWorkspaceId && !workspace.archivedAt)) {
                await window.shell.workspace.switch(initialWorkspaceId)
              }
              return {
                deletedWorkspaceIds: workspaceIds.filter((id) => !rowsAfterDelete.some((workspace) => workspace.id === id)),
                restoredActiveWorkspaceId: initialWorkspaceId
              }
            })()
          `)
          console.log('[SHELL_CAPTURE_WORKSPACE_CLEANUP]', JSON.stringify(cleanupResult))
        } catch (cleanupErr) {
          console.error('[SHELL_CAPTURE_WORKSPACE_CLEANUP] failed:', cleanupErr)
        }
      }
      if (documentSmokeCleanupIds.length > 0) {
        try {
          const db = getDb()
          const placeholders = documentSmokeCleanupIds.map(() => '?').join(', ')
          db.prepare(`DELETE FROM document_versions WHERE documentId IN (${placeholders})`).run(...documentSmokeCleanupIds)
          db.prepare(`DELETE FROM documents WHERE id IN (${placeholders})`).run(...documentSmokeCleanupIds)
          console.log('[SHELL_CAPTURE_DOCUMENT_LIFECYCLE_CLEANUP]', JSON.stringify({
            deletedDocumentIds: documentSmokeCleanupIds
          }))
        } catch (cleanupErr) {
          console.error('[SHELL_CAPTURE_DOCUMENT_LIFECYCLE_CLEANUP] failed:', cleanupErr)
        }
      }
      if (journalSmokeCleanup) {
        try {
          await win.webContents.executeJavaScript(`
            (async () => {
              const workspaceId = ${JSON.stringify(journalSmokeCleanup.workspaceId)}
              const snapshot = ${JSON.stringify(journalSmokeCleanup.previousSnapshot)}
              if (typeof window.__journalCaptureRestoreSnapshot === 'function') {
                window.__journalCaptureRestoreSnapshot(snapshot)
              }
              await window.shell.settings.set(\`modules.journal.\${workspaceId}.state\`, snapshot)
              return { restoredWorkspaceId: workspaceId, restoredEntries: Array.isArray(snapshot?.entries) ? snapshot.entries.length : 0 }
            })()
          `).then((cleanupResult) => {
            console.log('[SHELL_CAPTURE_JOURNAL_LIFECYCLE_CLEANUP]', JSON.stringify(cleanupResult))
          })
        } catch (cleanupErr) {
          console.error('[SHELL_CAPTURE_JOURNAL_LIFECYCLE_CLEANUP] failed:', cleanupErr)
        }
      }
      if (assetsSmokeCleanupIds.length > 0 || assetsSmokeExportPaths.length > 0) {
        try {
          if (assetsSmokeCleanupIds.length > 0) {
            await win.webContents.executeJavaScript(`
              (async () => {
                const ids = ${JSON.stringify(assetsSmokeCleanupIds)}
                if (typeof window.__assetsCaptureDeleteAssets === 'function') {
                  await window.__assetsCaptureDeleteAssets(ids)
                } else {
                  for (const id of ids) await window.shell.assets.delete(id)
                }
                return { deletedAssetIds: ids }
              })()
            `).then((cleanupResult) => {
              console.log('[SHELL_CAPTURE_ASSETS_DB_CLEANUP]', JSON.stringify(cleanupResult))
            })
          }
          for (const filePath of assetsSmokeExportPaths) {
            if (existsSync(filePath)) unlinkSync(filePath)
          }
          if (assetsSmokeExportPaths.length > 0) {
            console.log('[SHELL_CAPTURE_ASSETS_EXPORT_CLEANUP]', JSON.stringify({
              deletedPaths: assetsSmokeExportPaths
            }))
          }
        } catch (cleanupErr) {
          console.error('[SHELL_CAPTURE_ASSETS_DB_CLEANUP] failed:', cleanupErr)
        }
      }
      if (tableFilterCleanup) {
        try {
          await win.webContents.executeJavaScript(`
            (async () => {
              window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.tableview' }))
              await new Promise((resolve) => setTimeout(resolve, 100))
              document.querySelector('.reset-btn')?.click()
              return { reset: true }
            })()
          `).then((cleanupResult) => {
            console.log('[SHELL_CAPTURE_TABLE_FILTER_CLEANUP]', JSON.stringify(cleanupResult))
          })
        } catch (cleanupErr) {
          console.error('[SHELL_CAPTURE_TABLE_FILTER_CLEANUP] failed:', cleanupErr)
        }
      }
      app.quit()
    }
  }, delay)
}
