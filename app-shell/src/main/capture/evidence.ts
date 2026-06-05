import { app, BrowserWindow } from 'electron'
import { dirname } from 'path'
import { mkdirSync, writeFileSync } from 'fs'
import { isThemeMode } from '../core/theme'

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
  const openAiContext = process.env['SHELL_CAPTURE_OPEN_AI_CONTEXT'] === '1'
  const newAiConversation = process.env['SHELL_CAPTURE_NEW_AI_CONVERSATION'] === '1'
  const showInspector = process.env['SHELL_CAPTURE_SHOW_INSPECTOR'] === '1'
  const workspaceImportRoot = process.env['SHELL_CAPTURE_WORKSPACE_IMPORT_ROOT']
  const interactionDelay = Number(process.env['SHELL_CAPTURE_INTERACTION_DELAY'] ?? 900)
  const webviewTimeout = Number(process.env['SHELL_CAPTURE_WEBVIEW_TIMEOUT'] ?? 12000)

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
            await window.shell.workspace.archive(imported.id)
            const archivedRows = await window.shell.workspace.list({ includeArchived: true })
            await window.shell.workspace.restore(imported.id)
            await window.shell.workspace.delete(imported.id)
            await window.shell.workspace.delete(duplicate.id)
            const afterDeleteRows = await window.shell.workspace.list({ includeArchived: true })
            await window.shell.workspace.switch(initialWorkspace.id)

            return {
              importedWorkspaceId: imported.id,
              duplicateWorkspaceId: duplicate.id,
              importedDocCount: importedDocs.length,
              duplicateDocCount: duplicateDocs.length,
              folderTitles: importedDocs.filter((doc) => doc.kind === 'folder').map((doc) => doc.title).sort(),
              fileTitles: importedDocs.filter((doc) => doc.kind === 'chapter').map((doc) => doc.title).sort(),
              contentMatched: importedDocs.some((doc) => doc.title === 'alpha' && doc.content.includes('Imported markdown.'))
                && importedDocs.some((doc) => doc.title === 'scene-note' && doc.content.includes('Scene note text.')),
              unsupportedSkipped: !importedDocs.some((doc) => doc.title === 'unsupported'),
              sourcePathCount: importedDocs.filter((doc) => doc.sourcePath).length,
              checksumCount: importedDocs.filter((doc) => doc.sourceChecksum).length,
              archivedAfterArchive: archivedRows.some((workspace) => workspace.id === imported.id && workspace.archivedAt),
              deletedAfterDelete: !afterDeleteRows.some((workspace) => workspace.id === imported.id),
              duplicateDeletedAfterSmoke: !afterDeleteRows.some((workspace) => workspace.id === duplicate.id),
              restoredActiveWorkspaceId: initialWorkspace.id
            }
          })()
        `)
        console.log('[SHELL_CAPTURE_WORKSPACE_SMOKE]', JSON.stringify(result))
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
      app.quit()
    }
  }, delay)
}
