import type {
  CommandCatalogEntry,
  Doc,
  DocVersion,
  LayoutState,
  ShellApi,
  ThemeMode
} from '@shared/module-contract'

const MODULES = [
  { id: 'shell.documents', name: 'Documents', icon: 'pen' },
  { id: 'shell.journal', name: 'Journal', icon: 'journal' },
  { id: 'shell.assets', name: 'Assets', icon: 'image' },
  { id: 'shell.workflow', name: 'Workflow Runner', icon: 'zap' },
  { id: 'shell.tableview', name: 'Table View', icon: 'table' },
  { id: 'shell.aichat', name: 'AI Chat', icon: 'bot' },
  { id: 'shell.web', name: 'Web', icon: 'globe' },
  { id: 'shell.promptstudio', name: 'Prompt Studio', icon: 'terminal' }
]

const COMMANDS: CommandCatalogEntry[] = [
  { id: 'documents.save', title: 'Save Document', keybinding: 'CmdOrCtrl+S', moduleId: 'shell.documents' },
  { id: 'shell.settings', title: 'Open Settings', keybinding: 'CmdOrCtrl+,', moduleId: 'shell.documents' },
  { id: 'shell.layout.toggleSidebar', title: 'Toggle Sidebar', keybinding: 'CmdOrCtrl+B', moduleId: 'shell.documents' },
  { id: 'shell.layout.toggleInspector', title: 'Toggle Inspector', keybinding: 'CmdOrCtrl+I', moduleId: 'shell.documents' },
  { id: 'shell.layout.zenMode', title: 'Zen Mode', keybinding: 'CmdOrCtrl+Shift+Z', moduleId: 'shell.documents' },
  { id: 'promptstudio.new', title: 'New Prompt Template', moduleId: 'shell.promptstudio' },
  { id: 'promptstudio.run', title: 'Run Template', moduleId: 'shell.promptstudio' },
  { id: 'promptstudio.batch', title: 'Batch Run Templates', moduleId: 'shell.promptstudio' }
]

const DEMO_DOCS: Doc[] = [
  {
    id: 'demo-root',
    workspaceId: 'ws-browser-preview',
    parentId: null,
    kind: 'folder',
    title: 'Manuscript',
    sortOrder: 0,
    content: '',
    contentFormat: 'markdown',
    sourcePath: null,
    sourceChecksum: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archivedAt: null
  },
  {
    id: 'demo-chapter-1',
    workspaceId: 'ws-browser-preview',
    parentId: 'demo-root',
    kind: 'chapter',
    title: 'Chapter 1 - The Arrival',
    sortOrder: 1,
    content: '# Chapter 1 - The Arrival\n\nShe stepped off the train into a city that had forgotten her name.',
    contentFormat: 'markdown',
    sourcePath: null,
    sourceChecksum: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archivedAt: null
  }
]

const DEFAULT_LAYOUT: LayoutState = {
  sidebarWidth: 240,
  inspectorWidth: 280,
  sidebarVisible: true,
  inspectorVisible: true,
  zenMode: false
}

function createBrowserShell(): ShellApi {
  let layout = { ...DEFAULT_LAYOUT }
  const settings = new Map<string, unknown>()
  const docs = new Map(DEMO_DOCS.map(doc => [doc.id, { ...doc }]))

  return {
    documents: {
      list: async () => Array.from(docs.values()),
      open: async (id) => docs.get(id) ?? DEMO_DOCS[1],
      save: async (id, content) => {
        const existing = docs.get(id)
        if (existing) {
          docs.set(id, { ...existing, content, updatedAt: new Date().toISOString() })
        }
      },
      create: async (params) => {
        const doc: Doc = {
          id: `demo-${Date.now()}`,
          workspaceId: params.workspaceId,
          parentId: params.parentId ?? null,
          kind: params.kind,
          title: params.title,
          sortOrder: docs.size,
          content: '',
          contentFormat: 'markdown',
          sourcePath: null,
          sourceChecksum: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null
        }
        docs.set(doc.id, doc)
        return doc
      },
      versions: async (): Promise<DocVersion[]> => [],
      onChanged: () => {}
    },
    workspace: {
      get: async () => ({ id: 'ws-browser-preview', type: 'authoring', root: '/' })
    },
    settings: {
      get: async (key) => settings.get(key),
      set: async (key, value) => {
        settings.set(key, value)
      }
    },
    modules: {
      list: async () => MODULES.map(module => ({ ...module, enabled: true, activated: false })),
      activate: async () => {},
      setEnabled: async () => {}
    },
    commands: {
      list: async () => COMMANDS,
      execute: async () => {}
    },
    search: {
      query: async () => []
    },
    layout: {
      get: async () => ({ ...layout }),
      set: async (state) => {
        layout = { ...layout, ...state }
      },
      toggle: async (zone) => {
        if (zone === 'sidebar') layout.sidebarVisible = !layout.sidebarVisible
        if (zone === 'inspector') layout.inspectorVisible = !layout.inspectorVisible
        return { ...layout }
      },
      resize: async (zone, px) => {
        if (zone === 'sidebar') layout.sidebarWidth = px
        if (zone === 'inspector') layout.inspectorWidth = px
        return { ...layout }
      },
      toggleZen: async () => {
        layout.zenMode = !layout.zenMode
        return { ...layout }
      }
    },
    secrets: {
      list: async () => [],
      set: async () => {},
      delete: async () => {}
    },
    notifications: {
      onNotify: () => {}
    },
    theme: {
      set: async (mode: ThemeMode) => {
        settings.set('theme', mode)
      }
    }
  }
}

export function installBrowserShell(): void {
  if (window.shell) return
  window.shell = createBrowserShell()
}
