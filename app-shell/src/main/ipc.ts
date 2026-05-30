import { ipcMain, nativeTheme, BrowserWindow } from 'electron'
import type { ThemeMode } from '@shared/module-contract'
import { documents } from './core/documents'
import { createSettingsStore } from './core/settings'
import { searchService } from './core/search'
import { layoutService } from './core/layout'
import { secretsService } from './core/secrets'
import { moduleRegistry } from './modules/registry'
import { getCommandHandler } from './modules/context'

const shellSettings = createSettingsStore('shell')

export function registerIpcHandlers(): void {
  ipcMain.handle('documents:list', (_e, { workspaceId }: { workspaceId: string }) =>
    documents.list(workspaceId)
  )

  ipcMain.handle('documents:open', (_e, { id }: { id: string }) =>
    documents.open(id)
  )

  ipcMain.handle('documents:save', (_e, { id, content }: { id: string; content: string }) => {
    documents.save(id, content)
  })

  ipcMain.handle('documents:create', (_e, params: {
    workspaceId: string; kind: string; title: string; parentId?: string
  }) => documents.create(params))

  ipcMain.handle('documents:versions', (_e, { id }: { id: string }) =>
    documents.versions(id)
  )

  ipcMain.handle('workspace:get', () => ({
    id: 'ws-default',
    type: 'authoring',
    root: process.env.HOME ?? '/'
  }))

  ipcMain.handle('settings:get', (_e, { key }: { key: string }) =>
    shellSettings.get(key)
  )

  ipcMain.handle('settings:set', (_e, { key, value }: { key: string; value: unknown }) => {
    shellSettings.set(key, value)
  })

  ipcMain.handle('modules:list', () => moduleRegistry.list())

  // Demand-activate a module (renderer requests activation, e.g. rail click)
  ipcMain.handle('modules:activate', async (_e, { id }: { id: string }) => {
    await moduleRegistry.ensureActivated(id)
  })

  // Toggle a module's enabled state (persist intent, optionally deactivate)
  ipcMain.handle('modules:setEnabled', async (_e, { id, enabled }: { id: string; enabled: boolean }) => {
    if (enabled) {
      moduleRegistry.enable(id)
    } else {
      moduleRegistry.disable(id)
      await moduleRegistry.deactivate(id)
    }
  })

  ipcMain.handle('commands:list', () => moduleRegistry.commands())

  // Demand-activate the owning module if the command handler isn't registered yet
  ipcMain.handle('commands:execute', async (_e, id: string, ...args: unknown[]) => {
    let h = getCommandHandler(id)
    if (!h) {
      const moduleId = moduleRegistry.findModuleForCommand(id)
      if (moduleId) {
        await moduleRegistry.ensureActivated(moduleId)
        h = getCommandHandler(id)
      }
    }
    if (!h) throw new Error(`Command not found: ${id}`)
    return h(...args)
  })

  // ── Search ────────────────────────────────────────────────────────────────
  ipcMain.handle('search:query', (_e, { query, limit }: { query: string; limit?: number }) =>
    searchService.search(query, 'ws-default', limit)
  )

  // ── Layout ────────────────────────────────────────────────────────────────
  ipcMain.handle('layout:get', () => layoutService.get())

  ipcMain.handle('layout:set', (_e, state: Record<string, unknown>) => {
    layoutService.set(state)
  })

  ipcMain.handle('layout:toggle', (_e, { zone }: { zone: 'sidebar' | 'inspector' }) =>
    layoutService.toggle(zone)
  )

  ipcMain.handle('layout:resize', (_e, { zone, px }: { zone: 'sidebar' | 'inspector'; px: number }) =>
    layoutService.resize(zone, px)
  )

  ipcMain.handle('layout:toggleZen', () => layoutService.toggleZen())

  // ── Secrets ───────────────────────────────────────────────────────────────
  ipcMain.handle('secrets:list', () => secretsService.list())

  ipcMain.handle('secrets:set', (_e, { name, value }: { name: string; value: string }) => {
    secretsService.set(name, value)
  })

  ipcMain.handle('secrets:delete', (_e, { name }: { name: string }) => {
    secretsService.delete(name)
  })

  // ── Theme ────────────────────────────────────────────────────────────────
  ipcMain.handle('theme:set', (_e, { mode }: { mode: ThemeMode }) => {
    // Persist
    shellSettings.set('theme', mode)
    // Sync Electron's native chrome (title bar, native dialogs)
    nativeTheme.themeSource = mode
    // Update window background color to prevent flash on next cold launch
    const bgColor = mode === 'light' || (mode === 'system' && !nativeTheme.shouldUseDarkColors)
      ? '#f5f3f0'
      : '#1e1e2e'
    for (const win of BrowserWindow.getAllWindows()) {
      win.setBackgroundColor(bgColor)
    }
  })
}
