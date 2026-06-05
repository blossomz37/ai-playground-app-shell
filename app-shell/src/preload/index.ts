import { contextBridge, ipcRenderer } from 'electron'
import type { ShellApi } from '@shared/module-contract'

const api: ShellApi = {
  documents: {
    list:     (workspaceId) => ipcRenderer.invoke('documents:list', { workspaceId }),
    open:     (id)          => ipcRenderer.invoke('documents:open', { id }),
    save:     (id, content) => ipcRenderer.invoke('documents:save', { id, content }),
    update:   (id, patch)   => ipcRenderer.invoke('documents:update', { id, patch }),
    create:   (params)      => ipcRenderer.invoke('documents:create', params),
    move:     (params)      => ipcRenderer.invoke('documents:move', params),
    archive:  (id, options) => ipcRenderer.invoke('documents:archive', { id, options }),
    versions: (id)          => ipcRenderer.invoke('documents:versions', { id }),
    onChanged: (cb) => {
      ipcRenderer.on('documents:changed', (_event, id: string) => cb(id))
    }
  },

  workspace: {
    get:    ()         => ipcRenderer.invoke('workspace:get'),
    list:   (params)   => ipcRenderer.invoke('workspace:list', params),
    create: (params)   => ipcRenderer.invoke('workspace:create', params),
    importFolder: (params) => ipcRenderer.invoke('workspace:importFolder', params),
    duplicate: (id, params) => ipcRenderer.invoke('workspace:duplicate', { id, params }),
    archive: (id) => ipcRenderer.invoke('workspace:archive', { id }),
    restore: (id) => ipcRenderer.invoke('workspace:restore', { id }),
    delete: (id) => ipcRenderer.invoke('workspace:delete', { id }),
    switch: (id)       => ipcRenderer.invoke('workspace:switch', { id })
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

  search: {
    query: (text, limit) => ipcRenderer.invoke('search:query', { query: text, limit })
  },

  ai: {
    collectContext: (params) => ipcRenderer.invoke('ai:context:collect', params),
    invoke: (params) => ipcRenderer.invoke('ai:invoke', params),
    providers: (params) => ipcRenderer.invoke('ai:providers', params),
    runs: (params) => ipcRenderer.invoke('ai:runs', params),
    templates: (workspaceId) => ipcRenderer.invoke('ai:templates', { workspaceId }),
    saveTemplate: (template) => ipcRenderer.invoke('ai:templates:save', template),
    renameTemplate: (params) => ipcRenderer.invoke('ai:templates:rename', params),
    conversations: (workspaceId) => ipcRenderer.invoke('ai:conversations', { workspaceId }),
    createConversation: (params) => ipcRenderer.invoke('ai:conversations:create', params),
    renameConversation: (params) => ipcRenderer.invoke('ai:conversations:rename', params),
    appendMessage: (params) => ipcRenderer.invoke('ai:messages:append', params)
  },

  assets: {
    importFiles: () => ipcRenderer.invoke('assets:importFiles'),
    reveal: (path) => ipcRenderer.invoke('assets:reveal', { path })
  },

  layout: {
    get: ()             => ipcRenderer.invoke('layout:get'),
    set: (state)        => ipcRenderer.invoke('layout:set', state),
    toggle: (zone)      => ipcRenderer.invoke('layout:toggle', { zone }),
    resize: (zone, px)  => ipcRenderer.invoke('layout:resize', { zone, px }),
    toggleZen: ()       => ipcRenderer.invoke('layout:toggleZen')
  },

  secrets: {
    list:   ()              => ipcRenderer.invoke('secrets:list'),
    set:    (name, value)   => ipcRenderer.invoke('secrets:set', { name, value }),
    delete: (name)          => ipcRenderer.invoke('secrets:delete', { name })
  },

  notifications: {
    onNotify: (cb) => {
      ipcRenderer.on('shell:notify', (_event, toast) => cb(toast))
    }
  },

  jobs: {
    list:     (params)        => ipcRenderer.invoke('jobs:list', params),
    submit:   (type, payload) => ipcRenderer.invoke('jobs:submit', { type, payload }),
    cancel:   (id)            => ipcRenderer.invoke('jobs:cancel', { id }),
    onChanged: (cb) => {
      ipcRenderer.on('jobs:changed', (_event, job) => cb(job))
    }
  },

  theme: {
    set: (mode) => ipcRenderer.invoke('theme:set', { mode })
  },

  capture: {
    moduleId: process.env['SHELL_CAPTURE_MODULE'],
    documentId: process.env['SHELL_CAPTURE_DOCUMENT']
  }
}

contextBridge.exposeInMainWorld('shell', api)
