import { AiChatStateSlice } from '@shared/state/aichat-state'
import { AssetsStateSlice } from '@shared/state/assets-state'
import { DocumentsStateSlice } from '@shared/state/documents-state'
import { JournalStateSlice } from '@shared/state/journal-state'
import { TableViewStateSlice } from '@shared/state/tableview-state'
import { WebStateSlice } from '@shared/state/web-state'
import { WorkflowStateSlice } from '@shared/state/workflow-state'
import type { ModuleListItem } from '@shared/module-contract'

type ModuleStateKey =
  | 'aichat'
  | 'assets'
  | 'documents'
  | 'journal'
  | 'tableview'
  | 'web'
  | 'workflow'

type StateFactory<T = unknown> = () => T

const factories = new Map<string, Map<ModuleStateKey, StateFactory>>()
const instances = new Map<string, Map<ModuleStateKey, unknown>>()
let moduleSnapshot = new Map<string, ModuleListItem>()

function registerModuleState<T>(moduleId: string, key: ModuleStateKey, create: StateFactory<T>): void {
  const moduleFactories = factories.get(moduleId) ?? new Map<ModuleStateKey, StateFactory>()
  moduleFactories.set(key, create)
  factories.set(moduleId, moduleFactories)
}

export function getModuleState<T>(moduleId: string, key: ModuleStateKey): T {
  const existing = instances.get(moduleId)?.get(key)
  if (existing) return existing as T

  const moduleInfo = moduleSnapshot.get(moduleId)
  if (moduleInfo && moduleInfo.category === 'custom' && !moduleInfo.enabled) {
    throw new Error(`Module state blocked because module is disabled: ${moduleId}/${key}`)
  }

  const factory = factories.get(moduleId)?.get(key)
  if (!factory) throw new Error(`Module state not registered: ${moduleId}/${key}`)

  const state = factory()
  const moduleStates = instances.get(moduleId) ?? new Map<ModuleStateKey, unknown>()
  moduleStates.set(key, state)
  instances.set(moduleId, moduleStates)
  return state as T
}

export function setModulePolicySnapshot(modules: ModuleListItem[]): void {
  moduleSnapshot = new Map(modules.map(module => [module.id, module]))
}

registerModuleState('shell.documents', 'documents', () => new DocumentsStateSlice({
  list: (workspaceId) => window.shell.documents.list(workspaceId),
  listArchived: (workspaceId) => window.shell.documents.listArchived(workspaceId),
  open: (id) => window.shell.documents.open(id),
  save: (id, content) => window.shell.documents.save(id, content),
  update: (id, patch) => window.shell.documents.update(id, patch),
  updateMetadata: (id, patch) => window.shell.documents.updateMetadata(id, patch),
  duplicate: (id, options) => window.shell.documents.duplicate(id, options),
  delete: (id, options) => window.shell.documents.delete(id, options),
  create: (params) => window.shell.documents.create(params),
  move: (params) => window.shell.documents.move(params),
  archive: (id, options) => window.shell.documents.archive(id, options),
  restore: (id, options) => window.shell.documents.restore(id, options),
  exportSubtree: (id, params) => window.shell.documents.exportSubtree(id, params),
  versions: (id) => window.shell.documents.versions(id),
  restoreVersion: (versionId, params) => window.shell.documents.restoreVersion(versionId, params),
  listAnnotationSessions: (documentId) => window.shell.documents.listAnnotationSessions(documentId),
  createAnnotationSession: (params) => window.shell.documents.createAnnotationSession(params),
  listAnnotations: (documentId, options) => window.shell.documents.listAnnotations(documentId, options),
  createAnnotation: (params) => window.shell.documents.createAnnotation(params),
  updateAnnotation: (id, patch) => window.shell.documents.updateAnnotation(id, patch),
  resolveAnnotation: (id) => window.shell.documents.resolveAnnotation(id),
  reopenAnnotation: (id) => window.shell.documents.reopenAnnotation(id),
  deleteAnnotation: (id) => window.shell.documents.deleteAnnotation(id),
  onChanged: (cb) => window.shell.documents.onChanged(cb),
  getSortMode: () => window.shell.settings.get('documents.tree.sortMode'),
  setSortMode: (mode) => window.shell.settings.set('documents.tree.sortMode', mode)
}))

registerModuleState('shell.aichat', 'aichat', () => new AiChatStateSlice({
  conversations: (workspaceId) => window.shell.ai.conversations(workspaceId),
  archivedConversations: (workspaceId) => window.shell.ai.archivedConversations(workspaceId),
  createConversation: (params) => window.shell.ai.createConversation(params),
  renameConversation: (params) => window.shell.ai.renameConversation(params),
  archiveConversation: (params) => window.shell.ai.archiveConversation(params),
  restoreConversation: (params) => window.shell.ai.restoreConversation(params),
  deleteConversation: (params) => window.shell.ai.deleteConversation(params),
  appendMessage: (params) => window.shell.ai.appendMessage(params)
}))

registerModuleState('shell.journal', 'journal', () => new JournalStateSlice())
registerModuleState('shell.assets', 'assets', () => new AssetsStateSlice({
  list: (params) => window.shell.assets.list(params),
  open: (id) => window.shell.assets.open(id),
  importFiles: (params) => window.shell.assets.importFiles(params),
  update: (id, patch) => window.shell.assets.update(id, patch),
  addWorkspaceLink: (params) => window.shell.assets.addWorkspaceLink(params),
  updateWorkspaceLink: (params) => window.shell.assets.updateWorkspaceLink(params),
  removeWorkspaceLink: (params) => window.shell.assets.removeWorkspaceLink(params),
  addDocumentLink: (params) => window.shell.assets.addDocumentLink(params),
  updateDocumentLink: (params) => window.shell.assets.updateDocumentLink(params),
  removeDocumentLink: (params) => window.shell.assets.removeDocumentLink(params),
  archive: (id) => window.shell.assets.archive(id),
  restore: (id) => window.shell.assets.restore(id),
  delete: (id) => window.shell.assets.delete(id),
  exportAssets: (ids, params) => window.shell.assets.exportAssets(ids, params),
  readPdf: (id) => window.shell.assets.readPdf(id),
  reveal: (path) => window.shell.assets.reveal(path)
}))
registerModuleState('shell.web', 'web', () => new WebStateSlice())
registerModuleState('shell.tableview', 'tableview', () => new TableViewStateSlice())
registerModuleState('shell.workflow', 'workflow', () => new WorkflowStateSlice())
