import { ipcMain } from 'electron'
import { documents } from './core/documents'
import { createSettingsStore } from './core/settings'
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

  ipcMain.handle('commands:list', () => moduleRegistry.commands())

  ipcMain.handle('commands:execute', (_e, id: string, ...args: unknown[]) => {
    const h = getCommandHandler(id)
    if (!h) throw new Error(`Command not found: ${id}`)
    return h(...args)
  })
}
