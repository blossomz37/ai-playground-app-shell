import type {
  CommandCatalogEntry,
  Doc,
  DocVersion,
  JobSnapshot,
  LayoutState,
  ShellApi,
  ThemeMode,
  Workspace
} from '@shared/module-contract'
import type { AiChatMessage, AiConversation, AiContextCandidate, AiPromptTemplate, AiProvider, AiRun } from '@shared/ai'

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
  { id: 'shell.jobs.toggle', title: 'Toggle Jobs Panel', moduleId: 'shell.documents' },
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
  inspectorVisible: false,
  zenMode: false
}

function createBrowserShell(): ShellApi {
  let layout = { ...DEFAULT_LAYOUT }
  const settings = new Map<string, unknown>()
  const docs = new Map(DEMO_DOCS.map(doc => [doc.id, { ...doc }]))
  const now = new Date().toISOString()
  let activeWorkspace: Workspace = {
    id: 'ws-browser-preview',
    name: 'Browser Preview',
    type: 'authoring',
    root: '/',
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    archivedAt: null
  }
  const workspaceRows = new Map<string, Workspace>([[activeWorkspace.id, activeWorkspace]])
  const jobRows: JobSnapshot[] = []
  const aiRuns: AiRun[] = []
  const aiProviders: AiProvider[] = [
    {
      providerId: 'mock-local',
      providerName: 'Mock Local Provider',
      secretName: null,
      baseUrl: null,
      defaultModel: 'mock-durable-context-v1',
      availableModels: ['mock-durable-context-v1'],
      supportsStreaming: false,
      supportsTools: false
    },
    {
      providerId: 'openai-responses',
      providerName: 'OpenAI Responses API',
      secretName: 'OPENAI_API_KEY',
      baseUrl: 'https://api.openai.com/v1/responses',
      defaultModel: 'gpt-4.1-mini',
      availableModels: ['gpt-5.2', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano'],
      supportsStreaming: false,
      supportsTools: false
    }
  ]
  const aiTemplates: AiPromptTemplate[] = [{
    id: 'browser-template-summary',
    workspaceId: 'ws-browser-preview',
    name: 'Summarize Document',
    description: 'Browser preview template',
    body: 'Summarize the included context in 3 useful bullet points.\n\n{{text}}',
    variables: ['text'],
    defaultModel: 'mock-durable-context-v1',
    defaultTemperature: 0.7,
    contextPolicy: { includeActiveDocument: true },
    tags: ['starter', 'summary'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }]
  const aiConversations: AiConversation[] = []

  function collectContext(activeDocumentId?: string | null): AiContextCandidate[] {
    const doc = docs.get(activeDocumentId ?? 'demo-chapter-1') ?? DEMO_DOCS[1]
    return [{
      id: `active-document:${doc.id}`,
      sourceType: 'active-document',
      sourceId: doc.id,
      title: doc.title,
      kind: doc.kind,
      excerpt: doc.content.replace(/\s+/g, ' ').slice(0, 180),
      content: doc.content,
      estimatedTokens: Math.max(1, Math.ceil(doc.content.split(/\s+/).filter(Boolean).length * 1.35)),
      included: true,
      priority: 100,
      reason: 'Currently open document'
    }]
  }

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
      update: async (id, patch) => {
        const existing = docs.get(id) ?? DEMO_DOCS[1]
        const updated = {
          ...existing,
          title: patch.title?.trim() || existing.title,
          kind: patch.kind?.trim() || existing.kind,
          updatedAt: new Date().toISOString()
        }
        docs.set(id, updated)
        return updated
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
      get: async () => activeWorkspace,
      list: async () => Array.from(workspaceRows.values()),
      create: async (params) => {
        const createdAt = new Date().toISOString()
        const workspace: Workspace = {
          id: `ws-browser-${Date.now()}`,
          name: params.name,
          type: params.type ?? 'authoring',
          root: params.root ?? '/',
          createdAt,
          updatedAt: createdAt,
          lastOpenedAt: createdAt,
          archivedAt: null
        }
        workspaceRows.set(workspace.id, workspace)
        return workspace
      },
      switch: async (id) => {
        activeWorkspace = workspaceRows.get(id) ?? activeWorkspace
        return activeWorkspace
      }
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
    ai: {
      collectContext: async (params) => collectContext(params.activeDocumentId),
      invoke: async (params) => {
        const provider = aiProviders.find(item => item.providerId === params.providerId) ?? aiProviders[0]
        const now = new Date().toISOString()
        const run: AiRun = {
          id: `browser-run-${Date.now()}`,
          workspaceId: params.workspaceId,
          moduleId: params.moduleId,
          originType: params.originType,
          originId: params.originId ?? 'browser-preview',
          providerId: provider.providerId,
          model: params.model ?? provider.defaultModel,
          temperature: params.temperature ?? 0.7,
          status: 'completed',
          inputSummary: params.prompt.slice(0, 240),
          outputText: `Browser ${provider.providerName} preview complete.\n\n${params.prompt}`,
          error: null,
          createdAt: now,
          completedAt: now
        }
        aiRuns.unshift(run)
        return {
          run,
          contextPack: {
            id: `browser-pack-${Date.now()}`,
            workspaceId: params.workspaceId,
            runId: run.id,
            createdAt: now,
            candidates: params.contextCandidates ?? collectContext(),
            renderedText: '',
            tokenEstimate: 1,
            packingStrategy: 'browser-preview'
          }
        }
      },
      providers: async () => aiProviders,
      runs: async (params) => aiRuns
        .filter(run => !params.moduleId || run.moduleId === params.moduleId)
        .slice(0, params.limit ?? 12),
      templates: async () => aiTemplates,
      saveTemplate: async (template) => {
        aiTemplates.unshift(template)
        return template
      },
      conversations: async () => aiConversations,
      createConversation: async (params) => {
        const createdAt = new Date().toISOString()
        const conversation: AiConversation = {
          id: `browser-conversation-${Date.now()}`,
          workspaceId: params.workspaceId,
          title: params.title ?? 'New conversation',
          createdAt,
          updatedAt: createdAt,
          messages: []
        }
        aiConversations.unshift(conversation)
        return conversation
      },
      appendMessage: async (params) => {
        const message: AiChatMessage = {
          id: `browser-message-${Date.now()}`,
          workspaceId: params.workspaceId,
          conversationId: params.conversationId,
          role: params.role,
          content: params.content,
          runId: params.runId ?? null,
          createdAt: new Date().toISOString()
        }
        const conversation = aiConversations.find(item => item.id === params.conversationId)
        if (conversation) {
          conversation.messages.push(message)
          conversation.updatedAt = message.createdAt
          if (conversation.title === 'New conversation' && params.role === 'user') {
            conversation.title = params.content.trim().slice(0, 48) || conversation.title
          }
        }
        return message
      }
    },
    assets: {
      importFiles: async () => [],
      reveal: async () => {}
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
    jobs: {
      list: async () => jobRows,
      submit: async (type) => {
        const createdAt = new Date().toISOString()
        const job: JobSnapshot = {
          id: `browser-job-${Date.now()}`,
          workspaceId: activeWorkspace.id,
          moduleId: 'browser',
          type,
          title: type.split('.').join(' '),
          status: 'completed',
          progress: 100,
          message: 'Completed',
          error: null,
          createdAt,
          startedAt: createdAt,
          completedAt: createdAt,
          updatedAt: createdAt
        }
        jobRows.unshift(job)
        return job
      },
      cancel: async (id) => jobRows.find(job => job.id === id) ?? null,
      onChanged: () => {}
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
