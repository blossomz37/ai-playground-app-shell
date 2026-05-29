import { app, BrowserWindow, shell } from 'electron'
import { join, dirname } from 'path'
import { mkdirSync, writeFileSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { initDb } from './core/db'
import { events } from './core/events'
import { moduleRegistry } from './modules/registry'
import { documentsModule } from './modules/documents'
import { journalModule } from './modules/journal'
import { assetsModule } from './modules/assets'
import { workflowModule } from './modules/workflow'
import { tableViewModule } from './modules/tableview'
import { aiChatModule } from './modules/aichat'
import { webModule } from './modules/web'
import { registerIpcHandlers } from './ipc'

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
  // Delay so async IPC-loaded data (document tree, active doc) has rendered.
  setTimeout(async () => {
    try {
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

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e2e',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
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

  // 1. Register all modules — reads manifests only, no code runs.
  const allModules = [
    documentsModule, journalModule, assetsModule,
    workflowModule, tableViewModule, aiChatModule, webModule
  ]
  for (const mod of allModules) {
    moduleRegistry.register(mod)
  }

  // 2. Restore enabled state from persistence (defaults to all-enabled on first launch).
  moduleRegistry.restoreEnabledState()

  // 3. Auto-activate any enabled module whose activation rules match the workspace type.
  //    Everything else activates on first use (rail click, command execution, file open).
  await moduleRegistry.activateByWorkspaceType('authoring')

  createWindow()

  // Forward shell:notify events to the renderer so toasts appear.
  events.on('shell:notify', (toast) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('shell:notify', toast)
    })
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
