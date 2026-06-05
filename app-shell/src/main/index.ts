import { app, BrowserWindow, shell, nativeTheme } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { maybeCaptureForEvidence } from './capture/evidence'
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

  events.on('documents:changed', (id) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('documents:changed', id)
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
