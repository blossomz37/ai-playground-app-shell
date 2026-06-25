import { app, BrowserWindow } from 'electron'
import { basename, dirname, join } from 'path'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs'
import { isThemeMode } from '../core/theme'
import { getDb } from '../core/db'
import { workspaceService } from '../core/workspaces'

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
  const aiPreviewPrompt = process.env['SHELL_CAPTURE_AI_PREVIEW_PROMPT']
  const aiPreviewVariablesJson = process.env['SHELL_CAPTURE_AI_PREVIEW_VARIABLES']
  const aiPreviewWritingVariablesJson = process.env['SHELL_CAPTURE_AI_PREVIEW_WRITING_VARIABLES']
  const aiProviderId = process.env['SHELL_CAPTURE_AI_PROVIDER']
  const aiModel = process.env['SHELL_CAPTURE_AI_MODEL']
  const jobType = process.env['SHELL_CAPTURE_JOB_TYPE']
  const markdownMessage = process.env['SHELL_CAPTURE_MARKDOWN_MESSAGE']
  const documentMarkdown = process.env['SHELL_CAPTURE_DOCUMENT_MARKDOWN']
  const documentSelectionText = process.env['SHELL_CAPTURE_DOCUMENT_SELECTION_TEXT']
  const documentSelectionFrom = Number(process.env['SHELL_CAPTURE_DOCUMENT_SELECTION_FROM'] ?? NaN)
  const documentSelectionTo = Number(process.env['SHELL_CAPTURE_DOCUMENT_SELECTION_TO'] ?? NaN)
  const documentAiPreview = process.env['SHELL_CAPTURE_DOCUMENT_AI_PREVIEW']
  const documentAiUserInput = process.env['SHELL_CAPTURE_DOCUMENT_AI_USER_INPUT']
  const documentAiSaveProposal = process.env['SHELL_CAPTURE_DOCUMENT_AI_SAVE_PROPOSAL'] === '1'
  const documentSearchCapture = process.env['SHELL_CAPTURE_DOCUMENT_SEARCH'] === '1'
  const documentSearchQuery = process.env['SHELL_CAPTURE_DOCUMENT_SEARCH_QUERY']
  const documentSearchReplacement = process.env['SHELL_CAPTURE_DOCUMENT_SEARCH_REPLACEMENT']
  const documentSearchMode = process.env['SHELL_CAPTURE_DOCUMENT_SEARCH_MODE']
  const documentSearchScope = process.env['SHELL_CAPTURE_DOCUMENT_SEARCH_SCOPE']
  const documentSearchPreview = process.env['SHELL_CAPTURE_DOCUMENT_SEARCH_PREVIEW'] === '1'
  const webUrl = process.env['SHELL_CAPTURE_WEB_URL']
  const webNav = process.env['SHELL_CAPTURE_WEB_NAV']
  const clearWebHistory = process.env['SHELL_CAPTURE_CLEAR_WEB_HISTORY'] === '1'
  const openSettings = process.env['SHELL_CAPTURE_SETTINGS'] === '1'
  const openJobsPanel = process.env['SHELL_CAPTURE_OPEN_JOBS'] === '1'
  const settingsSearch = process.env['SHELL_CAPTURE_SETTINGS_SEARCH']
  const viewport = process.env['SHELL_CAPTURE_VIEWPORT']
  const commandPaletteQuery = process.env['SHELL_CAPTURE_COMMAND_PALETTE_QUERY']
  const captureTheme = process.env['SHELL_CAPTURE_THEME']
  const partyMode = process.env['SHELL_CAPTURE_PARTY_MODE'] === '1'
  const exitZen = process.env['SHELL_CAPTURE_EXIT_ZEN'] === '1'
  const openRailMore = process.env['SHELL_CAPTURE_OPEN_RAIL_MORE'] === '1'
  const openWorkspaceMenu = process.env['SHELL_CAPTURE_OPEN_WORKSPACE_MENU'] === '1'
  const openAssetImagePreview = process.env['SHELL_CAPTURE_OPEN_ASSET_IMAGE_PREVIEW'] === '1'
  const openPdfReader = process.env['SHELL_CAPTURE_OPEN_PDF_READER'] === '1'
  const pdfReaderPage = Number(process.env['SHELL_CAPTURE_PDF_READER_PAGE'] ?? 1)
  const openAiContext = process.env['SHELL_CAPTURE_OPEN_AI_CONTEXT'] === '1'
  const newAiConversation = process.env['SHELL_CAPTURE_NEW_AI_CONVERSATION'] === '1'
  const showInspector = process.env['SHELL_CAPTURE_SHOW_INSPECTOR'] === '1'
  const tableSearch = process.env['SHELL_CAPTURE_TABLE_SEARCH']
  const tableSearchMode = process.env['SHELL_CAPTURE_TABLE_SEARCH_MODE']
  const tableFolder = process.env['SHELL_CAPTURE_TABLE_FOLDER']
  const tableKind = process.env['SHELL_CAPTURE_TABLE_KIND']
  const tableKinds = process.env['SHELL_CAPTURE_TABLE_KINDS']
  const tableWordsMin = process.env['SHELL_CAPTURE_TABLE_WORDS_MIN']
  const tableWordsMax = process.env['SHELL_CAPTURE_TABLE_WORDS_MAX']
  const tableUpdatedRange = process.env['SHELL_CAPTURE_TABLE_UPDATED_RANGE']
  const tableSort = process.env['SHELL_CAPTURE_TABLE_SORT']
  const tableSortDirection = process.env['SHELL_CAPTURE_TABLE_SORT_DIRECTION']
  const tableReset = process.env['SHELL_CAPTURE_TABLE_RESET'] === '1'
  const tableBulkState = process.env['SHELL_CAPTURE_TABLE_BULK_STATE']
  const tableBulkCount = Number(process.env['SHELL_CAPTURE_TABLE_BULK_COUNT'] ?? 3)
  const tableBulkKind = process.env['SHELL_CAPTURE_TABLE_BULK_KIND']
  const tableBulkTargetWords = process.env['SHELL_CAPTURE_TABLE_BULK_TARGET_WORDS']
  const documentKindSmokeState = process.env['SHELL_CAPTURE_DOCUMENT_KIND_SMOKE']
  const toastMessage = process.env['SHELL_CAPTURE_TOAST_MESSAGE']
  const toastLevel = process.env['SHELL_CAPTURE_TOAST_LEVEL'] ?? 'info'
  const restoreWorkspaceId = process.env['SHELL_CAPTURE_RESTORE_WORKSPACE_ID']
  const workspaceImportRoot = process.env['SHELL_CAPTURE_WORKSPACE_IMPORT_ROOT']
  const documentLifecycleSmoke = process.env['SHELL_CAPTURE_DOCUMENT_LIFECYCLE_SMOKE'] === '1'
  const documentPlan47State = process.env['SHELL_CAPTURE_DOCUMENT_PLAN47_STATE']
  const documentExportDir = process.env['SHELL_CAPTURE_DOCUMENT_EXPORT_DIR']
    ?? join(app.getPath('temp'), `app-shell-document-export-${Date.now()}`)
  const journalLifecycleSmoke = process.env['SHELL_CAPTURE_JOURNAL_LIFECYCLE_SMOKE'] === '1'
  const journalSmokeDir = process.env['SHELL_CAPTURE_JOURNAL_DIR']
    ?? join(app.getPath('temp'), `app-shell-journal-lifecycle-${Date.now()}`)
  const journalImportDir = join(journalSmokeDir, 'import')
  const journalExportDir = join(journalSmokeDir, 'export')
  const assetsDbSmoke = process.env['SHELL_CAPTURE_ASSETS_DB_SMOKE'] === '1'
  const assetLinksState = process.env['SHELL_CAPTURE_ASSET_LINKS_STATE']
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
  let documentPlan47CleanupIds: string[] = []
  let journalSmokeCleanup: { workspaceId: string; previousSnapshot: unknown } | null = null
  let assetsSmokeCleanupIds: string[] = []
  let assetsSmokeExportPaths: string[] = []
  let assetLinksCleanupIds: string[] = []
  let assetLinksDocumentCleanupIds: string[] = []
  let assetLinksTempPaths: string[] = []
  let tableFilterCleanup = false
  let documentKindSmokeCleanupIds: string[] = []

  if (viewport) {
    const match = viewport.match(/^(\d+)x(\d+)$/i)
    if (match) {
      const width = Number(match[1])
      const height = Number(match[2])
      if (Number.isFinite(width) && Number.isFinite(height)) {
        win.setMinimumSize(Math.min(width, 800), Math.min(height, 600))
        win.setSize(width, height)
      }
    }
  }

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
      if (aiPreviewPrompt) {
        const preview = await win.webContents.executeJavaScript(`
          (async () => {
            const workspace = await window.shell.workspace.get()
            const contextCandidates = await window.shell.ai.collectContext({
              workspaceId: workspace.id,
              activeDocumentId: ${JSON.stringify(documentId ?? null)},
              includeDescendants: true
            })
            const parseJson = (value) => {
              if (!value) return undefined
              try { return JSON.parse(value) } catch { return undefined }
            }
            return window.shell.ai.preview({
              workspaceId: workspace.id,
              moduleId: ${JSON.stringify(moduleId ?? 'shell.aichat')},
              originType: 'template',
              originId: 'capture-preview',
              prompt: ${JSON.stringify(aiPreviewPrompt)},
              variables: parseJson(${JSON.stringify(aiPreviewVariablesJson)}),
              writingVariables: parseJson(${JSON.stringify(aiPreviewWritingVariablesJson)}),
              providerId: ${JSON.stringify(aiProviderId ?? undefined)},
              model: ${JSON.stringify(aiModel ?? undefined)},
              contextCandidates
            })
          })()
        `)
        console.log('[SHELL_CAPTURE_AI_PREVIEW]', JSON.stringify(preview))
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (moduleId) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: ${JSON.stringify(moduleId)} }))`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (exitZen) {
        await win.webContents.executeJavaScript(`
          document.querySelector('button[aria-label="Exit zen mode"]')?.click()
        `)
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
      if (webNav === 'bookmarks' || webNav === 'history') {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('web:capture-set-nav', { detail: ${JSON.stringify(webNav)} }))`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (clearWebHistory) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('web:capture-clear-history'))`
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
      if (openJobsPanel) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('shell:capture-open-jobs'))`
        )
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
      if (documentSelectionText || (Number.isFinite(documentSelectionFrom) && Number.isFinite(documentSelectionTo))) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('shell:capture-document-selection', { detail: ${JSON.stringify({
            text: documentSelectionText,
            from: Number.isFinite(documentSelectionFrom) ? documentSelectionFrom : undefined,
            to: Number.isFinite(documentSelectionTo) ? documentSelectionTo : undefined
          })} }))`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (documentAiPreview) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('shell:capture-document-ai-preview', { detail: ${JSON.stringify({
            action: documentAiPreview,
            userInput: documentAiUserInput,
            saveProposal: documentAiSaveProposal
          })} }))`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (documentSearchCapture) {
        await win.webContents.executeJavaScript(
          `
            (async () => {
              await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
              window.dispatchEvent(new CustomEvent('shell:capture-open-document-search', { detail: ${JSON.stringify({
                query: documentSearchQuery,
                replacement: documentSearchReplacement,
                mode: documentSearchMode,
                scope: documentSearchScope,
                preview: documentSearchPreview
              })} }))
            })()
          `
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
              folderTitles: importedDocs.filter((doc) => doc.nodeType === 'folder').map((doc) => doc.title).sort(),
              fileTitles: importedDocs.filter((doc) => doc.nodeType === 'document' && doc.kind === null).map((doc) => doc.title).sort(),
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
	              nodeType: 'folder',
	              kind: null,
              title: 'Lifecycle Export Smoke',
              parentId: null,
              sortOrder: 0
            })
	            const overview = await window.shell.documents.create({
	              workspaceId: workspace.id,
	              nodeType: 'document',
	              kind: 'chapter',
              title: 'Overview',
              parentId: root.id,
              sortOrder: 0
            })
            await window.shell.documents.save(overview.id, '# Overview\\n\\nExport smoke overview.')
	            const scenes = await window.shell.documents.create({
	              workspaceId: workspace.id,
	              nodeType: 'folder',
	              kind: null,
              title: 'Scenes',
              parentId: root.id,
              sortOrder: 1
            })
	            const firstScene = await window.shell.documents.create({
	              workspaceId: workspace.id,
	              nodeType: 'document',
	              kind: 'scene',
              title: 'Scene Notes',
              parentId: scenes.id,
              sortOrder: 0
            })
            await window.shell.documents.save(firstScene.id, '# Scene Notes\\n\\nFirst exported scene.')
	            const secondScene = await window.shell.documents.create({
	              workspaceId: workspace.id,
	              nodeType: 'document',
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
      if (documentPlan47State) {
        const result = await win.webContents.executeJavaScript(`
          (async () => {
            const workspace = await window.shell.workspace.get()
            const main = await window.shell.documents.create({
              workspaceId: workspace.id,
              nodeType: 'document',
              kind: 'chapter',
              title: 'Plan 47 Primary',
              parentId: null,
              sortOrder: 0
            })
            await window.shell.documents.save(main.id, [
              'Opening paragraph for Plan 47 evidence.',
              '',
              'This highlighted sentence carries a sidecar annotation note.',
              '',
              'The ending paragraph differs between the two documents.'
            ].join('\\n'))
            await window.shell.documents.save(main.id, [
              'Opening paragraph for Plan 47 evidence.',
              '',
              'This highlighted sentence carries a sidecar annotation note.',
              '',
              'The restored snapshot has older wording.'
            ].join('\\n'))
            const versions = await window.shell.documents.versions(main.id)
            const secondary = await window.shell.documents.create({
              workspaceId: workspace.id,
              nodeType: 'document',
              kind: 'scene',
              title: 'Plan 47 Secondary',
              parentId: null,
              sortOrder: 1
            })
            await window.shell.documents.save(secondary.id, [
              'Opening paragraph for Plan 47 evidence.',
              '',
              'This second document is open beside the first.',
              '',
              'The ending paragraph uses alternate wording.'
            ].join('\\n'))
            const session = await window.shell.documents.createAnnotationSession({
              workspaceId: workspace.id,
              documentId: main.id,
              documentVersionId: versions[0]?.id ?? null,
              title: 'Plan 47 Evidence Session'
            })
            await window.shell.documents.createAnnotation({
              sessionId: session.id,
              workspaceId: workspace.id,
              documentId: main.id,
              note: 'Sidecar note attached to selectable highlighted text.',
              color: 'yellow',
              target: {
                exact: 'This highlighted sentence carries a sidecar annotation note.',
                prefix: 'Opening paragraph for Plan 47 evidence.\\n\\n',
                suffix: '\\n\\nThe restored snapshot has older wording.',
                from: 42,
                to: 101
              }
            })
            window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.documents' }))
            window.dispatchEvent(new CustomEvent('shell:capture-select-document', { detail: main.id }))
            await new Promise(resolve => setTimeout(resolve, 600))
            window.dispatchEvent(new CustomEvent('shell:capture-plan47-documents', {
              detail: {
                secondaryDocumentId: ${JSON.stringify(documentPlan47State === 'split' || documentPlan47State === 'diff' ? '__SECONDARY__' : '')}.replace('__SECONDARY__', secondary.id),
                diff: ${JSON.stringify(documentPlan47State === 'diff')},
                close: ${JSON.stringify(documentPlan47State === 'close')},
                commentMode: ${JSON.stringify(documentPlan47State === 'comment-mode')}
              }
            }))
            return {
              mainDocumentId: main.id,
              secondaryDocumentId: secondary.id,
              generatedDocumentIds: [main.id, secondary.id],
              versionCount: versions.length,
              state: ${JSON.stringify(documentPlan47State)}
            }
          })()
        `)
        documentPlan47CleanupIds = Array.isArray(result.generatedDocumentIds)
          ? result.generatedDocumentIds.map(String)
          : []
        console.log('[SHELL_CAPTURE_DOCUMENT_PLAN47]', JSON.stringify(result))
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
      if (assetLinksState) {
        const importSource = readdirSync(assetsImportDir, { withFileTypes: true })
          .filter(entry => entry.isFile() && !entry.name.startsWith('.'))
          .map(entry => join(assetsImportDir, entry.name))
          .sort((left, right) => {
            const leftImage = /\.(png|jpe?g|webp)$/i.test(left) ? 0 : 1
            const rightImage = /\.(png|jpe?g|webp)$/i.test(right) ? 0 : 1
            return leftImage - rightImage || basename(left).localeCompare(basename(right))
          })[0]
        if (!importSource) throw new Error(`No asset import source found in ${assetsImportDir}`)
        const tempAssetPath = join(app.getPath('temp'), `app-shell-asset-links-${Date.now()}-${basename(importSource)}`)
        copyFileSync(importSource, tempAssetPath)
        assetLinksTempPaths.push(tempAssetPath)

        const result = await win.webContents.executeJavaScript(`
          (async () => {
            const workspace = await window.shell.workspace.get()
            const createdDocumentIds = []
            let docs = await window.shell.documents.list(workspace.id)
            const targets = [
              { title: 'Capture Opening Scene', kind: 'scene' },
              { title: 'Capture Research Note', kind: 'chapter' }
            ]

            for (const target of targets) {
              if (!docs.some((doc) => doc.title === target.title)) {
	                const created = await window.shell.documents.create({
	                  workspaceId: workspace.id,
	                  nodeType: 'document',
	                  kind: target.kind,
                  title: target.title,
                  parentId: null
                })
                createdDocumentIds.push(created.id)
              }
            }

            await new Promise((resolve) => setTimeout(resolve, 450))
            docs = await window.shell.documents.list(workspace.id)
            const openingDoc = docs.find((doc) => doc.title === 'Capture Opening Scene')
            const researchDoc = docs.find((doc) => doc.title === 'Capture Research Note')
            if (!openingDoc || !researchDoc) throw new Error('Asset link capture documents were not available.')

            const imported = await window.shell.assets.importFiles({
              workspaceId: workspace.id,
              filePaths: [${JSON.stringify(tempAssetPath)}]
            })
            const asset = imported[0]
            if (!asset) throw new Error('Asset link capture import failed.')

            await window.shell.assets.updateWorkspaceLink({
              assetId: asset.id,
              workspaceId: workspace.id,
              fromRole: 'imported',
              toRole: 'cover'
            })

            if (${JSON.stringify(assetLinksState)} === 'linked') {
              await window.shell.assets.addDocumentLink({
                assetId: asset.id,
                documentId: openingDoc.id,
                relationType: 'illustrates'
              })
            }

            window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.assets' }))
            await new Promise((resolve) => setTimeout(resolve, 550))
            if (typeof window.__assetsCaptureRefresh === 'function') {
              await window.__assetsCaptureRefresh(workspace.id, asset.id)
              await new Promise((resolve) => setTimeout(resolve, 350))
            }
            const rows = Array.from(document.querySelectorAll('.asset-open'))
            const row = rows.find((item) => item.textContent?.includes(asset.label)) ?? rows[0]
            if (!row) throw new Error('Imported asset row was not available for capture.')
            row.click()
            await new Promise((resolve) => setTimeout(resolve, 350))
            document.querySelector('button[aria-label="Show inspector"]')?.click()
            await new Promise((resolve) => setTimeout(resolve, 350))
            const inspector = document.querySelector('.inspector')
            if (inspector) inspector.scrollTop = inspector.scrollHeight
            await new Promise((resolve) => setTimeout(resolve, 250))

            if (${JSON.stringify(assetLinksState)} === 'typeahead') {
              const input = document.querySelector('[data-capture-document-typeahead]')
              if (!(input instanceof HTMLInputElement)) throw new Error('Document link typeahead input was not available.')
              input.focus()
              input.value = 'Research'
              input.dispatchEvent(new Event('input', { bubbles: true }))
              await new Promise((resolve) => setTimeout(resolve, 350))
            }

            const reopened = await window.shell.assets.open(asset.id)
            return {
              workspaceId: workspace.id,
              assetId: asset.id,
              state: ${JSON.stringify(assetLinksState)},
              createdDocumentIds,
              projectRole: reopened?.workspaceLinks.find((link) => link.workspaceId === workspace.id)?.role ?? null,
              documentLinkCount: reopened?.documentLinks.length ?? 0,
              openingDocumentId: openingDoc.id,
              researchDocumentId: researchDoc.id
            }
          })()
        `)

        assetLinksCleanupIds = result.assetId ? [String(result.assetId)] : []
        assetLinksDocumentCleanupIds = Array.isArray(result.createdDocumentIds)
          ? result.createdDocumentIds.map(String)
          : []
        console.log('[SHELL_CAPTURE_ASSET_LINKS_SMOKE]', JSON.stringify(result))
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (openSettings) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('shell:capture-open-settings'))`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
        if (settingsSearch) {
          await win.webContents.executeJavaScript(`
            {
              const input = document.querySelector('#settings-module-search');
              if (input instanceof HTMLInputElement) {
                input.value = ${JSON.stringify(settingsSearch)};
                input.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }
          `)
          await new Promise(resolve => setTimeout(resolve, interactionDelay))
        }
      }
      if (documentKindSmokeState) {
        const result = await win.webContents.executeJavaScript(`
          (async () => {
            const workspace = await window.shell.workspace.get()
            await window.shell.settings.set(\`documents.\${workspace.id}.kindOptions\`, [
              { id: 'chapter', label: 'Chapter' },
              { id: 'scene', label: 'Scene' },
              { id: 'plan', label: 'Plan' },
              { id: 'note', label: 'Note' },
              { id: 'research', label: 'Research' },
              { id: 'character', label: 'Character' },
              { id: 'setting', label: 'Setting' },
              { id: 'outline', label: 'Outline' },
              { id: 'research-note', label: 'Research Note' }
            ])

            const folder = await window.shell.documents.create({
              workspaceId: workspace.id,
              nodeType: 'folder',
              kind: null,
              title: 'Kind Smoke Folder',
              parentId: null
            })
            const uncategorized = await window.shell.documents.create({
              workspaceId: workspace.id,
              nodeType: 'document',
              kind: null,
              title: 'Kind Smoke Uncategorized',
              parentId: folder.id
            })
            await window.shell.documents.save(uncategorized.id, '# Kind Smoke Uncategorized\\n\\nThis starts uncategorized.')
            const targetWords = await window.shell.documents.updateMetadata(uncategorized.id, { targetWordCount: 1200 })
            await window.shell.documents.update(uncategorized.id, { kind: 'chapter' })
            const cleared = await window.shell.documents.update(uncategorized.id, { kind: null })
            const research = await window.shell.documents.create({
              workspaceId: workspace.id,
              nodeType: 'document',
              kind: 'research-note',
              title: 'Kind Smoke Research',
              parentId: folder.id
            })
            await window.shell.documents.save(research.id, '# Kind Smoke Research\\n\\nConfigured kind smoke.')

            const state = ${JSON.stringify(documentKindSmokeState)}
            if (state === 'settings') {
              window.dispatchEvent(new CustomEvent('shell:capture-open-settings'))
              await new Promise((resolve) => setTimeout(resolve, 250))
              if (!document.querySelector('#settings-document-kinds')) {
                document.querySelector('button[aria-label="Open settings"]')?.click()
              }
              await new Promise((resolve) => setTimeout(resolve, 250))
              document.querySelector('#settings-document-kinds')?.scrollIntoView({ block: 'start' })
            } else if (state === 'inspector') {
              window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.documents' }))
              await new Promise((resolve) => setTimeout(resolve, 250))
              window.dispatchEvent(new CustomEvent('shell:capture-select-document', { detail: uncategorized.id }))
              await new Promise((resolve) => setTimeout(resolve, 250))
              document.querySelector('button[aria-label="Show inspector"]')?.click()
            } else if (state === 'table' || state === 'table-bulk') {
              window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.tableview' }))
              await new Promise((resolve) => setTimeout(resolve, 250))
              window.dispatchEvent(new CustomEvent('table:capture-set-filters', {
                detail: { reset: true, search: 'Kind Smoke' }
              }))
              await new Promise((resolve) => setTimeout(resolve, 250))
              if (state === 'table-bulk') {
                window.dispatchEvent(new CustomEvent('table:capture-set-bulk', {
                  detail: { count: 3, kind: '__uncategorized__' }
                }))
              }
            }

            return {
              state,
              generatedDocumentIds: [folder.id, uncategorized.id, research.id],
              clearedKind: cleared.kind,
              folderNodeType: folder.nodeType,
              uncategorizedNodeType: uncategorized.nodeType,
              targetWords: targetWords.metadataJson ? JSON.parse(targetWords.metadataJson).targetWordCount : null,
              researchKind: research.kind
            }
          })()
        `)
        documentKindSmokeCleanupIds = Array.isArray(result.generatedDocumentIds)
          ? result.generatedDocumentIds.map(String)
          : []
        console.log('[SHELL_CAPTURE_DOCUMENT_KIND_SMOKE]', JSON.stringify(result))
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (commandPaletteQuery !== undefined) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('shell:capture-open-command-palette', { detail: ${JSON.stringify(commandPaletteQuery)} }))`
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
      if (partyMode) {
        await win.webContents.executeJavaScript(`
          document.querySelector('button[aria-label="Turn on party mode"]')?.click()
        `)
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
      if (
        tableSearch !== undefined
        || tableSearchMode !== undefined
        || tableFolder !== undefined
        || tableKind
        || tableKinds !== undefined
        || tableWordsMin !== undefined
        || tableWordsMax !== undefined
        || tableUpdatedRange !== undefined
        || tableSort !== undefined
        || tableSortDirection !== undefined
        || tableReset
      ) {
        await win.webContents.executeJavaScript(`
          (async () => {
            window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.tableview' }))
            await new Promise((resolve) => setTimeout(resolve, 250))
            window.dispatchEvent(new CustomEvent('table:capture-set-filters', {
              detail: {
                search: ${JSON.stringify(tableSearch)},
                searchMode: ${JSON.stringify(tableSearchMode)},
                folderPath: ${JSON.stringify(tableFolder)},
                kinds: ${JSON.stringify(tableKinds !== undefined
                  ? tableKinds.split(',').map(kind => kind.trim()).filter(Boolean)
                  : tableKind
                    ? [tableKind]
                    : undefined)},
                wordsMin: ${JSON.stringify(tableWordsMin !== undefined ? Number(tableWordsMin) : undefined)},
                wordsMax: ${JSON.stringify(tableWordsMax !== undefined ? Number(tableWordsMax) : undefined)},
                updatedRange: ${JSON.stringify(tableUpdatedRange)},
                sortBy: ${JSON.stringify(tableSort)},
                sortDirection: ${JSON.stringify(tableSortDirection)},
                reset: ${JSON.stringify(tableReset)}
              }
            }))
          })()
        `)
        tableFilterCleanup = true
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (tableBulkState) {
        await win.webContents.executeJavaScript(`
          (async () => {
            window.dispatchEvent(new CustomEvent('shell:capture-select-module', { detail: 'shell.tableview' }))
            await new Promise((resolve) => setTimeout(resolve, 250))
            window.dispatchEvent(new CustomEvent('table:capture-set-bulk', {
              detail: {
                count: ${JSON.stringify(Number.isFinite(tableBulkCount) ? Math.max(1, Math.floor(tableBulkCount)) : 3)},
                kind: ${JSON.stringify(tableBulkKind ?? (tableBulkState === 'kind' ? 'scene' : undefined))},
                targetWords: ${JSON.stringify(tableBulkTargetWords !== undefined ? Number(tableBulkTargetWords) : tableBulkState === 'target' ? 1200 : undefined)},
                confirmDelete: ${JSON.stringify(tableBulkState === 'delete-confirm')}
              }
            }))
          })()
        `)
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (openAiContext) {
        await win.webContents.executeJavaScript(`
          document.querySelector('button[aria-haspopup="dialog"]')?.click()
        `)
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
      if (toastMessage) {
        win.webContents.send('shell:notify', {
          level: toastLevel === 'warn' || toastLevel === 'error' ? toastLevel : 'info',
          message: toastMessage
        })
        await new Promise(resolve => setTimeout(resolve, 250))
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
      if (documentPlan47CleanupIds.length > 0) {
        try {
          const db = getDb()
          const placeholders = documentPlan47CleanupIds.map(() => '?').join(', ')
          db.prepare(`DELETE FROM document_annotations WHERE documentId IN (${placeholders})`).run(...documentPlan47CleanupIds)
          db.prepare(`DELETE FROM document_annotation_sessions WHERE documentId IN (${placeholders})`).run(...documentPlan47CleanupIds)
          db.prepare(`DELETE FROM document_versions WHERE documentId IN (${placeholders})`).run(...documentPlan47CleanupIds)
          db.prepare(`DELETE FROM documents WHERE id IN (${placeholders})`).run(...documentPlan47CleanupIds)
          console.log('[SHELL_CAPTURE_DOCUMENT_PLAN47_CLEANUP]', JSON.stringify({
            deletedDocumentIds: documentPlan47CleanupIds
          }))
        } catch (cleanupErr) {
          console.error('[SHELL_CAPTURE_DOCUMENT_PLAN47_CLEANUP] failed:', cleanupErr)
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
      if (assetLinksCleanupIds.length > 0 || assetLinksDocumentCleanupIds.length > 0 || assetLinksTempPaths.length > 0) {
        try {
          if (assetLinksCleanupIds.length > 0) {
            await win.webContents.executeJavaScript(`
              (async () => {
                const ids = ${JSON.stringify(assetLinksCleanupIds)}
                for (const id of ids) await window.shell.assets.delete(id)
                return { deletedAssetIds: ids }
              })()
            `).then((cleanupResult) => {
              console.log('[SHELL_CAPTURE_ASSET_LINKS_ASSET_CLEANUP]', JSON.stringify(cleanupResult))
            })
          }
          if (assetLinksDocumentCleanupIds.length > 0) {
            const db = getDb()
            const placeholders = assetLinksDocumentCleanupIds.map(() => '?').join(', ')
            db.prepare(`DELETE FROM document_versions WHERE documentId IN (${placeholders})`).run(...assetLinksDocumentCleanupIds)
            db.prepare(`DELETE FROM documents WHERE id IN (${placeholders})`).run(...assetLinksDocumentCleanupIds)
            console.log('[SHELL_CAPTURE_ASSET_LINKS_DOCUMENT_CLEANUP]', JSON.stringify({
              deletedDocumentIds: assetLinksDocumentCleanupIds
            }))
          }
          for (const filePath of assetLinksTempPaths) {
            if (existsSync(filePath)) unlinkSync(filePath)
          }
          if (assetLinksTempPaths.length > 0) {
            console.log('[SHELL_CAPTURE_ASSET_LINKS_FILE_CLEANUP]', JSON.stringify({
              deletedPaths: assetLinksTempPaths
            }))
          }
        } catch (cleanupErr) {
          console.error('[SHELL_CAPTURE_ASSET_LINKS_CLEANUP] failed:', cleanupErr)
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
      if (documentKindSmokeCleanupIds.length > 0) {
        try {
          await win.webContents.executeJavaScript(`
            (async () => {
              const ids = ${JSON.stringify(documentKindSmokeCleanupIds)}
              const deleted = []
              for (const id of ids) {
                const result = await window.shell.documents.delete(id, { recursive: true })
                deleted.push(...result)
              }
              return { deletedIds: deleted }
            })()
          `).then((cleanupResult) => {
            console.log('[SHELL_CAPTURE_DOCUMENT_KIND_CLEANUP]', JSON.stringify(cleanupResult))
          })
        } catch (cleanupErr) {
          console.error('[SHELL_CAPTURE_DOCUMENT_KIND_CLEANUP] failed:', cleanupErr)
        }
      }
      if (restoreWorkspaceId) {
        try {
          const restored = workspaceService.switch(restoreWorkspaceId)
          console.log('[SHELL_CAPTURE_WORKSPACE_RESTORE]', JSON.stringify({ restoredWorkspaceId: restored.id }))
        } catch (cleanupErr) {
          console.error('[SHELL_CAPTURE_WORKSPACE_RESTORE] failed:', cleanupErr)
        }
      }
      app.quit()
    }
  }, delay)
}
