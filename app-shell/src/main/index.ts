import { app, BrowserWindow, shell, nativeTheme } from 'electron'
import { join, dirname } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { initDb } from './core/db'
import { events } from './core/events'
import { createSettingsStore } from './core/settings'
import { workspaceService } from './core/workspaces'
import { moduleRegistry } from './modules/registry'
import { documentsModule } from './modules/documents'
import { journalModule } from './modules/journal'
import { assetsModule } from './modules/assets'
import { workflowModule } from './modules/workflow'
import { tableViewModule } from './modules/tableview'
import { aiChatModule } from './modules/aichat'
import { webModule } from './modules/web'
import { promptStudioModule } from './modules/promptstudio'
import { registerIpcHandlers } from './ipc'

const APP_NAME = 'App Shell'
app.setName(APP_NAME)

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
function maybeCaptureForEvidence(win: BrowserWindow): void {
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
      if (openSettings) {
        await win.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('shell:capture-open-settings'))`
        )
        await new Promise(resolve => setTimeout(resolve, interactionDelay))
      }
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

let initialBgColor = '#1e1e2e' // Updated below once DB is ready

function appIconPath(): string {
  const devIconPath = join(__dirname, '../../resources/icon.png')
  if (existsSync(devIconPath)) return devIconPath
  return join(process.resourcesPath, 'icon.png')
}

function createWindow(): void {
  const icon = appIconPath()
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: APP_NAME,
    titleBarStyle: 'hiddenInset',
    backgroundColor: initialBgColor,
    icon,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      webviewTag: true,
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())
  maybeCaptureForEvidence(win)

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  initDb()
  registerIpcHandlers()
  const activeWorkspace = workspaceService.getActive()
  moduleRegistry.setWorkspace(activeWorkspace)

  // 0. Restore persisted theme before window creation to avoid flash.
  const shellSettings = createSettingsStore('shell')
  const captureAiProviderId = process.env['SHELL_CAPTURE_AI_PROVIDER']
  const captureAiModel = process.env['SHELL_CAPTURE_AI_MODEL']
  if (process.env['SHELL_CAPTURE'] && captureAiProviderId) {
    shellSettings.set('ai.providerId', captureAiProviderId)
    if (captureAiModel) {
      shellSettings.set(`ai.model.${captureAiProviderId}`, captureAiModel)
    }
  }
  const savedTheme = shellSettings.get<string>('theme') ?? 'system'
  nativeTheme.themeSource = savedTheme as 'light' | 'dark' | 'system'
  const isLight = savedTheme === 'light' ||
    (savedTheme === 'system' && !nativeTheme.shouldUseDarkColors)
  initialBgColor = isLight ? '#f5f3f0' : '#1e1e2e'
  const icon = appIconPath()
  if (process.platform === 'darwin' && existsSync(icon)) {
    app.dock?.setIcon(icon)
  }

  // 1. Register all modules — reads manifests only, no code runs.
  const allModules = [
    documentsModule, journalModule, assetsModule,
    workflowModule, tableViewModule, aiChatModule, webModule,
    promptStudioModule
  ]
  for (const mod of allModules) {
    moduleRegistry.register(mod)
  }

  // 2. Restore enabled state from persistence (defaults to all-enabled on first launch).
  moduleRegistry.restoreEnabledState()

  // 3. Auto-activate any enabled module whose activation rules match the workspace type.
  //    Everything else activates on first use (rail click, command execution, file open).
  await moduleRegistry.activateByWorkspaceType(activeWorkspace.type)

  createWindow()

  // Forward shell:notify events to the renderer so toasts appear.
  events.on('shell:notify', (toast) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('shell:notify', toast)
    })
  })

  events.on('jobs:changed', (job) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('jobs:changed', job)
    })
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
