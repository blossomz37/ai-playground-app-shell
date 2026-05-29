import { writable, derived, get } from 'svelte/store'
import type { Doc, DocVersion } from '@shared/module-contract'
import { loadCommands } from './commands'
import { initToasts } from './toasts'

export const workspaceId   = writable<string>('ws-default')
export const documents     = writable<Doc[]>([])
export const activeModuleId = writable<string>('shell.documents')
export const activeDocId   = writable<string | null>(null)
export const editorContent = writable<string>('')
export const isDirty       = writable<boolean>(false)
export const versions      = writable<DocVersion[]>([])

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

export const activeDoc = derived(
  [documents, activeDocId],
  ([$docs, $id]) => $docs.find(d => d.id === $id) ?? null
)

export const docTree = derived(documents, ($docs) => buildTree($docs))

interface DocNode extends Doc { children: DocNode[] }

function buildTree(docs: Doc[]): DocNode[] {
  const map = new Map(docs.map(d => [d.id, { ...d, children: [] as DocNode[] }]))
  const roots: DocNode[] = []
  for (const d of docs) {
    if (d.parentId === null) {
      roots.push(map.get(d.id)!)
    } else {
      map.get(d.parentId)?.children.push(map.get(d.id)!)
    }
  }
  return roots
}

// --- Auto-save debounce ---------------------------------------------------

const AUTO_SAVE_MS = 3000
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

/** Schedule a debounced auto-save. Resets on every call. */
export function scheduleAutoSave(): void {
  cancelAutoSave()
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null
    void saveDoc()
  }, AUTO_SAVE_MS)
}

/** Cancel any pending auto-save (called on manual save or doc switch). */
export function cancelAutoSave(): void {
  if (autoSaveTimer !== null) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
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
  await loadEditorSettings()

  const wsId = get(workspaceId)
  const docs = await window.shell.documents.list(wsId)
  documents.set(docs)

  const firstEditable = docs.find(d => d.kind !== 'folder')
  if (firstEditable) await selectDoc(firstEditable.id)

  window.shell.documents.onChanged(async (id) => {
    const updated = await window.shell.documents.open(id)
    if (updated) {
      documents.update($docs => $docs.map(d => d.id === id ? updated : d))
      if (get(activeDocId) === id) {
        editorContent.set(updated.content)
        isDirty.set(false)
      }
    }
  })
}

export async function selectDoc(id: string): Promise<void> {
  cancelAutoSave()
  activeDocId.set(id)
  const doc = await window.shell.documents.open(id)
  if (doc) {
    editorContent.set(doc.content)
    isDirty.set(false)
    const v = await window.shell.documents.versions(id)
    versions.set(v)
  }
}

export async function saveDoc(): Promise<void> {
  cancelAutoSave()
  const id = get(activeDocId)
  const content = get(editorContent)
  if (!id) return
  await window.shell.documents.save(id, content)
  isDirty.set(false)
  const v = await window.shell.documents.versions(id)
  versions.set(v)
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

