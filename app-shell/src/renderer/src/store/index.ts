import { writable, readable, get } from 'svelte/store'
import type { DocumentAnnotationPatch, DocumentAnnotationTarget, DocumentKindOption, DocumentMetadataPatch, DocumentNodeType, DocumentSaveOptions, DocumentVersionRestoreParams, ThemeMode, Workspace, WorkspaceStats, WorkspaceUpdatePatch } from '@shared/module-contract'
import type { DocumentDropPlacement, DocumentsSortMode, DocumentsState, DocumentsStateSlice } from '@shared/state/documents-state'
import { DEFAULT_DOCUMENT_KIND_OPTIONS, normalizeDocumentKindOptions, slugifyDocumentKindLabel } from '@shared/document-kinds'
import { getModuleState } from '../modules/module-state-registry'
import { loadCommands } from './commands'
import { addToast, initToasts } from './toasts'
import { loadJobs } from './jobs'
import { DEMO_MODE_SETTING_KEY, isDemoModeEnabled } from '@shared/demo-mode'
import { activeModuleId } from './active-module'
import { PROJECTS_MODULE_ID, loadModules } from './modules'

export type { ThemeMode }

export const workspaceId   = writable<string>('ws-default')
export const activeWorkspace = writable<Workspace | null>(null)
export const workspaces = writable<Workspace[]>([])
export const archivedWorkspaces = writable<Workspace[]>([])
export const documentKindOptions = writable<DocumentKindOption[]>(DEFAULT_DOCUMENT_KIND_OPTIONS)
export { activeModuleId } from './active-module'

export const documentsState = getModuleState<DocumentsStateSlice>('shell.documents', 'documents')

function fromDocumentsState<T>(selector: (state: DocumentsState) => T) {
  return readable(selector(documentsState.getSnapshot()), (set) =>
    documentsState.subscribe((state) => set(selector(state)))
  )
}

export const documents = fromDocumentsState(state => state.documents)
export const archivedDocuments = fromDocumentsState(state => state.archivedDocuments)
export const activeDocId = fromDocumentsState(state => state.activeDocId)
export const activeDoc = fromDocumentsState(state => state.activeDoc)
export const editorContent = fromDocumentsState(state => state.editorContent)
export const isDirty = fromDocumentsState(state => state.isDirty)
export const versions = fromDocumentsState(state => state.versions)
export const annotationSessions = fromDocumentsState(state => state.annotationSessions)
export const annotations = fromDocumentsState(state => state.annotations)
export const docTree = fromDocumentsState(state => state.docTree)
export const archivedDocTree = fromDocumentsState(state => state.archivedDocTree)
export const documentsSortMode = fromDocumentsState(state => state.sortMode)

export interface EditorSettings {
  fontFamily: string
  fontSize: string
  spellcheck: boolean
}

export const editorSettings = writable<EditorSettings>({
  fontFamily: 'var(--font-serif)',
  fontSize: 'var(--font-size-lg)',
  spellcheck: true
})

// ── Theme ──────────────────────────────────────────────────────────────────
export const themeMode = writable<ThemeMode>('system')
export const demoModeEnabled = writable(false)

let transitionTimer: ReturnType<typeof setTimeout> | null = null

/** Apply a theme mode to the DOM. Sets data-theme on <html> or removes it for system. */
export function applyTheme(mode: ThemeMode): void {
  const html = document.documentElement

  // Enable smooth transition
  html.classList.add('theme-transitioning')
  if (transitionTimer) clearTimeout(transitionTimer)
  transitionTimer = setTimeout(() => {
    html.classList.remove('theme-transitioning')
    transitionTimer = null
  }, 350)

  if (mode === 'system') {
    html.removeAttribute('data-theme')
  } else {
    html.setAttribute('data-theme', mode)
  }

  themeMode.set(mode)
}

/** Load persisted theme preference and apply it. */
async function loadThemePreference(): Promise<void> {
  try {
    const saved = await window.shell.settings.get('theme') as ThemeMode | undefined
    const mode = saved ?? 'system'
    applyTheme(mode)
  } catch {
    // Settings may not exist yet — keep system default
  }
}

/** Set, persist, and sync theme preference with the main process. */
export async function setThemePreference(mode: ThemeMode): Promise<void> {
  applyTheme(mode)
  // Persist via generic settings and sync native theme via dedicated IPC
  await Promise.all([
    window.shell.settings.set('theme', mode),
    window.shell.theme.set(mode)
  ])
}

// Listen for OS theme changes so system mode updates live
if (typeof window !== 'undefined' && window.matchMedia) {
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  mql.addEventListener('change', () => {
    // Only react if we're in system mode (no explicit data-theme attribute)
    if (get(themeMode) === 'system') {
      // Re-trigger to ensure any dependent state refreshes
      applyTheme('system')
    }
  })
}

let captureDocumentListenerInstalled = false
let documentSelectionLockId: string | null = null

/** Schedule a debounced auto-save. Resets on every call. */
export function scheduleAutoSave(): void {
  documentsState.scheduleAutoSave()
}

/** Cancel any pending auto-save (called on manual save or doc switch). */
export function cancelAutoSave(): void {
  documentsState.cancelAutoSave()
}

// --- Init / actions -------------------------------------------------------

async function loadEditorSettings(): Promise<void> {
  try {
    const ff = await window.shell.settings.get('editor.fontFamily') as string | undefined
    const fs = await window.shell.settings.get('editor.fontSize') as string | undefined
    const sc = await window.shell.settings.get('editor.spellcheck') as boolean | undefined
    editorSettings.update(s => ({
      fontFamily: ff ?? s.fontFamily,
      fontSize:   fs ?? s.fontSize,
      spellcheck: sc ?? s.spellcheck
    }))
  } catch {
    // Settings may not exist yet — keep defaults
  }
}

async function loadDemoModePreference(): Promise<void> {
  try {
    demoModeEnabled.set(isDemoModeEnabled(await window.shell.settings.get(DEMO_MODE_SETTING_KEY)))
  } catch {
    demoModeEnabled.set(false)
  }
}

function documentKindOptionsKey(wsId: string): string {
  return `documents.${wsId}.kindOptions`
}

async function loadDocumentKindOptions(wsId: string): Promise<void> {
  try {
    documentKindOptions.set(normalizeDocumentKindOptions(
      await window.shell.settings.get(documentKindOptionsKey(wsId))
    ))
  } catch {
    documentKindOptions.set(DEFAULT_DOCUMENT_KIND_OPTIONS)
  }
}

async function persistDocumentKindOptions(options: DocumentKindOption[]): Promise<void> {
  const wsId = get(workspaceId)
  documentKindOptions.set(options)
  await window.shell.settings.set(documentKindOptionsKey(wsId), options)
}

export async function addDocumentKind(label: string): Promise<DocumentKindOption | null> {
  const trimmed = label.trim()
  if (!trimmed) return null

  const current = get(documentKindOptions)
  const ids = new Set(current.map(option => option.id))
  const baseId = slugifyDocumentKindLabel(trimmed)
  let id = baseId
  let suffix = 2
  while (ids.has(id)) {
    id = `${baseId}-${suffix}`
    suffix += 1
  }

  const option = { id, label: trimmed }
  await persistDocumentKindOptions([...current, option])
  return option
}

export async function renameDocumentKind(id: string, label: string): Promise<void> {
  const trimmed = label.trim()
  if (!trimmed) return
  const current = get(documentKindOptions)
  await persistDocumentKindOptions(current.map(option => option.id === id ? { ...option, label: trimmed } : option))
}

export async function removeDocumentKind(id: string): Promise<void> {
  const current = get(documentKindOptions)
  await persistDocumentKindOptions(current.filter(option => option.id !== id))
}

export async function setDemoModePreference(enabled: boolean): Promise<void> {
  demoModeEnabled.set(enabled)
  await window.shell.settings.set(DEMO_MODE_SETTING_KEY, enabled)
}

export async function resolveWorkspaceId(): Promise<string> {
  const workspace = get(activeWorkspace)
  if (workspace?.id && workspace.id !== 'ws-default') return workspace.id

  const resolved = await window.shell.workspace.get()
  activeWorkspace.set(resolved)
  workspaceId.set(resolved.id)
  return resolved.id
}

export async function initStore(): Promise<void> {
  initToasts()
  await loadModules()
  await loadCommands()
  await loadThemePreference()
  await loadEditorSettings()
  await loadDemoModePreference()
  documentsState.installChangeListener()

  const workspace = await window.shell.workspace.get()
  activeWorkspace.set(workspace)
  workspaceId.set(workspace.id)
  await loadDocumentKindOptions(workspace.id)
  await refreshWorkspaceLists()
  await loadWorkspaceDocuments(workspace.id)
  await loadDocumentKindOptions(workspace.id)
  await loadJobs(workspace.id)

  if (window.shell.capture?.documentId) {
    await selectDoc(window.shell.capture.documentId)
  }

  if (!captureDocumentListenerInstalled) {
    window.addEventListener('shell:capture-select-document', (event) => {
      const id = (event as CustomEvent<string>).detail
      if (id) void selectDoc(id)
    })
    captureDocumentListenerInstalled = true
  }
}

async function loadWorkspaceDocuments(wsId: string): Promise<void> {
  await documentsState.loadWorkspace(wsId)
}

export async function refreshWorkspaceLists(): Promise<void> {
  const rows = await window.shell.workspace.list({ includeArchived: true })
  workspaces.set(rows.filter(workspace => !workspace.archivedAt))
  archivedWorkspaces.set(rows.filter(workspace => workspace.archivedAt))
}

async function applyWorkspaceResult(workspace: Workspace): Promise<void> {
  const previousWorkspaceId = get(workspaceId)
  activeWorkspace.set(workspace)
  workspaceId.set(workspace.id)
  await refreshWorkspaceLists()

  if (workspace.id === previousWorkspaceId) return

  await loadWorkspaceDocuments(workspace.id)
  await loadJobs(workspace.id)

  const moduleId = get(activeModuleId)
  if (moduleId && moduleId !== PROJECTS_MODULE_ID) await window.shell.modules.activate(moduleId)
}

export async function switchWorkspace(id: string): Promise<void> {
  if (get(workspaceId) === id) return
  if (get(isDirty)) await saveDoc()

  const workspace = await window.shell.workspace.switch(id)
  await applyWorkspaceResult(workspace)
}

export async function createWorkspace(params: { name: string; type?: string; root?: string }): Promise<Workspace> {
  const workspace = await window.shell.workspace.create(params)
  await refreshWorkspaceLists()
  await switchWorkspace(workspace.id)
  return workspace
}

export async function importWorkspaceFolder(params?: { root?: string; name?: string; type?: string }): Promise<Workspace> {
  const workspace = await window.shell.workspace.importFolder(params)
  await refreshWorkspaceLists()
  await switchWorkspace(workspace.id)
  return workspace
}

export async function duplicateWorkspace(id: string, params?: { name?: string }): Promise<void> {
  if (get(isDirty)) await saveDoc()
  const workspace = await window.shell.workspace.duplicate(id, params)
  await refreshWorkspaceLists()
  await switchWorkspace(workspace.id)
}

export async function archiveWorkspace(id: string): Promise<void> {
  if (get(isDirty)) await saveDoc()
  const workspace = await window.shell.workspace.archive(id)
  await applyWorkspaceResult(workspace)
}

export async function restoreWorkspace(id: string): Promise<void> {
  const workspace = await window.shell.workspace.restore(id)
  await applyWorkspaceResult(workspace)
}

export async function deleteWorkspace(id: string): Promise<void> {
  if (get(isDirty)) await saveDoc()
  const workspace = await window.shell.workspace.delete(id)
  await applyWorkspaceResult(workspace)
}

export async function updateWorkspace(id: string, patch: WorkspaceUpdatePatch): Promise<Workspace> {
  const updated = await window.shell.workspace.update(id, patch)
  await refreshWorkspaceLists()
  if (get(workspaceId) === id) {
    activeWorkspace.set(updated)
    await loadModules()
  }
  return updated
}

export async function loadWorkspaceStats(id: string): Promise<WorkspaceStats> {
  return window.shell.workspace.stats(id)
}

export async function selectDoc(id: string): Promise<void> {
  if (documentSelectionLockId && id !== documentSelectionLockId) {
    addToast('warn', 'Exit comment mode before switching documents.')
    return
  }
  await documentsState.selectDoc(id)
}

export function closeDoc(): void {
  if (documentSelectionLockId) {
    addToast('warn', 'Exit comment mode before closing this document.')
    return
  }
  documentsState.closeDoc()
}

export function lockDocumentSelection(id: string): void {
  documentSelectionLockId = id
}

export function unlockDocumentSelection(id?: string | null): void {
  if (!id || documentSelectionLockId === id) {
    documentSelectionLockId = null
  }
}

export async function updateDoc(id: string, patch: { title?: string; kind?: string | null; icon?: string | null }): Promise<void> {
  await documentsState.updateDoc(id, patch)
}

export async function updateDocMetadata(id: string, patch: DocumentMetadataPatch): Promise<void> {
  await documentsState.updateDocMetadata(id, patch)
}

export async function createDoc(params: { workspaceId: string; nodeType?: DocumentNodeType; kind?: string | null; targetId?: string | null }) {
  return documentsState.createDoc(params)
}

export async function archiveDoc(id: string) {
  return documentsState.archiveDoc(id)
}

export async function archiveDocs(ids: string[]) {
  return documentsState.archiveDocs(ids)
}

export async function duplicateDocs(ids: string[]) {
  return documentsState.duplicateDocs(ids)
}

export async function deleteDocs(ids: string[]) {
  return documentsState.deleteDocs(ids)
}

export async function restoreDoc(id: string) {
  return documentsState.restoreDoc(id)
}

export async function restoreDocVersion(versionId: string, params: DocumentVersionRestoreParams) {
  return documentsState.restoreVersion(versionId, params)
}

export async function createAnnotation(params: { documentId: string; note: string; color?: string; target: DocumentAnnotationTarget }) {
  return documentsState.createAnnotation(params)
}

export async function updateAnnotation(id: string, patch: DocumentAnnotationPatch) {
  return documentsState.updateAnnotation(id, patch)
}

export async function resolveAnnotation(id: string) {
  return documentsState.resolveAnnotation(id)
}

export async function reopenAnnotation(id: string) {
  return documentsState.reopenAnnotation(id)
}

export async function deleteAnnotation(id: string) {
  return documentsState.deleteAnnotation(id)
}

export async function refreshAnnotations() {
  return documentsState.refreshAnnotations()
}

export async function exportDocSubtree(id: string, params?: { targetDir?: string }) {
  return documentsState.exportSubtree(id, params)
}

export async function setDocumentsSortMode(mode: DocumentsSortMode): Promise<void> {
  await documentsState.setSortMode(mode)
}

export async function moveDoc(sourceId: string, targetId: string, placement: DocumentDropPlacement): Promise<boolean> {
  return documentsState.moveDoc(sourceId, targetId, placement)
}

export function setEditorContent(content: string, options?: { dirty?: boolean }): void {
  documentsState.setEditorContent(content, options)
}

export async function saveDoc(options?: DocumentSaveOptions): Promise<void> {
  await documentsState.saveDoc(options)
}

export function countWords(text: string): number {
  return documentsState.countWords(text)
}
