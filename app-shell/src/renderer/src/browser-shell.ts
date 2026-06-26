import type {
  CommandCatalogEntry,
  AssetRecord,
  Doc,
  DocumentAnnotation,
  DocumentAnnotationSession,
  DocVersion,
  JobSnapshot,
  LayoutState,
  ShellApi,
  ThemeMode,
  Workspace
} from '@shared/module-contract'
import type { ModuleListItem } from '@shared/module-contract'
import { getModulePolicy, normalizeModuleEnabled, normalizeModuleVisible } from '@shared/module-policy'
import { STRUCTURAL_FOLDER_KIND_LABEL, UNCATEGORIZED_KIND_LABEL } from '@shared/document-kinds'
import type { AiChatMessage, AiConversation, AiContextCandidate, AiPromptTemplate, AiProposal, AiProvider, AiRun } from '@shared/ai'
import { AI_API_KEY_REQUIRED_MESSAGE, DEMO_MODE_SETTING_KEY, isDemoModeEnabled } from '@shared/demo-mode'
import { parseDocumentsAiStructuredProposalOutput } from '@shared/ai-writing-prompts'

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

const MODULE_ENABLED_KEY = 'modules.enabled'
const MODULE_VISIBLE_KEY = 'modules.visible'

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
    nodeType: 'folder',
    kind: null,
    title: 'Manuscript',
    icon: null,
    sortOrder: 0,
    content: '',
    contentFormat: 'markdown',
    sourcePath: null,
    sourceChecksum: null,
    metadataJson: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archivedAt: null
  },
  {
    id: 'demo-chapter-1',
    workspaceId: 'ws-browser-preview',
    parentId: 'demo-root',
    nodeType: 'document',
    kind: 'chapter',
    title: 'Chapter 1 - The Arrival',
    icon: '✨',
    sortOrder: 1,
    content: '# Chapter 1 - The Arrival\n\nShe stepped off the train into a city that had forgotten her name.',
    contentFormat: 'markdown',
    sourcePath: null,
    sourceChecksum: null,
    metadataJson: null,
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
  const settings = readBrowserSettings()
  const demoMode = isDemoModeEnabled(settings.get(DEMO_MODE_SETTING_KEY))
  const now = new Date().toISOString()
  const initialDocs = demoMode
    ? DEMO_DOCS.map(doc => ({ ...doc, createdAt: now, updatedAt: now }))
    : []
  const docs = new Map(initialDocs.map(doc => [doc.id, doc]))
  const annotationSessions = new Map<string, DocumentAnnotationSession>()
  const annotations = new Map<string, DocumentAnnotation>()
  let activeWorkspace: Workspace = {
    id: 'ws-browser-preview',
    name: demoMode ? 'Browser Preview' : 'Local Preview',
    type: 'authoring',
    root: '/',
    description: '',
    status: 'active',
    metadataJson: '{}',
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    archivedAt: null
  }
  const workspaceRows = new Map<string, Workspace>([[activeWorkspace.id, activeWorkspace]])
  const jobRows: JobSnapshot[] = []
  const aiRuns: AiRun[] = []
  const mockProvider: AiProvider = {
    providerId: 'mock-local',
    providerName: 'Mock Local Provider',
    secretName: null,
    baseUrl: null,
    defaultModel: 'mock-durable-context-v1',
    availableModels: ['mock-durable-context-v1'],
    supportsStreaming: false,
    supportsTools: false
  }
  const openAiProvider: AiProvider = {
    providerId: 'openai-responses',
    providerName: 'OpenAI Responses API',
    secretName: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1/responses',
    defaultModel: 'gpt-4.1-mini',
    availableModels: ['gpt-5.2', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano'],
    supportsStreaming: false,
    supportsTools: false
  }
  const aiProviders: AiProvider[] = demoMode ? [mockProvider, openAiProvider] : [openAiProvider]
  const aiTemplates: AiPromptTemplate[] = demoMode
    ? [{
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
        isProtected: false,
        createdAt: now,
        updatedAt: now,
        archivedAt: null
      }]
    : []
  const aiProposals: AiProposal[] = []
  const aiConversations: AiConversation[] = []
  const assetRows: AssetRecord[] = []
  let enabledModuleIds = normalizeEnabledIds(normalizePersistedModuleIds(settings.get(MODULE_ENABLED_KEY), MODULES.map(module => module.id)))
  let visibleModuleIds = normalizeVisibleIds(normalizePersistedModuleIds(settings.get(MODULE_VISIBLE_KEY), MODULES.map(module => module.id)), enabledModuleIds)

  function collectContext(activeDocumentId?: string | null): AiContextCandidate[] {
    const doc = activeDocumentId
      ? docs.get(activeDocumentId)
      : docs.get('demo-chapter-1') ?? Array.from(docs.values()).find(item => item.nodeType === 'document')
    if (!doc) return []

    return [{
      id: `active-document:${doc.id}`,
      sourceType: 'active-document',
      sourceId: doc.id,
      title: doc.title,
      kind: doc.nodeType === 'folder' ? STRUCTURAL_FOLDER_KIND_LABEL : doc.kind ?? UNCATEGORIZED_KIND_LABEL,
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
      list: async () => Array.from(docs.values()).filter(doc => !doc.archivedAt),
      listArchived: async (workspaceId) => Array.from(docs.values())
        .filter(doc => doc.workspaceId === workspaceId && Boolean(doc.archivedAt)),
      open: async (id) => {
        const doc = docs.get(id)
        if (!doc) throw new Error('Document not found.')
        return doc
      },
      save: async (id, content) => {
        const existing = docs.get(id)
        if (existing) {
          docs.set(id, { ...existing, content, updatedAt: new Date().toISOString() })
        }
      },
      update: async (id, patch) => {
        const existing = docs.get(id)
        if (!existing) throw new Error('Document not found.')
        let icon = existing.icon
        if (Object.prototype.hasOwnProperty.call(patch, 'icon')) {
          const nextIcon = patch.icon?.trim() ?? ''
          icon = nextIcon === '' ? null : nextIcon
        }
        const updated = {
          ...existing,
          title: patch.title?.trim() || existing.title,
          kind: Object.prototype.hasOwnProperty.call(patch, 'kind')
            ? patch.kind?.trim() || null
            : existing.kind,
          icon,
          updatedAt: new Date().toISOString()
        }
        docs.set(id, updated)
        return updated
      },
      updateMetadata: async (id, patch) => {
        const existing = docs.get(id)
        if (!existing) throw new Error('Document not found.')
        let metadata: Record<string, unknown> = {}
        if (existing.metadataJson) {
          try {
            const parsed = JSON.parse(existing.metadataJson) as unknown
            metadata = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
              ? parsed as Record<string, unknown>
              : {}
          } catch {
            metadata = {}
          }
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'targetWordCount')) {
          const value = patch.targetWordCount
          if (value === null || value === undefined) {
            delete metadata.targetWordCount
          } else if (Number.isFinite(value)) {
            metadata.targetWordCount = Math.max(0, Math.floor(value))
          }
        }
        const updated = {
          ...existing,
          metadataJson: JSON.stringify(metadata),
          updatedAt: new Date().toISOString()
        }
        docs.set(id, updated)
        return updated
      },
      duplicate: async (id, options = {}) => {
        const source = docs.get(id)
        if (!source || source.archivedAt) return []
        const now = new Date().toISOString()
        const affected = new Set<string>([id])
        if (options.recursive) {
          let changed = true
          while (changed) {
            changed = false
            for (const doc of docs.values()) {
              if (doc.parentId && affected.has(doc.parentId) && !doc.archivedAt && !affected.has(doc.id)) {
                affected.add(doc.id)
                changed = true
              }
            }
          }
        }

        const sourceRows = Array.from(docs.values())
          .filter(doc => affected.has(doc.id))
          .sort((left, right) => left.id === id ? -1 : right.id === id ? 1 : left.sortOrder - right.sortOrder)
        const idMap = new Map<string, string>()
        const duplicated: Doc[] = []
        for (const row of sourceRows) {
          const copyId = `demo-copy-${Date.now()}-${duplicated.length}`
          idMap.set(row.id, copyId)
          const parentId = row.id === id ? row.parentId : idMap.get(row.parentId ?? '') ?? null
          const copy: Doc = {
            ...row,
            id: copyId,
            parentId,
            title: row.id === id ? `${row.title} Copy` : row.title,
            sortOrder: row.id === id ? row.sortOrder + 1 : row.sortOrder,
            createdAt: now,
            updatedAt: now,
            archivedAt: null
          }
          docs.set(copy.id, copy)
          duplicated.push(copy)
        }
        return duplicated
      },
      delete: async (id, options = {}) => {
        const affected = new Set<string>([id])
        if (options.recursive) {
          let changed = true
          while (changed) {
            changed = false
            for (const doc of docs.values()) {
              if (doc.parentId && affected.has(doc.parentId) && !affected.has(doc.id)) {
                affected.add(doc.id)
                changed = true
              }
            }
          }
        }
        const deletedIds = Array.from(affected).filter(docId => docs.has(docId))
        for (const docId of deletedIds) {
          docs.delete(docId)
        }
        return deletedIds
      },
      create: async (params) => {
        const doc: Doc = {
          id: `demo-${Date.now()}`,
          workspaceId: params.workspaceId,
          parentId: params.parentId ?? null,
          nodeType: params.nodeType ?? 'document',
          kind: (params.nodeType ?? 'document') === 'folder' ? null : params.kind ?? null,
          title: params.title,
          icon: null,
          sortOrder: docs.size,
          content: '',
          contentFormat: 'markdown',
          sourcePath: null,
          sourceChecksum: null,
          metadataJson: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null
        }
        docs.set(doc.id, doc)
        return doc
      },
      move: async (params) => {
        const current = docs.get(params.id)
        if (!current || current.archivedAt) throw new Error(`Document not found: ${params.id}`)
        const parentId = params.parentId ?? null
        if (parentId) {
          const parent = docs.get(parentId)
          if (!parent || parent.archivedAt) throw new Error(`Parent document not found: ${parentId}`)
          if (parent.workspaceId !== current.workspaceId) throw new Error('Cannot move a document across workspaces.')

          const descendants = new Set<string>()
          let changed = true
          while (changed) {
            changed = false
            for (const doc of docs.values()) {
              if (doc.archivedAt || descendants.has(doc.id)) continue
              if (doc.parentId === current.id || (doc.parentId && descendants.has(doc.parentId))) {
                descendants.add(doc.id)
                changed = true
              }
            }
          }
          if (descendants.has(parentId) || parentId === current.id) {
            throw new Error('Cannot move a document inside itself.')
          }
        }

        const siblings = Array.from(docs.values())
          .filter(doc => doc.workspaceId === current.workspaceId && doc.parentId === parentId && !doc.archivedAt && doc.id !== current.id)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
        const insertIndex = Math.max(0, Math.min(params.sortOrder, siblings.length))
        siblings.splice(insertIndex, 0, { ...current, parentId })

        const sourceParentId = current.parentId
        const affectedParents = new Set<string | null>([sourceParentId, parentId])
        if (sourceParentId !== parentId) {
          const sourceSiblings = Array.from(docs.values())
            .filter(doc => doc.workspaceId === current.workspaceId && doc.parentId === sourceParentId && !doc.archivedAt && doc.id !== current.id)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
          sourceSiblings.forEach((doc, index) => {
            docs.set(doc.id, { ...doc, sortOrder: index, updatedAt: new Date().toISOString() })
          })
        }

        siblings.forEach((doc, index) => {
          docs.set(doc.id, { ...doc, parentId, sortOrder: index, updatedAt: new Date().toISOString() })
        })

        return Array.from(docs.values())
          .filter(doc => affectedParents.has(doc.parentId) && !doc.archivedAt)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
      },
      archive: async (id, options) => {
        const now = new Date().toISOString()
        const affected = new Set<string>([id])
        if (options?.recursive) {
          let changed = true
          while (changed) {
            changed = false
            for (const doc of docs.values()) {
              if (doc.parentId && affected.has(doc.parentId) && !affected.has(doc.id)) {
                affected.add(doc.id)
                changed = true
              }
            }
          }
        }

        for (const docId of affected) {
          const existing = docs.get(docId)
          if (existing) docs.set(docId, { ...existing, archivedAt: now, updatedAt: now })
        }
        return Array.from(affected)
      },
      restore: async (id, options) => {
        const now = new Date().toISOString()
        const affected = new Set<string>([id])
        const current = docs.get(id)
        let parentId = current?.parentId ?? null
        while (parentId) {
          const parent = docs.get(parentId)
          if (!parent) break
          if (parent.archivedAt) affected.add(parent.id)
          parentId = parent.parentId
        }
        if (options?.recursive ?? true) {
          let changed = true
          while (changed) {
            changed = false
            for (const doc of docs.values()) {
              if (doc.parentId && affected.has(doc.parentId) && doc.archivedAt && !affected.has(doc.id)) {
                affected.add(doc.id)
                changed = true
              }
            }
          }
        }
        const restored: Doc[] = []
        for (const docId of affected) {
          const existing = docs.get(docId)
          if (!existing) continue
          const updated = { ...existing, archivedAt: null, updatedAt: now }
          docs.set(docId, updated)
          restored.push(updated)
        }
        return restored
      },
      exportSubtree: async (id, params = {}) => ({
        rootDocumentId: id,
        targetDir: params.targetDir ?? '/browser-preview-export',
        filesWritten: [],
        foldersWritten: []
      }),
      versions: async (): Promise<DocVersion[]> => [],
      restoreVersion: async (versionId, params) => {
        const source = docs.get(versionId) ?? Array.from(docs.values()).find(doc => doc.nodeType === 'document')
        if (!source) throw new Error('Document not found.')
        if (params.mode === 'copy') {
          const restored: Doc = {
            ...source,
            id: `demo-restored-${Date.now()}`,
            title: params.title?.trim() || `${source.title} Restored`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          docs.set(restored.id, restored)
          return restored
        }
        return source
      },
      listAnnotationSessions: async (documentId) => Array.from(annotationSessions.values())
        .filter(session => session.documentId === documentId && !session.archivedAt),
      createAnnotationSession: async (params) => {
        const createdAt = new Date().toISOString()
        const session: DocumentAnnotationSession = {
          id: `browser-annotation-session-${Date.now()}`,
          workspaceId: params.workspaceId,
          documentId: params.documentId,
          documentVersionId: params.documentVersionId ?? null,
          title: params.title ?? 'Annotations',
          createdAt,
          updatedAt: createdAt,
          archivedAt: null
        }
        annotationSessions.set(session.id, session)
        return session
      },
      listAnnotations: async (documentId, options = {}) => Array.from(annotations.values())
        .filter(annotation => annotation.documentId === documentId)
        .filter(annotation => options.includeDeleted || !annotation.deletedAt)
        .filter(annotation => !options.statuses?.length || options.statuses.includes(annotation.status)),
      createAnnotation: async (params) => {
        const createdAt = new Date().toISOString()
        const annotation: DocumentAnnotation = {
          id: `browser-annotation-${Date.now()}`,
          sessionId: params.sessionId,
          workspaceId: params.workspaceId,
          documentId: params.documentId,
          note: params.note,
          color: params.color ?? 'yellow',
          status: 'active',
          targetJson: JSON.stringify(params.target),
          createdAt,
          updatedAt: createdAt,
          resolvedAt: null,
          deletedAt: null
        }
        annotations.set(annotation.id, annotation)
        return annotation
      },
      updateAnnotation: async (id, patch) => {
        const annotation = annotations.get(id)
        if (!annotation) throw new Error('Annotation not found.')
        const status = patch.status ?? annotation.status
        const updated: DocumentAnnotation = {
          ...annotation,
          note: patch.note ?? annotation.note,
          color: patch.color ?? annotation.color,
          status,
          targetJson: patch.target ? JSON.stringify(patch.target) : annotation.targetJson,
          updatedAt: new Date().toISOString(),
          resolvedAt: status === 'resolved' ? annotation.resolvedAt ?? new Date().toISOString() : null
        }
        annotations.set(id, updated)
        return updated
      },
      resolveAnnotation: async (id) => window.shell.documents.updateAnnotation(id, { status: 'resolved' }),
      reopenAnnotation: async (id) => window.shell.documents.updateAnnotation(id, { status: 'active' }),
      deleteAnnotation: async (id) => {
        const annotation = annotations.get(id)
        if (!annotation) throw new Error('Annotation not found.')
        const updated = { ...annotation, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        annotations.set(id, updated)
        return updated
      },
      onChanged: () => {}
    },
    workspace: {
      get: async () => activeWorkspace,
      list: async (params) => Array.from(workspaceRows.values()).filter(workspace => params?.includeArchived || !workspace.archivedAt),
      create: async (params) => {
        const createdAt = new Date().toISOString()
        const workspace: Workspace = {
          id: `ws-browser-${Date.now()}`,
          name: params.name,
          type: params.type ?? 'authoring',
          root: params.root ?? '/',
          description: '',
          status: 'active',
          metadataJson: '{}',
          createdAt,
          updatedAt: createdAt,
          lastOpenedAt: createdAt,
          archivedAt: null
        }
        workspaceRows.set(workspace.id, workspace)
        return workspace
      },
      importFolder: async (params = {}) => {
        const createdAt = new Date().toISOString()
        const workspace: Workspace = {
          id: `ws-browser-import-${Date.now()}`,
          name: params.name ?? 'Imported Folder',
          type: params.type ?? 'authoring',
          root: params.root ?? '/',
          description: '',
          status: 'active',
          metadataJson: '{}',
          createdAt,
          updatedAt: createdAt,
          lastOpenedAt: createdAt,
          archivedAt: null
        }
        workspaceRows.set(workspace.id, workspace)
        return workspace
      },
      duplicate: async (id, params = {}) => {
        const source = workspaceRows.get(id)
        if (!source) throw new Error(`Workspace not found: ${id}`)
        const createdAt = new Date().toISOString()
        const workspace: Workspace = {
          ...source,
          id: `ws-browser-copy-${Date.now()}`,
          name: params.name ?? `${source.name} Copy`,
          createdAt,
          updatedAt: createdAt,
          lastOpenedAt: createdAt,
          archivedAt: null
        }
        workspaceRows.set(workspace.id, workspace)
        for (const doc of Array.from(docs.values()).filter(item => item.workspaceId === source.id)) {
          const docId = `${doc.id}-copy-${Date.now()}`
          docs.set(docId, { ...doc, id: docId, workspaceId: workspace.id, parentId: null, createdAt, updatedAt: createdAt })
        }
        return workspace
      },
      archive: async (id) => {
        const workspace = workspaceRows.get(id)
        if (!workspace) throw new Error(`Workspace not found: ${id}`)
        const updated = { ...workspace, archivedAt: new Date().toISOString() }
        workspaceRows.set(id, updated)
        if (activeWorkspace.id === id) {
          activeWorkspace = Array.from(workspaceRows.values()).find(item => !item.archivedAt && item.id !== id)
            ?? await window.shell.workspace.create({ name: demoMode ? 'Browser Preview' : 'Local Preview', type: 'authoring', root: '/' })
        }
        return activeWorkspace
      },
      restore: async (id) => {
        const workspace = workspaceRows.get(id)
        if (!workspace) throw new Error(`Workspace not found: ${id}`)
        activeWorkspace = { ...workspace, archivedAt: null, updatedAt: new Date().toISOString() }
        workspaceRows.set(id, activeWorkspace)
        return activeWorkspace
      },
      delete: async (id) => {
        const workspace = workspaceRows.get(id)
        if (!workspace) throw new Error(`Workspace not found: ${id}`)
        workspaceRows.delete(id)
        for (const [docId, doc] of docs.entries()) {
          if (doc.workspaceId === id) docs.delete(docId)
        }
        if (activeWorkspace.id === id) {
          activeWorkspace = Array.from(workspaceRows.values()).find(item => !item.archivedAt)
            ?? await window.shell.workspace.create({ name: demoMode ? 'Browser Preview' : 'Local Preview', type: 'authoring', root: '/' })
        }
        return activeWorkspace
      },
      switch: async (id) => {
        const workspace = workspaceRows.get(id)
        if (workspace && !workspace.archivedAt) activeWorkspace = workspace
        return activeWorkspace
      },
      update: async (id, patch) => {
        const workspace = workspaceRows.get(id)
        if (!workspace) throw new Error(`Workspace not found: ${id}`)
        const updated: Workspace = {
          ...workspace,
          ...patch,
          name: patch.name?.trim() || workspace.name,
          type: patch.type?.trim() || workspace.type,
          root: patch.root?.trim() || workspace.root,
          description: patch.description ?? workspace.description,
          status: patch.status ?? workspace.status,
          metadataJson: patch.metadataJson ?? workspace.metadataJson,
          updatedAt: new Date().toISOString()
        }
        workspaceRows.set(id, updated)
        if (activeWorkspace.id === id) activeWorkspace = updated
        return updated
      },
      stats: async (workspaceId) => {
        const docRows = Array.from(docs.values()).filter(doc => doc.workspaceId === workspaceId && doc.nodeType !== 'folder')
        return {
          workspaceId,
          documents: docRows.filter(doc => !doc.archivedAt).length,
          archivedDocuments: docRows.filter(doc => doc.archivedAt).length,
          words: docRows.filter(doc => !doc.archivedAt).reduce((sum, doc) => sum + doc.content.trim().split(/\s+/).filter(Boolean).length, 0),
          assets: 0,
          conversations: 0,
          promptTemplates: 0,
          jobs: jobRows.filter(job => job.workspaceId === workspaceId).length
        }
      }
    },
    settings: {
      get: async (key) => settings.get(key),
      set: async (key, value) => {
        settings.set(key, value)
        writeBrowserSetting(key, value)
      }
    },
    modules: {
      list: async () => listBrowserModules(),
      activate: async () => {},
      setEnabled: async (id, enabled) => {
        const nextEnabled = normalizeModuleEnabled(id, enabled)
        if (nextEnabled) {
          enabledModuleIds = addModuleId(enabledModuleIds, id)
        } else {
          enabledModuleIds = enabledModuleIds.filter(item => item !== id)
        }
        visibleModuleIds = normalizeVisibleIds(visibleModuleIds, enabledModuleIds)
        settings.set(MODULE_ENABLED_KEY, enabledModuleIds)
        settings.set(MODULE_VISIBLE_KEY, visibleModuleIds)
        writeBrowserSetting(MODULE_ENABLED_KEY, enabledModuleIds)
        writeBrowserSetting(MODULE_VISIBLE_KEY, visibleModuleIds)
      },
      setVisible: async (id, visible) => {
        const enabled = enabledModuleIds.includes(id)
        const nextVisible = normalizeModuleVisible(id, visible, enabled)
        if (nextVisible) {
          visibleModuleIds = addModuleId(visibleModuleIds, id)
        } else {
          visibleModuleIds = visibleModuleIds.filter(item => item !== id)
        }
        settings.set(MODULE_VISIBLE_KEY, visibleModuleIds)
        writeBrowserSetting(MODULE_VISIBLE_KEY, visibleModuleIds)
      }
    },
    commands: {
      list: async () => COMMANDS.filter(command => !command.moduleId || enabledModuleIds.includes(command.moduleId)),
      execute: async () => {}
    },
    search: {
      query: async () => [],
      recents: async () => []
    },
    ai: {
      collectContext: async (params) => collectContext(params.activeDocumentId),
      invoke: async (params) => {
        const provider = aiProviders.find(item => item.providerId === params.providerId) ?? aiProviders[0]
        const now = new Date().toISOString()
        const shouldFailForMissingKey = !demoMode && provider.providerId !== 'mock-local'
        const run: AiRun = {
          id: `browser-run-${Date.now()}`,
          workspaceId: params.workspaceId,
          moduleId: params.moduleId,
          originType: params.originType,
          originId: params.originId ?? 'browser-preview',
          providerId: provider.providerId,
          model: params.model ?? provider.defaultModel,
          temperature: params.temperature ?? 0.7,
          status: shouldFailForMissingKey ? 'failed' : 'completed',
          inputSummary: params.prompt.slice(0, 240),
          outputText: shouldFailForMissingKey ? '' : `Browser ${provider.providerName} preview complete.\n\n${params.prompt}`,
          error: shouldFailForMissingKey ? AI_API_KEY_REQUIRED_MESSAGE : null,
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
      cancelInvocation: async () => false,
      preview: async (params) => {
        const provider = aiProviders.find(item => item.providerId === params.providerId) ?? aiProviders[0]
        const candidates = params.contextCandidates ?? collectContext()
        const includedTitles = candidates.filter(c => c.included).map(c => c.title)
        const renderedPrompt = `User prompt:\n${params.prompt}`
        return {
          providerId: provider.providerId,
          model: params.model ?? provider.defaultModel,
          temperature: params.temperature ?? 0.7,
          renderedPrompt,
          includedTitles,
          tokenEstimate: Math.max(1, Math.ceil(renderedPrompt.length / 4)),
          providerRequestSent: false
        }
      },
      providers: async () => aiProviders,
      runs: async (params) => aiRuns
        .filter(run => !params.moduleId || run.moduleId === params.moduleId)
        .slice(0, params.limit ?? 12),
      proposals: async (params) => aiProposals
        .filter(proposal =>
          proposal.workspaceId === params.workspaceId &&
          (!params.targetDocumentId || proposal.targetDocumentId === params.targetDocumentId) &&
          (!params.status || proposal.status === params.status)
        ),
      createProposal: async (params) => {
        const createdAt = new Date().toISOString()
        const run: AiRun = {
          id: `browser-run-${Date.now()}`,
          workspaceId: params.workspaceId,
          moduleId: params.runParams.moduleId,
          originType: params.runParams.originType,
          originId: params.runParams.originId ?? 'browser-proposal',
          providerId: params.runParams.providerId ?? 'openai-responses',
          model: params.runParams.model ?? 'gpt-4.1-mini',
          temperature: params.runParams.temperature ?? 0.7,
          status: 'completed',
          inputSummary: params.runParams.prompt.slice(0, 240),
          outputText: params.proposedText,
          error: null,
          createdAt,
          completedAt: createdAt
        }
        aiRuns.unshift(run)
        const proposal: AiProposal = {
          id: `browser-proposal-${Date.now()}`,
          workspaceId: params.workspaceId,
          runId: run.id,
          targetDocumentId: params.targetDocumentId,
          proposalType: params.proposalType,
          sourceText: params.sourceText,
          proposedText: params.proposedText,
          status: 'pending',
          createdAt,
          resolvedAt: null
        }
        aiProposals.unshift(proposal)
        return proposal
      },
      createProposalFromInvocation: async (params) => {
        const provider = aiProviders.find(item => item.providerId === params.runParams.providerId) ?? aiProviders[0]
        const createdAt = new Date().toISOString()
        if (!demoMode && provider.providerId !== 'mock-local') {
          throw new Error(AI_API_KEY_REQUIRED_MESSAGE)
        }

        const outputText = params.outputFormat === 'documents-proposal-json'
          ? JSON.stringify({ proposalText: 'Browser structured proposal text.' }, null, 2)
          : `Browser ${provider.providerName} preview complete.\n\n${params.runParams.prompt}`
        const run: AiRun = {
          id: `browser-run-${Date.now()}`,
          workspaceId: params.workspaceId,
          moduleId: params.runParams.moduleId,
          originType: params.runParams.originType,
          originId: params.runParams.originId ?? 'browser-proposal',
          providerId: provider.providerId,
          model: params.runParams.model ?? provider.defaultModel,
          temperature: params.runParams.temperature ?? 0.7,
          status: 'completed',
          inputSummary: params.runParams.prompt.slice(0, 240),
          outputText,
          error: null,
          createdAt,
          completedAt: createdAt
        }
        aiRuns.unshift(run)

        const proposal: AiProposal = {
          id: `browser-proposal-${Date.now()}`,
          workspaceId: params.workspaceId,
          runId: run.id,
          targetDocumentId: params.targetDocumentId,
          proposalType: params.proposalType,
          sourceText: params.sourceText,
          proposedText: params.outputFormat === 'documents-proposal-json'
            ? parseDocumentsAiStructuredProposalOutput(outputText)
            : outputText.trim(),
          status: 'pending',
          createdAt,
          resolvedAt: null
        }
        aiProposals.unshift(proposal)
        return proposal
      },
      acceptProposal: async (params) => {
        const proposal = aiProposals.find(item => item.id === params.id && item.workspaceId === params.workspaceId)
        if (!proposal) throw new Error('AI proposal not found.')
        proposal.status = 'accepted'
        proposal.resolvedAt = new Date().toISOString()
        return proposal
      },
      rejectProposal: async (params) => {
        const proposal = aiProposals.find(item => item.id === params.id && item.workspaceId === params.workspaceId)
        if (!proposal) throw new Error('AI proposal not found.')
        proposal.status = 'rejected'
        proposal.resolvedAt = new Date().toISOString()
        return proposal
      },
      templates: async () => aiTemplates.filter(template => !template.archivedAt),
      archivedTemplates: async () => aiTemplates.filter(template => template.archivedAt),
      saveTemplate: async (template) => {
        const existingIndex = aiTemplates.findIndex(item => item.id === template.id)
        if (existingIndex >= 0) {
          aiTemplates[existingIndex] = template
        } else {
          aiTemplates.unshift(template)
        }
        return template
      },
      renameTemplate: async (params) => {
        const template = aiTemplates.find(item => item.id === params.id && item.workspaceId === params.workspaceId)
        if (!template) throw new Error('Prompt template not found.')
        template.name = params.name.trim()
        template.updatedAt = new Date().toISOString()
        return template
      },
      duplicateTemplate: async (params) => {
        const template = aiTemplates.find(item => item.id === params.id && item.workspaceId === params.workspaceId)
        if (!template) throw new Error('Prompt template not found.')
        const copy = {
          ...template,
          id: `browser-template-${Date.now()}`,
          name: `${template.name} Copy`,
          isProtected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null
        }
        aiTemplates.unshift(copy)
        return copy
      },
      archiveTemplate: async (params) => {
        const template = aiTemplates.find(item => item.id === params.id && item.workspaceId === params.workspaceId)
        if (!template) throw new Error('Prompt template not found.')
        if (template.isProtected) throw new Error('Built-in action prompts cannot be archived.')
        template.archivedAt = new Date().toISOString()
        template.updatedAt = template.archivedAt
        return template
      },
      restoreTemplate: async (params) => {
        const template = aiTemplates.find(item => item.id === params.id && item.workspaceId === params.workspaceId)
        if (!template) throw new Error('Prompt template not found.')
        template.archivedAt = null
        template.updatedAt = new Date().toISOString()
        return template
      },
      deleteTemplate: async (params) => {
        const template = aiTemplates.find(item => item.id === params.id && item.workspaceId === params.workspaceId)
        if (!template) throw new Error('Prompt template not found.')
        if (template.isProtected) throw new Error('Built-in action prompts cannot be deleted.')
        const index = aiTemplates.findIndex(item => item.id === params.id && item.workspaceId === params.workspaceId)
        if (index >= 0) aiTemplates.splice(index, 1)
        return { id: params.id }
      },
      conversations: async (workspaceId) => aiConversations.filter(item => item.workspaceId === workspaceId && !item.archivedAt),
      archivedConversations: async (workspaceId) => aiConversations.filter(item => item.workspaceId === workspaceId && item.archivedAt),
      createConversation: async (params) => {
        const createdAt = new Date().toISOString()
        const conversation: AiConversation = {
          id: `browser-conversation-${Date.now()}`,
          workspaceId: params.workspaceId,
          title: params.title ?? 'New conversation',
          createdAt,
          updatedAt: createdAt,
          archivedAt: null,
          messages: []
        }
        aiConversations.unshift(conversation)
        return conversation
      },
      renameConversation: async (params) => {
        const conversation = aiConversations.find(item => item.id === params.id && item.workspaceId === params.workspaceId)
        if (!conversation) throw new Error('Conversation not found.')
        conversation.title = params.title.trim()
        conversation.updatedAt = new Date().toISOString()
        return conversation
      },
      archiveConversation: async (params) => {
        const conversation = aiConversations.find(item => item.id === params.id && item.workspaceId === params.workspaceId)
        if (!conversation) throw new Error('Conversation not found.')
        const now = new Date().toISOString()
        conversation.archivedAt = now
        conversation.updatedAt = now
        return conversation
      },
      restoreConversation: async (params) => {
        const conversation = aiConversations.find(item => item.id === params.id && item.workspaceId === params.workspaceId)
        if (!conversation) throw new Error('Conversation not found.')
        conversation.archivedAt = null
        conversation.updatedAt = new Date().toISOString()
        return conversation
      },
      deleteConversation: async (params) => {
        const index = aiConversations.findIndex(item => item.id === params.id && item.workspaceId === params.workspaceId)
        if (index < 0) throw new Error('Conversation not found.')
        aiConversations.splice(index, 1)
        return { id: params.id }
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
      list: async (params) => assetRows.filter(asset =>
        asset.workspaceLinks.some(link => link.workspaceId === params.workspaceId)
          && (params.includeArchived || !asset.archivedAt)
      ),
      open: async (id) => assetRows.find(asset => asset.id === id) ?? null,
      importFiles: async (params) => {
        const now = new Date().toISOString()
        const imported: AssetRecord[] = (params.filePaths ?? []).map((filePath, index) => ({
          id: `browser-asset-${Date.now()}-${index}`,
          label: filePath.split('/').pop() ?? 'Browser asset',
          originalName: filePath.split('/').pop() ?? 'Browser asset',
          filePath,
          extension: filePath.split('.').pop() ?? '',
          mimeType: 'application/octet-stream',
          mediaType: 'other',
          sizeBytes: 0,
          fileCreatedAt: now,
          fileModifiedAt: now,
          importedAt: now,
          updatedAt: now,
          archivedAt: null,
          checksum: null,
          thumbnailDataUrl: null,
          metadata: {},
          comments: '',
          tags: [],
          workspaceLinks: [{ workspaceId: params.workspaceId, role: 'imported', createdAt: now }],
          documentLinks: []
        }))
        assetRows.unshift(...imported)
        return imported
      },
      update: async (id, patch) => {
        const asset = assetRows.find(item => item.id === id)
        if (!asset) throw new Error('Asset not found.')
        asset.label = patch.label?.trim() || asset.label
        asset.comments = patch.comments ?? asset.comments
        asset.tags = patch.tags ?? asset.tags
        asset.updatedAt = new Date().toISOString()
        return asset
      },
      addWorkspaceLink: async (params) => {
        const asset = assetRows.find(item => item.id === params.assetId)
        if (!asset) throw new Error('Asset not found.')
        if (!asset.workspaceLinks.some(link => link.workspaceId === params.workspaceId && link.role === params.role)) {
          asset.workspaceLinks.push({ workspaceId: params.workspaceId, role: params.role, createdAt: new Date().toISOString() })
        }
        return asset
      },
      updateWorkspaceLink: async (params) => {
        const asset = assetRows.find(item => item.id === params.assetId)
        if (!asset) throw new Error('Asset not found.')
        asset.workspaceLinks = asset.workspaceLinks.filter(link =>
          !(link.workspaceId === params.workspaceId && link.role === params.fromRole)
            && !(link.workspaceId === params.workspaceId && link.role === params.toRole)
        )
        asset.workspaceLinks.push({ workspaceId: params.workspaceId, role: params.toRole, createdAt: new Date().toISOString() })
        return asset
      },
      removeWorkspaceLink: async (params) => {
        const asset = assetRows.find(item => item.id === params.assetId)
        if (!asset) throw new Error('Asset not found.')
        asset.workspaceLinks = asset.workspaceLinks.filter(link =>
          !(link.workspaceId === params.workspaceId && link.role === params.role)
        )
        return asset
      },
      addDocumentLink: async (params) => {
        const asset = assetRows.find(item => item.id === params.assetId)
        if (!asset) throw new Error('Asset not found.')
        asset.documentLinks = asset.documentLinks.filter(link => link.documentId !== params.documentId)
        asset.documentLinks.push({ documentId: params.documentId, relationType: params.relationType, createdAt: new Date().toISOString() })
        return asset
      },
      updateDocumentLink: async (params) => {
        const asset = assetRows.find(item => item.id === params.assetId)
        if (!asset) throw new Error('Asset not found.')
        asset.documentLinks = asset.documentLinks.filter(link => link.documentId !== params.documentId)
        asset.documentLinks.push({ documentId: params.documentId, relationType: params.toRelationType, createdAt: new Date().toISOString() })
        return asset
      },
      removeDocumentLink: async (params) => {
        const asset = assetRows.find(item => item.id === params.assetId)
        if (!asset) throw new Error('Asset not found.')
        asset.documentLinks = asset.documentLinks.filter(link =>
          !(link.documentId === params.documentId && link.relationType === params.relationType)
        )
        return asset
      },
      archive: async (id) => {
        const asset = assetRows.find(item => item.id === id)
        if (!asset) throw new Error('Asset not found.')
        asset.archivedAt = new Date().toISOString()
        return asset
      },
      restore: async (id) => {
        const asset = assetRows.find(item => item.id === id)
        if (!asset) throw new Error('Asset not found.')
        asset.archivedAt = null
        return asset
      },
      delete: async (id) => {
        const index = assetRows.findIndex(item => item.id === id)
        if (index >= 0) assetRows.splice(index, 1)
        return { id }
      },
      exportAssets: async (_ids, params = {}) => ({
        targetDir: params.targetDir ?? '/browser-preview-assets-export',
        filesWritten: [],
        manifestPath: `${params.targetDir ?? '/browser-preview-assets-export'}/assets-manifest.json`,
        missingFiles: []
      }),
      readPdf: async () => {
        throw new Error('PDF reading is only available in the Electron app.')
      },
      reveal: async () => {}
    },
    journal: {
      pickImportFiles: async () => [],
      exportEntries: async (_entries, params = {}) => ({
        targetDir: params.targetDir ?? '/browser-preview-journal-export',
        filesWritten: []
      })
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

  function listBrowserModules(): ModuleListItem[] {
    return MODULES.map(module => {
      const enabled = normalizeModuleEnabled(module.id, enabledModuleIds.includes(module.id))
      return {
        ...module,
        ...getModulePolicy(module.id),
        enabled,
        visible: normalizeModuleVisible(module.id, visibleModuleIds.includes(module.id), enabled),
        activated: false
      }
    })
  }
}

function normalizePersistedModuleIds(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback]
  return value.filter(item => typeof item === 'string')
}

function normalizeEnabledIds(ids: string[]): string[] {
  return MODULES
    .filter(module => normalizeModuleEnabled(module.id, ids.includes(module.id)))
    .map(module => module.id)
}

function normalizeVisibleIds(ids: string[], enabledIds: string[]): string[] {
  return MODULES
    .filter(module => normalizeModuleVisible(module.id, ids.includes(module.id), enabledIds.includes(module.id)))
    .map(module => module.id)
}

function addModuleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids : [...ids, id]
}

export function installBrowserShell(): void {
  if (window.shell) return
  window.shell = createBrowserShell()
}

function readBrowserSettings(): Map<string, unknown> {
  const settings = new Map<string, unknown>()
  if (typeof window === 'undefined') return settings

  try {
    const raw = window.localStorage.getItem('app-shell.browser.settings')
    if (raw) {
      for (const [key, value] of Object.entries(JSON.parse(raw) as Record<string, unknown>)) {
        settings.set(key, value)
      }
    }
  } catch {
    settings.clear()
  }

  if (!settings.has(DEMO_MODE_SETTING_KEY)) {
    settings.set(DEMO_MODE_SETTING_KEY, false)
  }
  return settings
}

function writeBrowserSetting(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem('app-shell.browser.settings')
    const settings = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    settings[key] = value
    window.localStorage.setItem('app-shell.browser.settings', JSON.stringify(settings))
  } catch {
    // Browser preview settings are convenience state only.
  }
}
