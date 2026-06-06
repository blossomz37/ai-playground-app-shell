// Module contract types — the single interface agreement between shell and modules.
// Types only; no runtime code. Safe to import from main, preload, and renderer.
// Source of truth: 3-module-contract.md

import type {
  AiContextCandidate,
  AiInvokeResult,
  AiConversation,
  AiChatMessage,
  AiProvider,
  AiPromptTemplate,
  AiRun,
  AppendAiMessageParams,
  CollectAiContextParams,
  CreateAiConversationParams,
  InvokeAiParams,
  ListAiProvidersParams,
  ListAiRunsParams,
  RenameAiConversationParams,
  RenameAiPromptTemplateParams
} from './ai'

export type ThemeMode = 'light' | 'dark' | 'gray' | 'system'

export interface ModuleManifest {
  id: string
  name: string
  version: string
  requiredShellVersion: string
  activation: ActivationRule[]
  permissions: Capability[]
  contributes: {
    zones?: ZoneContributionDecl
    commands?: CommandDecl[]
    documentTypes?: DocumentTypeDecl[]
    jobs?: JobTypeDecl[]
    settings?: SettingsSchema
  }
}

export type ActivationRule =
  | { on: 'userEnable' }
  | { on: 'workspaceType'; type: string }
  | { on: 'fileType'; ext: string }
  | { on: 'command'; commandId: string }

export type Capability =
  | 'fs.read' | 'fs.write'
  | 'documents.read' | 'documents.write'
  | 'secrets.read'
  | 'ai.invoke' | 'net.fetch' | 'jobs.submit'

export interface ZoneContributionDecl {
  railEntry?: { icon: string; label: string }
  navigation?: { title: string }
  main?: { title: string }
  inspector?: { title: string }
  statusBar?: Array<{ id: string }>
}

export interface CommandDecl {
  id: string
  title: string
  keybinding?: string
  when?: string
}

// A declared command as surfaced to the shell UI (command palette, keybindings).
export interface CommandCatalogEntry {
  id: string
  title: string
  keybinding?: string
  moduleId: string
}

export interface DocumentTypeDecl {
  kind: string
  label: string
  icon?: string
}

export interface JobTypeDecl {
  type: string
  title: string
}

export type SettingsSchema = Record<string, {
  type: 'string' | 'number' | 'boolean'
  default?: unknown
  description?: string
}>

export interface Disposable {
  dispose(): void
}

// Shell document model — source of truth: 1-shell-spec.md §3
export interface Doc {
  id: string
  workspaceId: string
  parentId: string | null
  kind: string
  title: string
  icon: string | null
  sortOrder: number
  content: string
  contentFormat: string
  sourcePath: string | null
  sourceChecksum: string | null
  metadataJson: string | null
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface DocumentSourceMetadata {
  file?: string
  description?: string
  version?: string
  created?: string
  modified?: string
  author?: string
  status?: string
  related?: string[]
  word_count?: number
  raw?: Record<string, unknown>
  rawText?: string
}

export interface DocumentMetadataPatch {
  targetWordCount?: number | null
}

export interface DocVersion {
  id: string
  documentId: string
  content: string
  contentFormat: string
  createdAt: string
  label: string | null
}

export interface DocumentExportParams {
  targetDir?: string
}

export interface DocumentLifecycleOptions {
  recursive?: boolean
}

export interface DocumentExportResult {
  rootDocumentId: string
  targetDir: string
  filesWritten: string[]
  foldersWritten: string[]
}

export interface JournalEntry {
  id: string
  date: string
  fullDate: string
  title: string
  preview: string
  content: string
  created: string
  modified: string
  mood: string
  tags: string[]
  archivedAt: string | null
}

export interface JournalImportCandidate {
  entry: JournalEntry
  sourcePath: string
}

export interface JournalExportParams {
  targetDir?: string
}

export interface JournalExportResult {
  targetDir: string
  filesWritten: string[]
}

export interface Workspace {
  id: string
  name: string
  type: string
  root: string
  createdAt?: string
  updatedAt?: string
  lastOpenedAt?: string | null
  archivedAt?: string | null
}

export interface WorkspaceListParams {
  includeArchived?: boolean
}

export interface WorkspaceImportParams {
  root?: string
  name?: string
  type?: string
}

export interface WorkspaceDuplicateParams {
  name?: string
}

export type JobRunner = (payload: unknown, handle: JobHandle) => Promise<void>

export interface JobHandle {
  id: string
  get cancelled(): boolean
  cancel(): void
  progress(pct: number, message?: string): void
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface JobSnapshot {
  id: string
  workspaceId: string
  moduleId: string
  type: string
  title: string
  status: JobStatus
  progress: number
  message: string
  error: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  updatedAt: string
}

export interface InspectorSection {
  id: string
  title: string
  component: unknown // SvelteComponent — typed as unknown here; cast in renderer
}

export interface FsEntry {
  name: string
  isDir: boolean
}

export interface FsStat {
  size: number
  mtime: string
}

export interface SearchResult {
  documentId: string
  title: string
  snippet: string
  rank: number
}

export interface LayoutState {
  sidebarWidth: number
  inspectorWidth: number
  sidebarVisible: boolean
  inspectorVisible: boolean
  zenMode: boolean
}

export type AssetMediaType = 'image' | 'pdf' | 'audio' | 'epub' | 'document' | 'other'

export interface AssetMetadata {
  width?: number
  height?: number
  pageCount?: number | null
  title?: string | null
  author?: string | null
  [key: string]: unknown
}

export interface AssetWorkspaceLink {
  workspaceId: string
  role: string
  createdAt: string
}

export interface AssetDocumentLink {
  documentId: string
  relationType: string
  createdAt: string
}

export interface AssetRecord {
  id: string
  label: string
  originalName: string
  filePath: string | null
  extension: string
  mimeType: string
  mediaType: AssetMediaType
  sizeBytes: number
  fileCreatedAt: string | null
  fileModifiedAt: string | null
  importedAt: string
  updatedAt: string
  archivedAt: string | null
  checksum: string | null
  thumbnailDataUrl: string | null
  metadata: AssetMetadata
  comments: string
  tags: string[]
  workspaceLinks: AssetWorkspaceLink[]
  documentLinks: AssetDocumentLink[]
}

export interface AssetImportCandidate {
  name: string
  filePath: string
  extension: string
  sizeBytes: number
  importedAt: string
  image?: {
    width: number
    height: number
    thumbnailDataUrl: string | null
  }
  pdf?: {
    pageCount: number | null
    title: string | null
    author: string | null
    thumbnailDataUrl: string | null
  }
}

export interface AssetListParams {
  workspaceId: string
  includeArchived?: boolean
}

export interface AssetImportParams {
  workspaceId: string
  filePaths?: string[]
}

export interface AssetUpdatePatch {
  label?: string
  comments?: string
  tags?: string[]
}

export interface AssetWorkspaceLinkParams {
  assetId: string
  workspaceId: string
  role: string
}

export interface AssetWorkspaceLinkUpdateParams {
  assetId: string
  workspaceId: string
  fromRole: string
  toRole: string
}

export interface AssetDocumentLinkParams {
  assetId: string
  documentId: string
  relationType: string
}

export interface AssetDocumentLinkUpdateParams {
  assetId: string
  documentId: string
  fromRelationType: string
  toRelationType: string
}

export interface AssetExportParams {
  targetDir?: string
}

export interface AssetMissingFile {
  assetId: string
  filePath: string | null
  reason: string
}

export interface AssetExportResult {
  targetDir: string
  filesWritten: string[]
  manifestPath: string
  missingFiles: AssetMissingFile[]
}

export interface AssetPdfData {
  assetId: string
  fileName: string
  mimeType: 'application/pdf'
  pageCount: number | null
  dataBase64: string
}

export interface ModuleContext {
  moduleId: string

  commands: {
    register(id: string, handler: (...args: unknown[]) => unknown): Disposable
    execute(id: string, ...args: unknown[]): Promise<unknown>
  }

  settings: {
    get<T>(key: string): T | undefined
    set<T>(key: string, value: T): void
    onChange<T>(key: string, cb: (v: T) => void): Disposable
  }

  secrets: {
    get(name: string): Promise<string | undefined>
    list(): Promise<string[]>
  }

  fs: {
    readFile(path: string): Promise<string>
    writeFile(path: string, content: string): Promise<void>
    readDir(path: string): Promise<FsEntry[]>
    stat(path: string): Promise<FsStat | null>
    exists(path: string): Promise<boolean>
    mkdir(path: string): Promise<void>
    remove(path: string): Promise<void>
  }

  search: {
    query(text: string, opts?: { limit?: number }): Promise<SearchResult[]>
  }

  jobs: {
    defineRunner(jobType: string, run: JobRunner): Disposable
    submit(jobType: string, payload: unknown): JobHandle
  }

  events: {
    on(event: string, cb: (payload: unknown) => void): Disposable
    emit(event: string, payload: unknown): void
  }

  documents: {
    listArchived(workspaceId: string): Promise<Doc[]>
    open(id: string): Promise<Doc>
    save(id: string, content: unknown): Promise<void>
    update(id: string, patch: { title?: string; kind?: string; icon?: string | null }): Promise<Doc>
    updateMetadata(id: string, patch: DocumentMetadataPatch): Promise<Doc>
    duplicate(id: string, options?: DocumentLifecycleOptions): Promise<Doc[]>
    delete(id: string, options?: DocumentLifecycleOptions): Promise<string[]>
    create(params: { workspaceId: string; kind: string; title: string; parentId?: string | null; sortOrder?: number }): Promise<Doc>
    move(params: { id: string; parentId?: string | null; sortOrder: number }): Promise<Doc[]>
    archive(id: string, options?: { recursive?: boolean }): Promise<string[]>
    restore(id: string, options?: { recursive?: boolean }): Promise<Doc[]>
    exportSubtree(id: string, params?: DocumentExportParams): Promise<DocumentExportResult>
    versions(id: string): Promise<DocVersion[]>
    onChanged(cb: (id: string) => void): Disposable
  }

  notify(toast: { level: 'info' | 'warn' | 'error'; message: string }): void
  theme: { token(name: string): string }
  workspace: Workspace
}

export interface Module {
  manifest: ModuleManifest
  views?: {
    navigation?: unknown // SvelteComponent
    main?: unknown
    inspector?: unknown | InspectorSection[]
    statusBar?: Record<string, unknown>
  }
  activate(ctx: ModuleContext): void | Promise<void>
  deactivate?(): void | Promise<void>
}

// window.shell API shape — declared here, used in renderer/src/env.d.ts
export type { ModuleCategory, ModulePolicy } from './module-policy'

export interface ModuleListItem {
  id: string
  name: string
  icon: string
  category: import('./module-policy').ModuleCategory
  required: boolean
  canDisable: boolean
  canHide: boolean
  visible: boolean
  enabled: boolean
  activated: boolean
}

export interface ShellApi {
  documents: {
    list(workspaceId: string): Promise<Doc[]>
    listArchived(workspaceId: string): Promise<Doc[]>
    open(id: string): Promise<Doc>
    save(id: string, content: string): Promise<void>
    update(id: string, patch: { title?: string; kind?: string; icon?: string | null }): Promise<Doc>
    updateMetadata(id: string, patch: DocumentMetadataPatch): Promise<Doc>
    duplicate(id: string, options?: DocumentLifecycleOptions): Promise<Doc[]>
    delete(id: string, options?: DocumentLifecycleOptions): Promise<string[]>
    create(params: { workspaceId: string; kind: string; title: string; parentId?: string | null; sortOrder?: number }): Promise<Doc>
    move(params: { id: string; parentId?: string | null; sortOrder: number }): Promise<Doc[]>
    archive(id: string, options?: { recursive?: boolean }): Promise<string[]>
    restore(id: string, options?: { recursive?: boolean }): Promise<Doc[]>
    exportSubtree(id: string, params?: DocumentExportParams): Promise<DocumentExportResult>
    versions(id: string): Promise<DocVersion[]>
    onChanged(cb: (id: string) => void): void
  }
  workspace: {
    get(): Promise<Workspace>
    list(params?: WorkspaceListParams): Promise<Workspace[]>
    create(params: { name: string; type?: string; root?: string }): Promise<Workspace>
    importFolder(params?: WorkspaceImportParams): Promise<Workspace>
    duplicate(id: string, params?: WorkspaceDuplicateParams): Promise<Workspace>
    archive(id: string): Promise<Workspace>
    restore(id: string): Promise<Workspace>
    delete(id: string): Promise<Workspace>
    switch(id: string): Promise<Workspace>
  }
  settings: {
    get(key: string): Promise<unknown>
    set(key: string, value: unknown): Promise<void>
  }
  modules: {
    list(): Promise<ModuleListItem[]>
    activate(id: string): Promise<void>
    setEnabled(id: string, enabled: boolean): Promise<void>
    setVisible(id: string, visible: boolean): Promise<void>
  }
  commands: {
    list(): Promise<CommandCatalogEntry[]>
    execute(id: string, ...args: unknown[]): Promise<unknown>
  }
  search: {
    query(text: string, limit?: number): Promise<SearchResult[]>
  }
  ai: {
    collectContext(params: CollectAiContextParams): Promise<AiContextCandidate[]>
    invoke(params: InvokeAiParams): Promise<AiInvokeResult>
    providers(params: ListAiProvidersParams): Promise<AiProvider[]>
    runs(params: ListAiRunsParams): Promise<AiRun[]>
    templates(workspaceId: string): Promise<AiPromptTemplate[]>
    saveTemplate(template: AiPromptTemplate): Promise<AiPromptTemplate>
    renameTemplate(params: RenameAiPromptTemplateParams): Promise<AiPromptTemplate>
    conversations(workspaceId: string): Promise<AiConversation[]>
    createConversation(params: CreateAiConversationParams): Promise<AiConversation>
    renameConversation(params: RenameAiConversationParams): Promise<AiConversation>
    appendMessage(params: AppendAiMessageParams): Promise<AiChatMessage>
  }
  assets: {
    list(params: AssetListParams): Promise<AssetRecord[]>
    open(id: string): Promise<AssetRecord | null>
    importFiles(params: AssetImportParams): Promise<AssetRecord[]>
    update(id: string, patch: AssetUpdatePatch): Promise<AssetRecord>
    addWorkspaceLink(params: AssetWorkspaceLinkParams): Promise<AssetRecord>
    updateWorkspaceLink(params: AssetWorkspaceLinkUpdateParams): Promise<AssetRecord>
    removeWorkspaceLink(params: AssetWorkspaceLinkParams): Promise<AssetRecord>
    addDocumentLink(params: AssetDocumentLinkParams): Promise<AssetRecord>
    updateDocumentLink(params: AssetDocumentLinkUpdateParams): Promise<AssetRecord>
    removeDocumentLink(params: AssetDocumentLinkParams): Promise<AssetRecord>
    archive(id: string): Promise<AssetRecord>
    restore(id: string): Promise<AssetRecord>
    delete(id: string): Promise<{ id: string }>
    exportAssets(ids: string[], params?: AssetExportParams): Promise<AssetExportResult>
    readPdf(id: string): Promise<AssetPdfData>
    reveal(path: string): Promise<void>
  }
  journal: {
    pickImportFiles(filePaths?: string[]): Promise<JournalImportCandidate[]>
    exportEntries(entries: JournalEntry[], params?: JournalExportParams): Promise<JournalExportResult>
  }
  layout: {
    get(): Promise<LayoutState>
    set(state: Partial<LayoutState>): Promise<void>
    toggle(zone: 'sidebar' | 'inspector'): Promise<LayoutState>
    resize(zone: 'sidebar' | 'inspector', px: number): Promise<LayoutState>
    toggleZen(): Promise<LayoutState>
  }
  secrets: {
    list(): Promise<string[]>
    set(name: string, value: string): Promise<void>
    delete(name: string): Promise<void>
  }
  notifications: {
    onNotify(cb: (toast: { level: 'info' | 'warn' | 'error'; message: string }) => void): void
  }
  jobs: {
    list(params?: { workspaceId?: string; limit?: number }): Promise<JobSnapshot[]>
    submit(type: string, payload?: unknown): Promise<JobSnapshot | null>
    cancel(id: string): Promise<JobSnapshot | null>
    onChanged(cb: (job: JobSnapshot) => void): void
  }
  theme: {
    set(mode: ThemeMode): Promise<void>
  }
  capture?: {
    moduleId?: string
    documentId?: string
  }
}
