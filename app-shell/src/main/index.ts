import { app, BrowserWindow, shell, nativeTheme } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { maybeCaptureForEvidence } from './capture/evidence'
import { initDb } from './core/db'
import { events } from './core/events'
import { createSettingsStore } from './core/settings'
import { isThemeMode, themeStartupBackground, toNativeThemeSource } from './core/theme'
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
import { DEMO_MODE_SETTING_KEY } from '@shared/demo-mode'
import type { ThemeMode } from '@shared/module-contract'

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
  const captureWorkspaceName = process.env['SHELL_CAPTURE_WORKSPACE_NAME']
  let activeWorkspace = workspaceService.getActive()
  if (process.env['SHELL_CAPTURE'] && captureWorkspaceName) {
    const target = workspaceService
      .list()
      .find(workspace => workspace.name === captureWorkspaceName)
    if (target && target.id !== activeWorkspace.id) {
      process.env['SHELL_CAPTURE_RESTORE_WORKSPACE_ID'] = activeWorkspace.id
      activeWorkspace = workspaceService.switch(target.id)
    } else if (!target) {
      console.error('[SHELL_CAPTURE_WORKSPACE_SELECT] failed: workspace not found', captureWorkspaceName)
    }
  }
  moduleRegistry.setWorkspace(activeWorkspace)

  // 0. Restore persisted theme before window creation to avoid flash.
  const shellSettings = createSettingsStore('shell')
  const captureAiProviderId = process.env['SHELL_CAPTURE_AI_PROVIDER']
  const captureAiModel = process.env['SHELL_CAPTURE_AI_MODEL']
  const captureTheme = process.env['SHELL_CAPTURE_THEME']
  const captureDemoMode = process.env['SHELL_CAPTURE_DEMO_MODE']
  const captureModuleEnabled = process.env['SHELL_CAPTURE_MODULES_ENABLED']
  const captureModuleVisible = process.env['SHELL_CAPTURE_MODULES_VISIBLE']
  if (process.env['SHELL_CAPTURE'] && captureAiProviderId) {
    shellSettings.set('ai.providerId', captureAiProviderId)
    if (captureAiModel) {
      shellSettings.set(`ai.model.${captureAiProviderId}`, captureAiModel)
    }
  }
  if (process.env['SHELL_CAPTURE'] && isThemeMode(captureTheme)) {
    shellSettings.set('theme', captureTheme)
  }
  if (process.env['SHELL_CAPTURE'] && (captureDemoMode === '0' || captureDemoMode === '1')) {
    shellSettings.set(DEMO_MODE_SETTING_KEY, captureDemoMode === '1')
  }
  const savedThemeValue = shellSettings.get<string>('theme')
  const savedTheme: ThemeMode = isThemeMode(savedThemeValue) ? savedThemeValue : 'system'
  nativeTheme.themeSource = toNativeThemeSource(savedTheme)
  initialBgColor = themeStartupBackground(savedTheme, nativeTheme.shouldUseDarkColors)
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
  if (process.env['SHELL_CAPTURE'] && (captureModuleEnabled || captureModuleVisible)) {
    moduleRegistry.applyTransientState({
      enabledIds: captureModuleEnabled?.split(',').map(id => id.trim()).filter(Boolean),
      visibleIds: captureModuleVisible?.split(',').map(id => id.trim()).filter(Boolean)
    })
  }

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
