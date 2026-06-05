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
  import { slide } from 'svelte/transition'
  import { SvelteSet } from 'svelte/reactivity'
  import { SortAscendingIcon } from 'phosphor-svelte'
  import type { Disposable } from '@shared/module-contract'
  import type { DocumentDropPlacement, DocumentsSortMode } from '@shared/state/documents-state'
  import type { Doc } from '@shared/module-contract'

  interface DocNode extends Doc { children: DocNode[] }

  let expanded = new SvelteSet<string>()
  let renamingDocId = $state<string | null>(null)
  let renameValue = $state('')
  let sortMenuOpen = $state(false)
  let draggingDocId = $state<string | null>(null)
  let dragOverDocId = $state<string | null>(null)
  let dragOverPlacement = $state<DocumentDropPlacement>('inside')
  let pointerDrag = $state<{
    sourceId: string
    startX: number
    startY: number
    dragging: boolean
  } | null>(null)
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
    event.dataTransfer?.setData('text/plain', node.id)
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
    }
  }

  function onTreeDragOver(event: DragEvent, node: DocNode) {
    const sourceId = draggingDocId ?? event.dataTransfer?.getData('text/plain') ?? null
    if (!sourceId || sourceId === node.id) return

    event.preventDefault()
    dragOverDocId = node.id
    dragOverPlacement = placementFromPoint(event.currentTarget as HTMLElement, event.clientY)

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  function onTreeDragLeave(event: DragEvent, node: DocNode) {
    const target = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return
    if (dragOverDocId === node.id) {
      dragOverDocId = null
    }
  }

  async function onTreeDrop(event: DragEvent, node: DocNode) {
    event.preventDefault()
    const sourceId = draggingDocId ?? event.dataTransfer?.getData('text/plain') ?? null
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

    pointerDrag = {
      sourceId: node.id,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false
    }
    window.addEventListener('pointermove', onTreePointerMove)
    window.addEventListener('pointerup', onTreePointerUp, { once: true })
  }

  function onTreePointerMove(event: PointerEvent) {
    if (!pointerDrag) return

    const distance = Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY)
    if (!pointerDrag.dragging && distance < 6) return

    pointerDrag.dragging = true
    draggingDocId = pointerDrag.sourceId
    event.preventDefault()

    const targetRow = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-doc-id]')
    if (!targetRow) {
      dragOverDocId = null
      return
    }

    const targetId = targetRow.dataset.docId ?? null
    if (!targetId || targetId === pointerDrag.sourceId) {
      dragOverDocId = null
      return
    }

    dragOverDocId = targetId
    dragOverPlacement = placementFromPoint(targetRow, event.clientY)
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

  function placementFromPoint(target: HTMLElement, clientY: number): DocumentDropPlacement {
    const rect = target.getBoundingClientRect()
    const offset = clientY - rect.top
    const third = rect.height / 3

    if (offset < third) return 'before'
    if (offset > third * 2) return 'after'
    return 'inside'
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

{#snippet treeNode(node: DocNode, depth: number)}
  <div
    class="tree-row"
    data-doc-id={node.id}
    class:active={$activeDocId === node.id}
    class:dragging={draggingDocId === node.id}
    class:drop-before={dragOverDocId === node.id && dragOverPlacement === 'before'}
    class:drop-after={dragOverDocId === node.id && dragOverPlacement === 'after'}
    class:drop-inside={dragOverDocId === node.id && dragOverPlacement === 'inside'}
    style:padding-left="{12 + depth * 16}px"
    role="treeitem"
    aria-level={depth + 1}
    aria-selected={$activeDocId === node.id}
    tabindex="-1"
    draggable={renamingDocId !== node.id}
    ondragstart={(event) => onTreeDragStart(event, node)}
    ondragover={(event) => onTreeDragOver(event, node)}
    ondragleave={(event) => onTreeDragLeave(event, node)}
    ondrop={(event) => onTreeDrop(event, node)}
    ondragend={onTreeDragEnd}
    onpointerdown={(event) => onTreePointerDown(event, node)}
  >
    <button
      type="button"
      class="icon-button"
      class:is-folder={node.kind === 'folder'}
      aria-label={node.children.length > 0 ? `${isExpanded(node.id) ? 'Collapse' : 'Expand'} ${node.title}` : `Open ${node.title}`}
      aria-expanded={node.children.length > 0 ? isExpanded(node.id) : undefined}
      draggable={true}
      ondragstart={(event) => onTreeDragStart(event, node)}
      ondragend={onTreeDragEnd}
      onclick={() => activateIcon(node)}
      oncontextmenu={(e) => onTreeContextMenu(e, node)}
    >
      {displayIcon(node)}
    </button>
    {#if renamingDocId === node.id}
      <input
        class="rename-input"
        bind:value={renameValue}
        aria-label="Rename document"
        {@attach focusRenameInput}
        onkeydown={onRenameKeydown}
        onblur={() => void commitRename()}
      />
    {:else}
      <button
        type="button"
        class="title-button"
        aria-label={node.kind === 'folder' ? `${isExpanded(node.id) ? 'Collapse' : 'Expand'} ${node.title}` : `Open ${node.title}`}
        draggable={true}
        ondragstart={(event) => onTreeDragStart(event, node)}
        ondragend={onTreeDragEnd}
        onclick={() => activateNode(node)}
        oncontextmenu={(e) => onTreeContextMenu(e, node)}
      >
        <span class="title">{node.title}</span>
      </button>
    {/if}
  </div>

  {#if node.children.length > 0 && isExpanded(node.id)}
    <div transition:slide={{ duration: 150 }}>
      {#each node.children as child (child.id)}
        {@render treeNode(child, depth + 1)}
      {/each}
    </div>
  {/if}
{/snippet}

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
    {#each $docTree as node (node.id)}
      {@render treeNode(node as DocNode, 0)}
    {/each}
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

  .tree-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 2px;
    height: 28px;
    padding-right: var(--space-3);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-sm);
    user-select: none;
    outline: none;
    transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  }

  .tree-row:hover  {
    background: var(--color-hover);
    color: var(--color-fg-primary);
  }

  .tree-row.active {
    background: color-mix(in srgb, var(--accent-nav) 15%, var(--color-shell-sidebar));
    color: var(--color-fg-primary);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-nav) 24%, transparent);
  }

  .tree-row.dragging {
    opacity: 0.5;
  }

  .tree-row.drop-inside {
    background: color-mix(in srgb, var(--accent-nav) 18%, var(--color-shell-sidebar));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-nav) 42%, transparent);
  }

  .tree-row.drop-before::after,
  .tree-row.drop-after::after {
    content: '';
    position: absolute;
    left: 8px;
    right: 8px;
    height: 2px;
    border-radius: 999px;
    background: var(--color-focus-ring);
    box-shadow: 0 0 10px color-mix(in srgb, var(--color-focus-ring) 62%, transparent);
  }

  .tree-row.drop-before::after {
    top: -1px;
  }

  .tree-row.drop-after::after {
    bottom: -1px;
  }

  .tree-row.active::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 6px;
    bottom: 6px;
    width: 3px;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--accent-nav), var(--accent-inspector));
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent-nav) 50%, transparent);
  }

  .icon-button {
    width: 24px;
    height: 100%;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-fg-muted);
    cursor: pointer;
    padding: 0;
    font-size: 14px;
    line-height: 1;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .icon-button:hover,
  .icon-button:focus-visible {
    color: var(--color-fg-primary);
    background: color-mix(in srgb, var(--accent-nav) 14%, transparent);
  }

  .icon-button:focus-visible,
  .title-button:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 1px;
  }

  .title-button {
    min-width: 0;
    flex: 1;
    display: inline-flex;
    align-items: center;
    height: 100%;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    padding: 0;
    text-align: left;
    font: inherit;
  }

  .icon-button.is-folder {
    color: var(--accent-inspector);
  }

  .title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rename-input {
    min-width: 0;
    flex: 1;
    height: 22px;
    border: 1px solid color-mix(in srgb, var(--accent-nav) 48%, var(--color-border));
    border-radius: var(--radius-sm);
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
    font: inherit;
    padding: 0 var(--space-2);
    outline: none;
  }

  .rename-input:focus {
    border-color: var(--color-focus-ring);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-focus-ring) 24%, transparent);
  }
</style>
