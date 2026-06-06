import type { Doc, DocumentExportParams, DocumentExportResult, DocumentLifecycleOptions, DocumentMetadataPatch, DocumentNodeType, DocVersion } from '../module-contract'
import { ObservableSlice } from './observable'

export interface DocNode extends Doc {
  children: DocNode[]
}

export type DocumentsSortMode = 'manual' | 'alphabetical' | 'date'
export type DocumentDropPlacement = 'before' | 'after' | 'inside'

export interface DocumentsPort {
  list(workspaceId: string): Promise<Doc[]>
  listArchived(workspaceId: string): Promise<Doc[]>
  open(id: string): Promise<Doc | undefined>
  save(id: string, content: string): Promise<void>
  update(id: string, patch: { title?: string; kind?: string | null; icon?: string | null }): Promise<Doc>
  updateMetadata(id: string, patch: DocumentMetadataPatch): Promise<Doc>
  duplicate(id: string, options?: DocumentLifecycleOptions): Promise<Doc[]>
  delete(id: string, options?: DocumentLifecycleOptions): Promise<string[]>
  create(params: { workspaceId: string; nodeType?: DocumentNodeType; kind?: string | null; title: string; parentId?: string | null; sortOrder?: number }): Promise<Doc>
  move(params: { id: string; parentId?: string | null; sortOrder: number }): Promise<Doc[]>
  archive(id: string, options?: { recursive?: boolean }): Promise<string[]>
  restore(id: string, options?: { recursive?: boolean }): Promise<Doc[]>
  exportSubtree(id: string, params?: DocumentExportParams): Promise<DocumentExportResult>
  versions(id: string): Promise<DocVersion[]>
  onChanged(cb: (id: string) => void): void
  getSortMode(): Promise<unknown>
  setSortMode(mode: DocumentsSortMode): Promise<void>
}

export interface DocumentsState {
  documents: Doc[]
  archivedDocuments: Doc[]
  activeDocId: string | null
  activeDoc: Doc | null
  editorContent: string
  isDirty: boolean
  versions: DocVersion[]
  docTree: DocNode[]
  archivedDocTree: DocNode[]
  sortMode: DocumentsSortMode
}

const AUTO_SAVE_MS = 3000
const NATURAL_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export class DocumentsStateSlice extends ObservableSlice<DocumentsState> {
  private documents: Doc[] = []
  private archivedDocuments: Doc[] = []
  private activeDocId: string | null = null
  private workspaceId: string | null = null
  private editorContent = ''
  private isDirty = false
  private versions: DocVersion[] = []
  private sortMode: DocumentsSortMode = 'manual'
  private drafts = new Map<string, string>()
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  private changeListenerInstalled = false

  constructor(private readonly port: DocumentsPort) {
    super()
  }

  getSnapshot(): DocumentsState {
    return {
      documents: this.documents,
      archivedDocuments: this.archivedDocuments,
      activeDocId: this.activeDocId,
      activeDoc: this.activeDoc(),
      editorContent: this.editorContent,
      isDirty: this.isDirty,
      versions: this.versions,
      docTree: this.buildTree(this.documents),
      archivedDocTree: this.buildTree(this.archivedDocuments),
      sortMode: this.sortMode
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
    this.workspaceId = workspaceId
    this.drafts.clear()
    this.sortMode = normalizeSortMode(await this.port.getSortMode())
    this.documents = await this.port.list(workspaceId)
    this.archivedDocuments = await this.port.listArchived(workspaceId)
    this.activeDocId = null
    this.editorContent = ''
    this.isDirty = false
    this.versions = []
    this.emit()
  }

  async selectDoc(id: string): Promise<void> {
    this.rememberActiveDraft()
    this.cancelAutoSave()
    this.activeDocId = id
    this.emit()

    const doc = await this.port.open(id)
    if (!doc) return

    this.documents = this.documents.map(item => item.id === doc.id ? doc : item)
    const draft = this.drafts.get(id)
    this.editorContent = draft ?? doc.content
    this.isDirty = draft !== undefined
    this.versions = await this.port.versions(id)
    this.emit()
  }

  async updateDoc(id: string, patch: { title?: string; kind?: string | null; icon?: string | null }): Promise<void> {
    const updated = await this.port.update(id, patch)
    this.upsertDocument(updated)

    this.emit()
  }

  async updateDocMetadata(id: string, patch: DocumentMetadataPatch): Promise<void> {
    const updated = await this.port.updateMetadata(id, patch)
    this.upsertDocument(updated)

    if (this.activeDocId === id) {
      this.versions = await this.port.versions(id)
    }

    this.emit()
  }

  async createDoc(params: { workspaceId: string; nodeType?: DocumentNodeType; kind?: string | null; targetId?: string | null }): Promise<Doc> {
    const nodeType = params.nodeType ?? 'document'
    const kind = nodeType === 'folder' ? null : (params.kind ?? null)
    const placement = this.createPlacement(nodeType, kind, params.targetId ?? this.activeDocId)
    const title = this.uniqueTitle(this.defaultTitle(nodeType, kind), placement.parentId)
    const created = await this.port.create({
      workspaceId: params.workspaceId,
      nodeType,
      kind,
      title,
      parentId: placement.parentId,
      sortOrder: placement.sortOrder
    })

    this.upsertDocument(created)
    await this.selectDoc(created.id)
    return created
  }

  async setSortMode(mode: DocumentsSortMode): Promise<void> {
    if (this.sortMode === mode) return
    this.sortMode = mode
    await this.port.setSortMode(mode)
    this.emit()
  }

  async moveDoc(sourceId: string, targetId: string, placement: DocumentDropPlacement): Promise<boolean> {
    if (sourceId === targetId) return false

    const source = this.documents.find(doc => doc.id === sourceId)
    const target = this.documents.find(doc => doc.id === targetId)
    if (!source || !target) return false
    if (this.isDescendant(targetId, sourceId)) {
      throw new Error('Cannot move a document inside itself.')
    }

    const visibleTreeBeforeMove = this.buildTree(this.documents)
    if (this.sortMode !== 'manual') {
      this.sortMode = 'manual'
      await this.port.setSortMode('manual')
      await this.persistTreeOrder(visibleTreeBeforeMove)
    }

    const nextTarget = this.documents.find(doc => doc.id === targetId)
    if (!nextTarget) return false

    const parentId = placement === 'inside' ? nextTarget.id : nextTarget.parentId
    const siblings = this.sortedSiblings(parentId).filter(doc => doc.id !== sourceId)
    const targetIndex = siblings.findIndex(doc => doc.id === targetId)
    const sortOrder = placement === 'inside'
      ? siblings.length
      : Math.max(0, targetIndex + (placement === 'after' ? 1 : 0))

    if (source.parentId === parentId) {
      const currentOrder = this.sortedSiblings(parentId).map(doc => doc.id)
      const nextOrder = siblings.map(doc => doc.id)
      nextOrder.splice(sortOrder, 0, sourceId)
      if (currentOrder.join('\0') === nextOrder.join('\0')) {
        this.emit()
        return false
      }
    }

    const affected = await this.port.move({ id: sourceId, parentId, sortOrder })
    this.upsertDocuments(affected)
    this.emit()
    return true
  }

  async archiveDoc(id: string): Promise<{ archivedIds: string[]; nextActiveId: string | null }> {
    const affectedBeforeArchive = this.collectDescendantIds(id)
    if (affectedBeforeArchive.length === 0) return { archivedIds: [], nextActiveId: this.activeDocId }

    const activeWillArchive = this.activeDocId !== null && affectedBeforeArchive.includes(this.activeDocId)
    if (activeWillArchive && this.activeDocId && this.isDirty) {
      await this.port.save(this.activeDocId, this.editorContent)
      this.drafts.delete(this.activeDocId)
      this.isDirty = false
    }

    const nextActiveId = activeWillArchive ? this.nextSelectionAfterArchive(this.activeDocId!, new Set(affectedBeforeArchive)) : this.activeDocId
    const archivedIds = await this.port.archive(id, { recursive: true })
    const archivedSet = new Set(archivedIds.length > 0 ? archivedIds : affectedBeforeArchive)

    this.documents = this.documents.filter(doc => !archivedSet.has(doc.id))
    if (this.workspaceId) {
      this.archivedDocuments = await this.port.listArchived(this.workspaceId)
    }
    for (const archivedId of archivedSet) {
      this.drafts.delete(archivedId)
    }

    if (activeWillArchive) {
      this.activeDocId = null
      this.editorContent = ''
      this.isDirty = false
      this.versions = []
      this.emit()

      if (nextActiveId) {
        await this.selectDoc(nextActiveId)
      }
    } else {
      this.emit()
    }

    return { archivedIds: Array.from(archivedSet), nextActiveId }
  }

  async archiveDocs(ids: string[]): Promise<{ archivedIds: string[]; nextActiveId: string | null }> {
    const rootIds = this.selectedRootDocs(ids).map(doc => doc.id)

    if (rootIds.length === 0) return { archivedIds: [], nextActiveId: this.activeDocId }

    const affectedSet = new Set<string>()
    for (const id of rootIds) {
      for (const affectedId of this.collectDescendantIds(id)) {
        affectedSet.add(affectedId)
      }
    }
    if (affectedSet.size === 0) return { archivedIds: [], nextActiveId: this.activeDocId }

    const activeWillArchive = this.activeDocId !== null && affectedSet.has(this.activeDocId)
    if (activeWillArchive && this.activeDocId && this.isDirty) {
      await this.port.save(this.activeDocId, this.editorContent)
      this.drafts.delete(this.activeDocId)
      this.isDirty = false
    }

    const nextActiveId = activeWillArchive ? this.nextSelectionAfterArchive(this.activeDocId!, affectedSet) : this.activeDocId
    const archivedSet = new Set<string>()
    for (const id of rootIds) {
      const archivedIds = await this.port.archive(id, { recursive: true })
      if (archivedIds.length === 0) {
        for (const affectedId of this.collectDescendantIds(id)) {
          archivedSet.add(affectedId)
        }
      } else {
        for (const archivedId of archivedIds) {
          archivedSet.add(archivedId)
        }
      }
    }

    this.documents = this.documents.filter(doc => !archivedSet.has(doc.id))
    if (this.workspaceId) {
      this.archivedDocuments = await this.port.listArchived(this.workspaceId)
    }
    for (const archivedId of archivedSet) {
      this.drafts.delete(archivedId)
    }

    if (activeWillArchive) {
      this.activeDocId = null
      this.editorContent = ''
      this.isDirty = false
      this.versions = []
      this.emit()

      if (nextActiveId) {
        await this.selectDoc(nextActiveId)
      }
    } else {
      this.emit()
    }

    return { archivedIds: Array.from(archivedSet), nextActiveId }
  }

  async duplicateDocs(ids: string[]): Promise<Doc[]> {
    const rootDocs = this.selectedRootDocs(ids)
    if (rootDocs.length === 0) return []

    const duplicated: Doc[] = []
    for (const doc of rootDocs) {
      const copied = await this.port.duplicate(doc.id, { recursive: doc.nodeType === 'folder' })
      duplicated.push(...copied)
    }

    if (this.workspaceId) {
      this.documents = await this.port.list(this.workspaceId)
    } else {
      this.upsertDocuments(duplicated)
    }

    if (duplicated[0]) {
      await this.selectDoc(duplicated[0].id)
    } else {
      this.emit()
    }

    return duplicated
  }

  async deleteDocs(ids: string[]): Promise<{ deletedIds: string[]; nextActiveId: string | null }> {
    const rootDocs = this.selectedRootDocs(ids)
    if (rootDocs.length === 0) return { deletedIds: [], nextActiveId: this.activeDocId }

    const affectedSet = new Set<string>()
    for (const doc of rootDocs) {
      for (const affectedId of doc.nodeType === 'folder' ? this.collectDescendantIds(doc.id) : [doc.id]) {
        affectedSet.add(affectedId)
      }
    }

    const activeWillDelete = this.activeDocId !== null && affectedSet.has(this.activeDocId)
    if (activeWillDelete && this.activeDocId && this.isDirty) {
      await this.port.save(this.activeDocId, this.editorContent)
      this.drafts.delete(this.activeDocId)
      this.isDirty = false
    }

    const nextActiveId = activeWillDelete ? this.nextSelectionAfterArchive(this.activeDocId!, affectedSet) : this.activeDocId
    const deletedSet = new Set<string>()
    for (const doc of rootDocs) {
      const deletedIds = await this.port.delete(doc.id, { recursive: doc.nodeType === 'folder' })
      for (const deletedId of deletedIds) {
        deletedSet.add(deletedId)
      }
    }

    this.documents = this.documents.filter(doc => !deletedSet.has(doc.id))
    for (const deletedId of deletedSet) {
      this.drafts.delete(deletedId)
    }

    if (activeWillDelete) {
      this.activeDocId = null
      this.editorContent = ''
      this.isDirty = false
      this.versions = []
      this.emit()

      if (nextActiveId) {
        await this.selectDoc(nextActiveId)
      }
    } else {
      this.emit()
    }

    return { deletedIds: Array.from(deletedSet), nextActiveId }
  }

  async restoreDoc(id: string): Promise<Doc[]> {
    const restored = await this.port.restore(id, { recursive: true })
    if (restored.length === 0) return []

    const restoredIds = new Set(restored.map(doc => doc.id))
    this.archivedDocuments = this.archivedDocuments.filter(doc => !restoredIds.has(doc.id))
    this.upsertDocuments(restored)
    await this.selectDoc(id)
    return restored
  }

  async exportSubtree(id: string, params?: DocumentExportParams): Promise<DocumentExportResult> {
    if (this.activeDocId && this.isDirty) {
      await this.saveDoc()
    }
    return this.port.exportSubtree(id, params)
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
    this.drafts.delete(this.activeDocId)
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
    if (updated.archivedAt) {
      const archivedIds = this.collectDescendantIds(id)
      const archivedSet = new Set(archivedIds.length > 0 ? archivedIds : [id])
      this.documents = this.documents.filter(doc => !archivedSet.has(doc.id))
      if (this.workspaceId) {
        this.archivedDocuments = await this.port.listArchived(this.workspaceId)
      }
      for (const archivedId of archivedSet) {
        this.drafts.delete(archivedId)
      }
      if (this.activeDocId && archivedSet.has(this.activeDocId)) {
        this.activeDocId = null
        this.editorContent = ''
        this.isDirty = false
        this.versions = []
      }
      this.emit()
      return
    }

    this.upsertDocument(updated)
    if (this.activeDocId === id) {
      if (!this.isDirty) {
        this.editorContent = updated.content
      }
      this.versions = await this.port.versions(id)
    }
    this.emit()
  }

  private rememberActiveDraft(): void {
    if (!this.activeDocId) return
    if (this.isDirty) {
      this.drafts.set(this.activeDocId, this.editorContent)
    } else {
      this.drafts.delete(this.activeDocId)
    }
  }

  private upsertDocument(doc: Doc): void {
    const existingIndex = this.documents.findIndex(item => item.id === doc.id)
    if (existingIndex === -1) {
      this.documents = [...this.documents, doc].sort(compareManualDocuments)
      return
    }

    this.documents = this.documents
      .map(item => item.id === doc.id ? doc : item)
      .sort(compareManualDocuments)
  }

  private upsertDocuments(docs: Doc[]): void {
    for (const doc of docs) {
      const existingIndex = this.documents.findIndex(item => item.id === doc.id)
      if (existingIndex === -1) {
        this.documents.push(doc)
      } else {
        this.documents[existingIndex] = doc
      }
    }
    this.documents = [...this.documents].sort(compareManualDocuments)
  }

  private activeDoc(): Doc | null {
    return this.documents.find(doc => doc.id === this.activeDocId) ?? null
  }

  private buildTree(documents: Doc[]): DocNode[] {
    const map = new Map(documents.map(doc => [doc.id, { ...doc, children: [] as DocNode[] }]))
    const roots: DocNode[] = []

    for (const doc of documents) {
      const node = map.get(doc.id)
      if (!node) continue

      if (doc.parentId === null || !map.has(doc.parentId)) {
        roots.push(node)
      } else {
        map.get(doc.parentId)?.children.push(node)
      }
    }

    return this.sortNodes(roots)
  }

  private sortNodes(nodes: DocNode[]): DocNode[] {
    nodes.sort((a, b) => this.compareDocs(a, b))
    for (const node of nodes) {
      node.children = this.sortNodes(node.children)
    }
    return nodes
  }

  private compareDocs(a: Doc, b: Doc): number {
    if (this.sortMode === 'alphabetical') {
      return NATURAL_COLLATOR.compare(a.title, b.title) || compareManualDocuments(a, b)
    }
    if (this.sortMode === 'date') {
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || NATURAL_COLLATOR.compare(a.title, b.title)
    }
    return compareManualDocuments(a, b)
  }

  private defaultTitle(nodeType: DocumentNodeType, kind: string | null): string {
    if (nodeType === 'folder') return 'Untitled Folder'
    if (kind === null) return 'Untitled Document'
    return `Untitled ${titleCaseKind(kind)}`
  }

  private createPlacement(nodeType: DocumentNodeType, kind: string | null, targetId?: string | null): { parentId: string | null; sortOrder: number } {
    const target = targetId ? this.documents.find(doc => doc.id === targetId) : undefined

    if (!target) {
      return this.appendPlacement(null)
    }

    if (target.nodeType === 'folder') {
      return this.appendPlacement(target.id)
    }

    if (nodeType === 'document' && kind === 'scene' && (target.kind === 'chapter' || target.kind === 'plan')) {
      return this.appendPlacement(target.id)
    }

    return {
      parentId: target.parentId,
      sortOrder: target.sortOrder + 1
    }
  }

  private appendPlacement(parentId: string | null): { parentId: string | null; sortOrder: number } {
    const siblings = this.documents.filter(doc => doc.parentId === parentId)
    const maxSortOrder = siblings.reduce((max, doc) => Math.max(max, doc.sortOrder), -1)
    return { parentId, sortOrder: maxSortOrder + 1 }
  }

  private uniqueTitle(baseTitle: string, parentId: string | null): string {
    const siblingTitles = new Set(
      this.documents
        .filter(doc => doc.parentId === parentId)
        .map(doc => doc.title.trim().toLowerCase())
    )

    if (!siblingTitles.has(baseTitle.toLowerCase())) return baseTitle

    let suffix = 2
    while (siblingTitles.has(`${baseTitle} ${suffix}`.toLowerCase())) {
      suffix += 1
    }
    return `${baseTitle} ${suffix}`
  }

  private collectDescendantIds(id: string): string[] {
    if (!this.documents.some(doc => doc.id === id)) return []

    const affected = new Set<string>([id])
    let changed = true
    while (changed) {
      changed = false
      for (const doc of this.documents) {
        if (doc.parentId && affected.has(doc.parentId) && !affected.has(doc.id)) {
          affected.add(doc.id)
          changed = true
        }
      }
    }

    return Array.from(affected)
  }

  private isDescendant(candidateId: string, ancestorId: string): boolean {
    return this.collectDescendantIds(ancestorId).includes(candidateId)
  }

  private selectedRootDocs(ids: string[]): Doc[] {
    const selectedIds = new Set(ids)
    return this.documents
      .filter(doc => selectedIds.has(doc.id) && !this.hasSelectedAncestor(doc, selectedIds))
      .sort(compareManualDocuments)
  }

  private hasSelectedAncestor(doc: Doc, selectedIds: Set<string>): boolean {
    let parentId = doc.parentId
    while (parentId) {
      if (selectedIds.has(parentId)) return true
      parentId = this.documents.find(item => item.id === parentId)?.parentId ?? null
    }
    return false
  }

  private sortedSiblings(parentId: string | null): Doc[] {
    return this.documents
      .filter(doc => doc.parentId === parentId)
      .sort(compareManualDocuments)
  }

  private async persistTreeOrder(nodes: DocNode[], parentId: string | null = null): Promise<void> {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index]
      try {
        const affected = await this.port.move({ id: node.id, parentId, sortOrder: index })
        this.upsertDocuments(affected)
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('Move would not change')) {
          throw error
        }
      }
    }

    for (const node of nodes) {
      await this.persistTreeOrder(node.children, node.id)
    }
  }

  private nextSelectionAfterArchive(activeId: string, affected: Set<string>): string | null {
    const active = this.documents.find(doc => doc.id === activeId)
    if (!active) return null

    const siblings = this.documents
      .filter(doc => doc.parentId === active.parentId && !affected.has(doc.id))
      .sort(compareManualDocuments)
    const nextSibling = siblings.find(doc => doc.sortOrder > active.sortOrder)
    if (nextSibling) return nextSibling.id

    const previousSiblings = siblings.filter(doc => doc.sortOrder <= active.sortOrder)
    const previousSibling = previousSiblings[previousSiblings.length - 1]
    if (previousSibling) return previousSibling.id

    if (active.parentId && !affected.has(active.parentId)) {
      return active.parentId
    }

    const roots = this.documents
      .filter(doc => doc.parentId === null && !affected.has(doc.id))
      .sort(compareManualDocuments)
    return roots[0]?.id ?? null
  }
}

function normalizeSortMode(value: unknown): DocumentsSortMode {
  return value === 'alphabetical' || value === 'date' || value === 'manual' ? value : 'manual'
}

function compareManualDocuments(a: Doc, b: Doc): number {
  if (a.parentId !== b.parentId) {
    return (a.parentId ?? '').localeCompare(b.parentId ?? '')
  }
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
  return a.createdAt.localeCompare(b.createdAt)
}

function titleCaseKind(kind: string): string {
  return kind
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || kind
}
