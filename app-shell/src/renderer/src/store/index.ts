import { writable, readable, get } from 'svelte/store'
import type { ThemeMode, Workspace } from '@shared/module-contract'
import type { DocumentsState, DocumentsStateSlice } from '@shared/state/documents-state'
import { getModuleState } from '../modules/module-state-registry'
import { loadCommands } from './commands'
import { initToasts } from './toasts'
import { loadJobs } from './jobs'

export type { ThemeMode }

export const workspaceId   = writable<string>('ws-default')
export const activeWorkspace = writable<Workspace | null>(null)
export const workspaces = writable<Workspace[]>([])
export const activeModuleId = writable<string | null>(null)

export const documentsState = getModuleState<DocumentsStateSlice>('shell.documents', 'documents')

function fromDocumentsState<T>(selector: (state: DocumentsState) => T) {
  return readable(selector(documentsState.getSnapshot()), (set) =>
    documentsState.subscribe((state) => set(selector(state)))
  )
}

export const documents = fromDocumentsState(state => state.documents)
export const activeDocId = fromDocumentsState(state => state.activeDocId)
export const activeDoc = fromDocumentsState(state => state.activeDoc)
export const editorContent = fromDocumentsState(state => state.editorContent)
export const isDirty = fromDocumentsState(state => state.isDirty)
export const versions = fromDocumentsState(state => state.versions)
export const docTree = fromDocumentsState(state => state.docTree)

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

export async function initStore(): Promise<void> {
  initToasts()
  await loadCommands()
  await loadThemePreference()
  await loadEditorSettings()
  documentsState.installChangeListener()

  const workspace = await window.shell.workspace.get()
  activeWorkspace.set(workspace)
  workspaceId.set(workspace.id)
  workspaces.set(await window.shell.workspace.list())
  await loadWorkspaceDocuments(workspace.id)
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

export async function switchWorkspace(id: string): Promise<void> {
  if (get(workspaceId) === id) return
  if (get(isDirty)) await saveDoc()

  const workspace = await window.shell.workspace.switch(id)
  activeWorkspace.set(workspace)
  workspaceId.set(workspace.id)
  workspaces.set(await window.shell.workspace.list())
  await loadWorkspaceDocuments(workspace.id)
  await loadJobs(workspace.id)

  const moduleId = get(activeModuleId)
  if (moduleId) await window.shell.modules.activate(moduleId)
}

export async function createWorkspace(params: { name: string; type?: string; root?: string }): Promise<void> {
  const workspace = await window.shell.workspace.create(params)
  workspaces.set(await window.shell.workspace.list())
  await switchWorkspace(workspace.id)
}

export async function selectDoc(id: string): Promise<void> {
  await documentsState.selectDoc(id)
}

export function setEditorContent(content: string, options?: { dirty?: boolean }): void {
  documentsState.setEditorContent(content, options)
}

export async function saveDoc(): Promise<void> {
  await documentsState.saveDoc()
}

export function countWords(text: string): number {
  return documentsState.countWords(text)
}
