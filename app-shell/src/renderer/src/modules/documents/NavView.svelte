<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import {
    docTree,
    activeDocId,
    selectDoc,
    workspaceId,
    createDoc,
    updateDoc,
    archiveDoc,
    documentsSortMode,
    setDocumentsSortMode,
    moveDoc
  } from '../../store'
  import { showContextMenu, type ContextMenuItem } from '../../store/contextmenu'
  import { registerCommand } from '../../store/commands'
  import { addToast } from '../../store/toasts'
  import { SvelteSet } from 'svelte/reactivity'
  import { SortAscendingIcon } from 'phosphor-svelte'
  import DocumentTree from './DocumentTree.svelte'
  import {
    createDocumentTreePointerDrag,
    getDocumentDropPlacement,
    getDocumentTreeDragTarget,
    getNativeDocumentDragSourceId,
    hasPointerDragPassedThreshold,
    isInternalDocumentDragLeave,
    markNativeDocumentDropMove,
    setNativeDocumentDragPayload,
    type DocumentTreePointerDrag
  } from './documentTreeDrag'
  import type { Disposable } from '@shared/module-contract'
  import type { DocNode, DocumentDropPlacement, DocumentsSortMode } from '@shared/state/documents-state'

  let expanded = new SvelteSet<string>()
  let renamingDocId = $state<string | null>(null)
  let renameValue = $state('')
  let sortMenuOpen = $state(false)
  let draggingDocId = $state<string | null>(null)
  let dragOverDocId = $state<string | null>(null)
  let dragOverPlacement = $state<DocumentDropPlacement>('inside')
  let pointerDrag = $state<DocumentTreePointerDrag | null>(null)
  let suppressClickDocId = $state<string | null>(null)
  let commandDisposables: Disposable[] = []

  const sortOptions: Array<{ mode: DocumentsSortMode; label: string }> = [
    { mode: 'manual', label: 'Manual' },
    { mode: 'alphabetical', label: 'Alphabetical' },
    { mode: 'date', label: 'Date' }
  ]

  function commandTargetId(target?: unknown): string | null {
    if (typeof target === 'string') return target
    if (target && typeof target === 'object' && 'targetDocumentId' in target) {
      const id = (target as { targetDocumentId?: unknown }).targetDocumentId
      return typeof id === 'string' ? id : null
    }
    return $activeDocId
  }

  function focusRenameInput(node: HTMLInputElement) {
    queueMicrotask(() => {
      node.focus()
      node.select()
    })
  }

  function toggle(id: string) {
    expanded.has(id) ? expanded.delete(id) : expanded.add(id)
  }

  function activateNode(node: DocNode) {
    if (suppressClickDocId === node.id) {
      return
    }

    if (node.kind === 'folder') {
      toggle(node.id)
      return
    }

    void selectDoc(node.id)
  }

  function displayIcon(node: DocNode): string {
    const customIcon = node.icon?.trim()
    if (customIcon) return customIcon
    if (node.kind === 'folder') return isExpanded(node.id) ? '📂' : '📁'
    return '📄'
  }

  function activateIcon(node: DocNode) {
    if (suppressClickDocId === node.id) {
      return
    }

    if (node.children.length > 0) {
      toggle(node.id)
      return
    }

    activateNode(node)
  }

  /** Collect all expandable IDs from the tree. */
  function allExpandableIds(nodes: DocNode[]): string[] {
    const ids: string[] = []
    for (const n of nodes) {
      if (n.children.length > 0) {
        ids.push(n.id)
        ids.push(...allExpandableIds(n.children))
      }
    }
    return ids
  }

  function expandAll() {
    expanded.clear()
    for (const id of allExpandableIds($docTree as DocNode[])) {
      expanded.add(id)
    }
  }

  function collapseAll() {
    expanded.clear()
  }

  function expandPathTo(id: string | null | undefined) {
    if (!id) return
    const ancestors = findAncestorIds($docTree as DocNode[], id) ?? []
    for (const ancestorId of ancestors) {
      expanded.add(ancestorId)
    }
    expanded.add(id)
  }

  function findAncestorIds(nodes: DocNode[], targetId: string, ancestors: string[] = []): string[] | null {
    for (const node of nodes) {
      if (node.id === targetId) {
        return ancestors
      }

      const childAncestors = findAncestorIds(
        node.children,
        targetId,
        node.children.length > 0 ? [...ancestors, node.id] : ancestors
      )
      if (childAncestors) {
        return childAncestors
      }
    }

    return null
  }

  let activeAncestorIds = $derived.by(() => {
    if (!$activeDocId) return []
    return findAncestorIds($docTree as DocNode[], $activeDocId) ?? []
  })

  function isExpanded(id: string): boolean {
    return expanded.has(id) || activeAncestorIds.includes(id)
  }

  function sortModeLabel(mode: DocumentsSortMode): string {
    return sortOptions.find(option => option.mode === mode)?.label ?? 'Manual'
  }

  async function chooseSortMode(mode: DocumentsSortMode) {
    sortMenuOpen = false
    await setDocumentsSortMode(mode)
  }

  let allExpanded = $derived.by(() => {
    const expandableIds = allExpandableIds($docTree as DocNode[])
    return expandableIds.length > 0 && expandableIds.every(id => expanded.has(id))
  })

  function onTreeContextMenu(e: MouseEvent, node: DocNode) {
    e.preventDefault()
    const items: ContextMenuItem[] = [
      { id: 'documents.newChapter', label: 'New Chapter', icon: '📄', args: [node.id] },
      { id: 'documents.newScene',   label: 'New Scene',   icon: '📄', args: [node.id] },
      { id: 'documents.newFolder',  label: 'New Folder',  icon: '📂', args: [node.id] },
      { id: '_sep1', label: '', separator: true },
      { id: 'documents.rename',  label: 'Rename',  icon: '✎', args: [node.id], disabled: renamingDocId !== null && renamingDocId !== node.id },
      { id: 'documents.archive', label: 'Archive', icon: '📦', args: [node.id], disabled: renamingDocId !== null },
    ]
    showContextMenu(e.clientX, e.clientY, items)
  }

  function onSortKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      sortMenuOpen = false
    }
  }

  async function handleCreate(kind: 'chapter' | 'scene' | 'folder', target?: unknown) {
    const created = await createDoc({
      workspaceId: $workspaceId,
      kind,
      targetId: commandTargetId(target)
    })
    expandPathTo(created.parentId)
  }

  function startRename(target?: unknown) {
    const id = commandTargetId(target)
    const node = id ? findNode($docTree as DocNode[], id) : null
    if (!node) {
      addToast('warn', 'Select a document to rename.')
      return
    }

    renamingDocId = node.id
    renameValue = node.title
    expandPathTo(node.parentId)
  }

  function cancelRename() {
    renamingDocId = null
    renameValue = ''
  }

  async function commitRename() {
    if (!renamingDocId) return

    const id = renamingDocId
    const node = findNode($docTree as DocNode[], id)
    const title = renameValue.trim()
    if (!node) {
      cancelRename()
      return
    }

    if (!title) {
      addToast('warn', 'Document title cannot be blank.')
      renameValue = node.title
      cancelRename()
      return
    }

    cancelRename()
    if (title !== node.title) {
      await updateDoc(id, { title })
    }
  }

  function onRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void commitRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelRename()
    }
  }

  function updateRenameValue(value: string) {
    renameValue = value
  }

  async function handleArchive(target?: unknown) {
    const id = commandTargetId(target)
    if (!id) {
      addToast('warn', 'Select a document to archive.')
      return
    }

    await archiveDoc(id)
  }

  function onTreeDragStart(event: DragEvent, node: DocNode) {
    if (renamingDocId) {
      event.preventDefault()
      return
    }

    cancelPointerDrag()
    draggingDocId = node.id
    dragOverDocId = null
    setNativeDocumentDragPayload(event, node.id)
  }

  function onTreeDragOver(event: DragEvent, node: DocNode) {
    const sourceId = getNativeDocumentDragSourceId(event, draggingDocId)
    if (!sourceId || sourceId === node.id) return

    event.preventDefault()
    dragOverDocId = node.id
    dragOverPlacement = getDocumentDropPlacement(event.currentTarget as HTMLElement, event.clientY)

    markNativeDocumentDropMove(event)
  }

  function onTreeDragLeave(event: DragEvent, node: DocNode) {
    if (isInternalDocumentDragLeave(event)) return
    if (dragOverDocId === node.id) {
      dragOverDocId = null
    }
  }

  async function onTreeDrop(event: DragEvent, node: DocNode) {
    event.preventDefault()
    const sourceId = getNativeDocumentDragSourceId(event, draggingDocId)
    if (!sourceId || sourceId === node.id) {
      clearDragState()
      return
    }

    try {
      const moved = await moveDoc(sourceId, node.id, dragOverPlacement)
      if (moved && dragOverPlacement === 'inside') {
        expanded.add(node.id)
      }
    } catch (error) {
      addToast('warn', error instanceof Error ? error.message : 'Document could not be moved.')
    } finally {
      clearDragState()
    }
  }

  function onTreeDragEnd() {
    clearDragState()
  }

  function onTreePointerDown(event: PointerEvent, node: DocNode) {
    if (event.button !== 0 || renamingDocId === node.id) return

    pointerDrag = createDocumentTreePointerDrag(node.id, event)
    window.addEventListener('pointermove', onTreePointerMove)
    window.addEventListener('pointerup', onTreePointerUp, { once: true })
  }

  function onTreePointerMove(event: PointerEvent) {
    if (!pointerDrag) return

    if (!hasPointerDragPassedThreshold(pointerDrag, event)) return

    pointerDrag.dragging = true
    draggingDocId = pointerDrag.sourceId
    event.preventDefault()

    const target = getDocumentTreeDragTarget(event.clientX, event.clientY, pointerDrag.sourceId)
    if (!target) {
      dragOverDocId = null
      return
    }

    dragOverDocId = target.id
    dragOverPlacement = target.placement
  }

  async function onTreePointerUp() {
    window.removeEventListener('pointermove', onTreePointerMove)
    const completedDrag = pointerDrag
    pointerDrag = null

    if (!completedDrag?.dragging) return

    suppressClickDocId = completedDrag.sourceId
    window.setTimeout(() => {
      if (suppressClickDocId === completedDrag.sourceId) {
        suppressClickDocId = null
      }
    }, 0)

    const targetId = dragOverDocId
    const placement = dragOverPlacement
    if (!targetId || targetId === completedDrag.sourceId) {
      clearDragState()
      return
    }

    try {
      const moved = await moveDoc(completedDrag.sourceId, targetId, placement)
      if (moved && placement === 'inside') {
        expanded.add(targetId)
      }
    } catch (error) {
      addToast('warn', error instanceof Error ? error.message : 'Document could not be moved.')
    } finally {
      clearDragState()
    }
  }

  function clearDragState() {
    draggingDocId = null
    dragOverDocId = null
  }

  function cancelPointerDrag() {
    window.removeEventListener('pointermove', onTreePointerMove)
    window.removeEventListener('pointerup', onTreePointerUp)
    pointerDrag = null
  }

  function findNode(nodes: DocNode[], id: string): DocNode | null {
    for (const node of nodes) {
      if (node.id === id) return node
      const child = findNode(node.children, id)
      if (child) return child
    }
    return null
  }

  onMount(() => {
    commandDisposables = [
      registerCommand('documents.newChapter', (target) => handleCreate('chapter', target)),
      registerCommand('documents.newScene', (target) => handleCreate('scene', target)),
      registerCommand('documents.newFolder', (target) => handleCreate('folder', target)),
      registerCommand('documents.rename', startRename),
      registerCommand('documents.archive', handleArchive)
    ]
  })

  onDestroy(() => {
    cancelPointerDrag()
    for (const disposable of commandDisposables) {
      disposable.dispose()
    }
    commandDisposables = []
  })
</script>

<div class="nav-view">
  <header class="zone-header nav-header">
    <span class="zone-title nav-title">Documents</span>
    <div class="nav-actions">
      <div class="sort-control">
        <button
          class="nav-icon-btn"
          class:active={sortMenuOpen}
          type="button"
          onclick={() => sortMenuOpen = !sortMenuOpen}
          title={`Sort: ${sortModeLabel($documentsSortMode)}`}
          aria-label={`Sort documents by ${sortModeLabel($documentsSortMode)}`}
          aria-haspopup="menu"
          aria-expanded={sortMenuOpen}
        >
          <SortAscendingIcon size={14} weight="bold" />
        </button>
        {#if sortMenuOpen}
          <div class="sort-menu" role="menu" tabindex="-1" onkeydown={onSortKeydown}>
            {#each sortOptions as option (option.mode)}
              <button
                type="button"
                class="sort-menu-item"
                class:active={$documentsSortMode === option.mode}
                role="menuitemradio"
                aria-checked={$documentsSortMode === option.mode}
                onclick={() => chooseSortMode(option.mode)}
              >
                <span>{option.label}</span>
                {#if $documentsSortMode === option.mode}
                  <span class="sort-check">✓</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <button
        class="nav-icon-btn"
        onclick={() => allExpanded ? collapseAll() : expandAll()}
        title={allExpanded ? 'Collapse all' : 'Expand all'}
        aria-label={allExpanded ? 'Collapse all documents' : 'Expand all documents'}
      >
        {allExpanded ? '⊟' : '⊞'}
      </button>
    </div>
  </header>
  <div class="nav-tree" role="tree" aria-label="Documents tree">
    <DocumentTree
      nodes={$docTree as DocNode[]}
      activeDocId={$activeDocId}
      {draggingDocId}
      {dragOverDocId}
      {dragOverPlacement}
      {renamingDocId}
      {renameValue}
      {focusRenameInput}
      {displayIcon}
      {isExpanded}
      onActivateIcon={activateIcon}
      onActivateNode={activateNode}
      onContextMenu={onTreeContextMenu}
      onDragStart={onTreeDragStart}
      onDragOver={onTreeDragOver}
      onDragLeave={onTreeDragLeave}
      onDrop={onTreeDrop}
      onDragEnd={onTreeDragEnd}
      onPointerDown={onTreePointerDown}
      onRenameInput={updateRenameValue}
      {onRenameKeydown}
      onRenameBlur={() => void commitRename()}
    />
  </div>
</div>

<style>
  .nav-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .nav-header {
    justify-content: space-between;
  }

  .nav-title {
    color: color-mix(in srgb, var(--accent-nav) 58%, var(--color-fg-muted));
  }

  .nav-actions {
    position: relative;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .sort-control {
    position: relative;
    display: inline-flex;
  }

  .nav-icon-btn {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 14px;
    color: var(--color-fg-muted);
    border-radius: var(--radius-sm);
    line-height: 1;
    transition: color 0.15s, background 0.15s, box-shadow 0.15s;
  }

  .nav-icon-btn:hover,
  .nav-icon-btn.active,
  .nav-icon-btn:focus-visible {
    color: var(--color-fg-primary);
    background: var(--color-hover);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-nav) 24%, transparent);
  }

  .nav-icon-btn:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 1px;
  }

  .sort-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 40;
    min-width: 168px;
    padding: var(--space-1) 0;
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-bg-surface);
    box-shadow: var(--shadow-panel);
  }

  .sort-menu-item {
    width: 100%;
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 0 var(--space-3);
    color: var(--color-fg-secondary);
    font: inherit;
    font-size: var(--font-size-sm);
    text-align: left;
    cursor: pointer;
  }

  .sort-menu-item:hover,
  .sort-menu-item.active {
    color: var(--color-fg-primary);
    background: var(--color-hover);
  }

  .sort-check {
    color: var(--accent-nav);
    font-weight: 700;
  }

  .nav-tree {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2) var(--space-2);
  }

</style>
