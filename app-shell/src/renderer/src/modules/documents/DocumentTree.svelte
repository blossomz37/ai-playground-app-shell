<script lang="ts">
  import { slide } from 'svelte/transition'
  import DocumentTreeRow from './DocumentTreeRow.svelte'
  import type { DocNode, DocumentDropPlacement } from '@shared/state/documents-state'

  interface Props {
    nodes: DocNode[]
    activeDocId: string | null
    draggingDocId: string | null
    dragOverDocId: string | null
    dragOverPlacement: DocumentDropPlacement
    renamingDocId: string | null
    renameValue: string
    focusRenameInput: (node: HTMLInputElement) => void
    displayIcon: (node: DocNode) => string
    isExpanded: (id: string) => boolean
    onActivateIcon: (node: DocNode) => void
    onActivateNode: (node: DocNode) => void
    onContextMenu: (event: MouseEvent, node: DocNode) => void
    onDragStart: (event: DragEvent, node: DocNode) => void
    onDragOver: (event: DragEvent, node: DocNode) => void
    onDragLeave: (event: DragEvent, node: DocNode) => void
    onDrop: (event: DragEvent, node: DocNode) => void
    onDragEnd: () => void
    onPointerDown: (event: PointerEvent, node: DocNode) => void
    onRenameInput: (value: string) => void
    onRenameKeydown: (event: KeyboardEvent) => void
    onRenameBlur: () => void
  }

  let {
    nodes,
    activeDocId,
    draggingDocId,
    dragOverDocId,
    dragOverPlacement,
    renamingDocId,
    renameValue,
    focusRenameInput,
    displayIcon,
    isExpanded,
    onActivateIcon,
    onActivateNode,
    onContextMenu,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
    onPointerDown,
    onRenameInput,
    onRenameKeydown,
    onRenameBlur
  }: Props = $props()
</script>

{#snippet treeNode(node: DocNode, depth: number)}
  {@const expanded = isExpanded(node.id)}
  <DocumentTreeRow
    {node}
    {depth}
    active={activeDocId === node.id}
    dragging={draggingDocId === node.id}
    isDropTarget={dragOverDocId === node.id}
    dropPlacement={dragOverPlacement}
    renaming={renamingDocId === node.id}
    {renameValue}
    icon={displayIcon(node)}
    {expanded}
    {focusRenameInput}
    onActivateIcon={() => onActivateIcon(node)}
    onActivateNode={() => onActivateNode(node)}
    onContextMenu={(event) => onContextMenu(event, node)}
    onDragStart={(event) => onDragStart(event, node)}
    onDragOver={(event) => onDragOver(event, node)}
    onDragLeave={(event) => onDragLeave(event, node)}
    onDrop={(event) => onDrop(event, node)}
    {onDragEnd}
    onPointerDown={(event) => onPointerDown(event, node)}
    {onRenameInput}
    {onRenameKeydown}
    {onRenameBlur}
  />

  {#if node.children.length > 0 && expanded}
    <div transition:slide={{ duration: 150 }}>
      {#each node.children as child (child.id)}
        {@render treeNode(child, depth + 1)}
      {/each}
    </div>
  {/if}
{/snippet}

{#each nodes as node (node.id)}
  {@render treeNode(node, 0)}
{/each}
