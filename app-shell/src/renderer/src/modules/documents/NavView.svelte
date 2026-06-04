<script lang="ts">
  import { docTree, activeDocId, selectDoc } from '../../store'
  import { showContextMenu, type ContextMenuItem } from '../../store/contextmenu'
  import { slide } from 'svelte/transition'
  import { SvelteSet } from 'svelte/reactivity'
  import type { Doc } from '@shared/module-contract'

  interface DocNode extends Doc { children: DocNode[] }

  let expanded = new SvelteSet<string>()

  function toggle(id: string) {
    expanded.has(id) ? expanded.delete(id) : expanded.add(id)
  }

  /** Collect all folder IDs from the tree. */
  function allFolderIds(nodes: DocNode[]): string[] {
    const ids: string[] = []
    for (const n of nodes) {
      if (n.kind === 'folder') {
        ids.push(n.id)
        ids.push(...allFolderIds(n.children))
      }
    }
    return ids
  }

  function expandAll() {
    expanded.clear()
    for (const id of allFolderIds($docTree as DocNode[])) {
      expanded.add(id)
    }
  }

  function collapseAll() {
    expanded.clear()
  }

  let allExpanded = $derived.by(() => {
    const folderIds = allFolderIds($docTree as DocNode[])
    return folderIds.length > 0 && folderIds.every(id => expanded.has(id))
  })

  function onTreeContextMenu(e: MouseEvent, node: DocNode) {
    e.preventDefault()
    const items: ContextMenuItem[] = [
      { id: 'documents.newChapter', label: 'New Chapter', icon: '◉' },
      { id: 'documents.newScene',   label: 'New Scene',   icon: '○' },
      { id: 'documents.newFolder',  label: 'New Folder',  icon: '▶' },
      { id: '_sep1', label: '', separator: true },
      { id: 'documents.rename',  label: 'Rename',  icon: '✎' },
      { id: 'documents.archive', label: 'Archive', icon: '📦' },
    ]
    showContextMenu(e.clientX, e.clientY, items)
  }
</script>

{#snippet treeNode(node: DocNode, depth: number)}
  <div
    class="tree-item"
    class:active={$activeDocId === node.id}
    style:padding-left="{12 + depth * 16}px"
    role="button"
    tabindex="0"
    onclick={() => node.kind === 'folder' ? toggle(node.id) : selectDoc(node.id)}
    onkeydown={(e) => e.key === 'Enter' && (node.kind === 'folder' ? toggle(node.id) : selectDoc(node.id))}
    oncontextmenu={(e) => onTreeContextMenu(e, node)}
  >
    <span class="glyph" class:is-folder={node.kind === 'folder'}>
      {#if node.kind === 'folder'}
        <span class="folder-chevron" class:open={expanded.has(node.id)}>▶</span>
      {:else if node.kind === 'chapter'}
        ◉
      {:else}
        ○
      {/if}
    </span>
    <span class="title">{node.title}</span>
  </div>

  {#if node.kind === 'folder' && expanded.has(node.id)}
    <div transition:slide={{ duration: 150 }}>
      {#each node.children as child (child.id)}
        {@render treeNode(child, depth + 1)}
      {/each}
    </div>
  {/if}
{/snippet}

<div class="nav-view">
  <header class="nav-header">
    <span class="nav-title">Manuscript</span>
    <button
      class="collapse-btn"
      onclick={() => allExpanded ? collapseAll() : expandAll()}
      title={allExpanded ? 'Collapse all' : 'Expand all'}
      aria-label={allExpanded ? 'Collapse all folders' : 'Expand all folders'}
    >
      {allExpanded ? '⊟' : '⊞'}
    </button>
  </header>
  <div class="nav-tree">
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 34px;
    padding: 0 var(--space-3);
    border-bottom: var(--border-subtle);
    flex-shrink: 0;
  }

  .nav-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .collapse-btn {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 14px;
    color: var(--color-fg-muted);
    padding: 2px 4px;
    border-radius: var(--radius-sm);
    line-height: 1;
    transition: color 0.15s, background 0.15s;
  }

  .collapse-btn:hover {
    color: var(--color-fg-primary);
    background: var(--color-bg-overlay);
  }

  .nav-tree {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-1) 0;
  }

  .tree-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: 26px;
    padding-right: var(--space-3);
    cursor: pointer;
    color: var(--color-fg-secondary);
    font-size: var(--font-size-sm);
    user-select: none;
    outline: none;
  }

  .tree-item:hover  { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .tree-item.active { background: var(--color-accent-dim); color: var(--color-accent); }

  .glyph {
    width: 14px;
    text-align: center;
    font-size: 10px;
    color: var(--color-fg-muted);
    flex-shrink: 0;
  }
  .glyph.is-folder { color: var(--color-accent); }

  .folder-chevron {
    display: inline-block;
    transition: transform 0.2s ease;
  }

  .folder-chevron.open {
    transform: rotate(90deg);
  }

  .title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
