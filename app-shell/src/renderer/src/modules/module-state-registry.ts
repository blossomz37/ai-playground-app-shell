import { AiChatStateSlice } from '@shared/state/aichat-state'
import { AssetsStateSlice } from '@shared/state/assets-state'
import { DocumentsStateSlice } from '@shared/state/documents-state'
import { JournalStateSlice } from '@shared/state/journal-state'
import { TableViewStateSlice } from '@shared/state/tableview-state'
import { WebStateSlice } from '@shared/state/web-state'
import { WorkflowStateSlice } from '@shared/state/workflow-state'

type ModuleStateKey =
  | 'aichat'
  | 'assets'
  | 'documents'
  | 'journal'
  | 'tableview'
  | 'web'
  | 'workflow'

const registry = new Map<string, Map<ModuleStateKey, unknown>>()

function registerModuleState<T>(moduleId: string, key: ModuleStateKey, state: T): T {
  const moduleStates = registry.get(moduleId) ?? new Map<ModuleStateKey, unknown>()
  moduleStates.set(key, state)
  registry.set(moduleId, moduleStates)
  return state
}

export function getModuleState<T>(moduleId: string, key: ModuleStateKey): T {
  const state = registry.get(moduleId)?.get(key)
  if (!state) throw new Error(`Module state not registered: ${moduleId}/${key}`)
  return state as T
}

registerModuleState('shell.documents', 'documents', new DocumentsStateSlice({
  list: (workspaceId) => window.shell.documents.list(workspaceId),
  listArchived: (workspaceId) => window.shell.documents.listArchived(workspaceId),
  open: (id) => window.shell.documents.open(id),
  save: (id, content) => window.shell.documents.save(id, content),
  update: (id, patch) => window.shell.documents.update(id, patch),
  create: (params) => window.shell.documents.create(params),
  move: (params) => window.shell.documents.move(params),
  archive: (id, options) => window.shell.documents.archive(id, options),
  restore: (id, options) => window.shell.documents.restore(id, options),
  exportSubtree: (id, params) => window.shell.documents.exportSubtree(id, params),
  versions: (id) => window.shell.documents.versions(id),
  onChanged: (cb) => window.shell.documents.onChanged(cb),
  getSortMode: () => window.shell.settings.get('documents.tree.sortMode'),
  setSortMode: (mode) => window.shell.settings.set('documents.tree.sortMode', mode)
}))

registerModuleState('shell.aichat', 'aichat', new AiChatStateSlice({
  conversations: (workspaceId) => window.shell.ai.conversations(workspaceId),
  createConversation: (params) => window.shell.ai.createConversation(params),
  renameConversation: (params) => window.shell.ai.renameConversation(params),
  appendMessage: (params) => window.shell.ai.appendMessage(params)
}))

registerModuleState('shell.journal', 'journal', new JournalStateSlice())
registerModuleState('shell.assets', 'assets', new AssetsStateSlice({
  list: (params) => window.shell.assets.list(params),
  open: (id) => window.shell.assets.open(id),
  importFiles: (params) => window.shell.assets.importFiles(params),
  update: (id, patch) => window.shell.assets.update(id, patch),
  archive: (id) => window.shell.assets.archive(id),
  restore: (id) => window.shell.assets.restore(id),
  delete: (id) => window.shell.assets.delete(id),
  exportAssets: (ids, params) => window.shell.assets.exportAssets(ids, params),
  reveal: (path) => window.shell.assets.reveal(path)
}))
registerModuleState('shell.web', 'web', new WebStateSlice())
registerModuleState('shell.tableview', 'tableview', new TableViewStateSlice())
registerModuleState('shell.workflow', 'workflow', new WorkflowStateSlice())
