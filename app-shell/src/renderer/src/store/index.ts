import { writable, derived, get } from 'svelte/store'
import type { Doc, DocVersion } from '@shared/module-contract'
import { loadCommands } from './commands'

export const workspaceId   = writable<string>('ws-default')
export const documents     = writable<Doc[]>([])
export const activeModuleId = writable<string>('shell.documents')
export const activeDocId   = writable<string | null>(null)
export const editorContent = writable<string>('')
export const isDirty       = writable<boolean>(false)
export const versions      = writable<DocVersion[]>([])

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

export async function initStore(): Promise<void> {
  await loadCommands()

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
