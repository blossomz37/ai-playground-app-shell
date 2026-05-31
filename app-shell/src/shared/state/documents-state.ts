import type { Doc, DocVersion } from '../module-contract'
import { ObservableSlice } from './observable'

export interface DocNode extends Doc {
  children: DocNode[]
}

export interface DocumentsPort {
  list(workspaceId: string): Promise<Doc[]>
  open(id: string): Promise<Doc | undefined>
  save(id: string, content: string): Promise<void>
  versions(id: string): Promise<DocVersion[]>
  onChanged(cb: (id: string) => void): void
}

export interface DocumentsState {
  documents: Doc[]
  activeDocId: string | null
  activeDoc: Doc | null
  editorContent: string
  isDirty: boolean
  versions: DocVersion[]
  docTree: DocNode[]
}

const AUTO_SAVE_MS = 3000

export class DocumentsStateSlice extends ObservableSlice<DocumentsState> {
  private documents: Doc[] = []
  private activeDocId: string | null = null
  private editorContent = ''
  private isDirty = false
  private versions: DocVersion[] = []
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  private changeListenerInstalled = false

  constructor(private readonly port: DocumentsPort) {
    super()
  }

  getSnapshot(): DocumentsState {
    return {
      documents: this.documents,
      activeDocId: this.activeDocId,
      activeDoc: this.activeDoc(),
      editorContent: this.editorContent,
      isDirty: this.isDirty,
      versions: this.versions,
      docTree: this.buildTree()
    }
  }

  installChangeListener(): void {
    if (this.changeListenerInstalled) return
    this.port.onChanged((id) => {
      void this.applyDocumentChange(id)
    })
    this.changeListenerInstalled = true
  }

  async loadWorkspace(workspaceId: string): Promise<void> {
    this.cancelAutoSave()
    this.documents = await this.port.list(workspaceId)
    this.activeDocId = null
    this.editorContent = ''
    this.isDirty = false
    this.versions = []
    this.emit()
  }

  async selectDoc(id: string): Promise<void> {
    this.cancelAutoSave()
    this.activeDocId = id
    this.emit()

    const doc = await this.port.open(id)
    if (!doc) return

    this.documents = this.documents.map(item => item.id === doc.id ? doc : item)
    this.editorContent = doc.content
    this.isDirty = false
    this.versions = await this.port.versions(id)
    this.emit()
  }

  setEditorContent(content: string, options: { dirty?: boolean } = {}): void {
    this.editorContent = content
    if (options.dirty ?? true) {
      this.isDirty = true
    }
    this.emit()
  }

  scheduleAutoSave(): void {
    this.cancelAutoSave()
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null
      void this.saveDoc()
    }, AUTO_SAVE_MS)
  }

  cancelAutoSave(): void {
    if (this.autoSaveTimer === null) return
    clearTimeout(this.autoSaveTimer)
    this.autoSaveTimer = null
  }

  async saveDoc(): Promise<void> {
    this.cancelAutoSave()
    if (!this.activeDocId) return

    await this.port.save(this.activeDocId, this.editorContent)
    this.isDirty = false
    this.versions = await this.port.versions(this.activeDocId)
    this.emit()
  }

  countWords(text = this.editorContent): number {
    return text.trim().split(/\s+/).filter(Boolean).length
  }

  private async applyDocumentChange(id: string): Promise<void> {
    const updated = await this.port.open(id)
    if (!updated) return

    this.documents = this.documents.map(doc => doc.id === id ? updated : doc)
    if (this.activeDocId === id) {
      this.editorContent = updated.content
      this.isDirty = false
      this.versions = await this.port.versions(id)
    }
    this.emit()
  }

  private activeDoc(): Doc | null {
    return this.documents.find(doc => doc.id === this.activeDocId) ?? null
  }

  private buildTree(): DocNode[] {
    const map = new Map(this.documents.map(doc => [doc.id, { ...doc, children: [] as DocNode[] }]))
    const roots: DocNode[] = []

    for (const doc of this.documents) {
      const node = map.get(doc.id)
      if (!node) continue

      if (doc.parentId === null) {
        roots.push(node)
      } else {
        map.get(doc.parentId)?.children.push(node)
      }
    }

    return roots
  }
}
