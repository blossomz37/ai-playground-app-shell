import { contextBridge, ipcRenderer } from 'electron'
import type { ShellApi } from '@shared/module-contract'

const api: ShellApi = {
  documents: {
    list:     (workspaceId) => ipcRenderer.invoke('documents:list', { workspaceId }),
    listArchived: (workspaceId) => ipcRenderer.invoke('documents:listArchived', { workspaceId }),
    open:     (id)          => ipcRenderer.invoke('documents:open', { id }),
    save:     (id, content, options) => ipcRenderer.invoke('documents:save', { id, content, options }),
    update:   (id, patch)   => ipcRenderer.invoke('documents:update', { id, patch }),
    updateMetadata: (id, patch) => ipcRenderer.invoke('documents:updateMetadata', { id, patch }),
    duplicate: (id, options) => ipcRenderer.invoke('documents:duplicate', { id, options }),
    delete: (id, options) => ipcRenderer.invoke('documents:delete', { id, options }),
    create:   (params)      => ipcRenderer.invoke('documents:create', params),
    move:     (params)      => ipcRenderer.invoke('documents:move', params),
    archive:  (id, options) => ipcRenderer.invoke('documents:archive', { id, options }),
    restore:  (id, options) => ipcRenderer.invoke('documents:restore', { id, options }),
    exportSubtree: (id, params) => ipcRenderer.invoke('documents:exportSubtree', { id, params }),
    versions: (id)          => ipcRenderer.invoke('documents:versions', { id }),
    restoreVersion: (versionId, params) => ipcRenderer.invoke('documents:restoreVersion', { versionId, params }),
    listAnnotationSessions: (documentId) => ipcRenderer.invoke('documents:listAnnotationSessions', { documentId }),
    createAnnotationSession: (params) => ipcRenderer.invoke('documents:createAnnotationSession', params),
    listAnnotations: (documentId, options) => ipcRenderer.invoke('documents:listAnnotations', { documentId, options }),
    createAnnotation: (params) => ipcRenderer.invoke('documents:createAnnotation', params),
    updateAnnotation: (id, patch) => ipcRenderer.invoke('documents:updateAnnotation', { id, patch }),
    resolveAnnotation: (id) => ipcRenderer.invoke('documents:resolveAnnotation', { id }),
    reopenAnnotation: (id) => ipcRenderer.invoke('documents:reopenAnnotation', { id }),
    deleteAnnotation: (id) => ipcRenderer.invoke('documents:deleteAnnotation', { id }),
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
    setEnabled: (id: string, enabled: boolean) => ipcRenderer.invoke('modules:setEnabled', { id, enabled }),
    setVisible: (id: string, visible: boolean) => ipcRenderer.invoke('modules:setVisible', { id, visible })
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
    cancelInvocation: (requestId) => ipcRenderer.invoke('ai:cancelInvocation', { requestId }),
    preview: (params) => ipcRenderer.invoke('ai:preview', params),
    providers: (params) => ipcRenderer.invoke('ai:providers', params),
    runs: (params) => ipcRenderer.invoke('ai:runs', params),
    proposals: (params) => ipcRenderer.invoke('ai:proposals', params),
    createProposal: (params) => ipcRenderer.invoke('ai:proposals:create', params),
    createProposalFromInvocation: (params) => ipcRenderer.invoke('ai:proposals:createFromInvocation', params),
    acceptProposal: (params) => ipcRenderer.invoke('ai:proposals:accept', params),
    rejectProposal: (params) => ipcRenderer.invoke('ai:proposals:reject', params),
    templates: (workspaceId) => ipcRenderer.invoke('ai:templates', { workspaceId }),
    archivedTemplates: (workspaceId) => ipcRenderer.invoke('ai:templates:archived', { workspaceId }),
    saveTemplate: (template) => ipcRenderer.invoke('ai:templates:save', template),
    renameTemplate: (params) => ipcRenderer.invoke('ai:templates:rename', params),
    duplicateTemplate: (params) => ipcRenderer.invoke('ai:templates:duplicate', params),
    archiveTemplate: (params) => ipcRenderer.invoke('ai:templates:archive', params),
    restoreTemplate: (params) => ipcRenderer.invoke('ai:templates:restore', params),
    deleteTemplate: (params) => ipcRenderer.invoke('ai:templates:delete', params),
    conversations: (workspaceId) => ipcRenderer.invoke('ai:conversations', { workspaceId }),
    archivedConversations: (workspaceId) => ipcRenderer.invoke('ai:conversations:archived', { workspaceId }),
    createConversation: (params) => ipcRenderer.invoke('ai:conversations:create', params),
    renameConversation: (params) => ipcRenderer.invoke('ai:conversations:rename', params),
    archiveConversation: (params) => ipcRenderer.invoke('ai:conversations:archive', params),
    restoreConversation: (params) => ipcRenderer.invoke('ai:conversations:restore', params),
    deleteConversation: (params) => ipcRenderer.invoke('ai:conversations:delete', params),
    appendMessage: (params) => ipcRenderer.invoke('ai:messages:append', params)
  },

  assets: {
    list: (params) => ipcRenderer.invoke('assets:list', params),
    open: (id) => ipcRenderer.invoke('assets:open', { id }),
    importFiles: (params) => ipcRenderer.invoke('assets:importFiles', params),
    update: (id, patch) => ipcRenderer.invoke('assets:update', { id, patch }),
    addWorkspaceLink: (params) => ipcRenderer.invoke('assets:addWorkspaceLink', params),
    updateWorkspaceLink: (params) => ipcRenderer.invoke('assets:updateWorkspaceLink', params),
    removeWorkspaceLink: (params) => ipcRenderer.invoke('assets:removeWorkspaceLink', params),
    addDocumentLink: (params) => ipcRenderer.invoke('assets:addDocumentLink', params),
    updateDocumentLink: (params) => ipcRenderer.invoke('assets:updateDocumentLink', params),
    removeDocumentLink: (params) => ipcRenderer.invoke('assets:removeDocumentLink', params),
    archive: (id) => ipcRenderer.invoke('assets:archive', { id }),
    restore: (id) => ipcRenderer.invoke('assets:restore', { id }),
    delete: (id) => ipcRenderer.invoke('assets:delete', { id }),
    exportAssets: (ids, params) => ipcRenderer.invoke('assets:exportAssets', { ids, params }),
    readPdf: (id) => ipcRenderer.invoke('assets:readPdf', { id }),
    reveal: (path) => ipcRenderer.invoke('assets:reveal', { path })
  },

  journal: {
    pickImportFiles: (filePaths) => ipcRenderer.invoke('journal:pickImportFiles', { filePaths }),
    exportEntries: (entries, params) => ipcRenderer.invoke('journal:exportEntries', { entries, params })
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
