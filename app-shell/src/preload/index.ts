import { contextBridge, ipcRenderer } from 'electron'
import type { ShellApi } from '@shared/module-contract'

const api: ShellApi = {
  documents: {
    list:     (workspaceId) => ipcRenderer.invoke('documents:list', { workspaceId }),
    open:     (id)          => ipcRenderer.invoke('documents:open', { id }),
    save:     (id, content) => ipcRenderer.invoke('documents:save', { id, content }),
    create:   (params)      => ipcRenderer.invoke('documents:create', params),
    versions: (id)          => ipcRenderer.invoke('documents:versions', { id }),
    onChanged: (cb) => {
      ipcRenderer.on('documents:changed', (_event, id: string) => cb(id))
    }
  },

  workspace: {
    get: () => ipcRenderer.invoke('workspace:get')
  },

  settings: {
    get: (key)         => ipcRenderer.invoke('settings:get', { key }),
    set: (key, value)  => ipcRenderer.invoke('settings:set', { key, value })
  },

  modules: {
    list: () => ipcRenderer.invoke('modules:list'),
    activate: (id: string) => ipcRenderer.invoke('modules:activate', { id }),
    setEnabled: (id: string, enabled: boolean) => ipcRenderer.invoke('modules:setEnabled', { id, enabled })
  },

  commands: {
    list: () => ipcRenderer.invoke('commands:list'),
    execute: (id, ...args) => ipcRenderer.invoke('commands:execute', id, ...args)
  },

  notifications: {
    onNotify: (cb) => {
      ipcRenderer.on('shell:notify', (_event, toast) => cb(toast))
    }
  }
}

contextBridge.exposeInMainWorld('shell', api)
