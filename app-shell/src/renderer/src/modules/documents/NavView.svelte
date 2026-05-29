<script lang="ts">
  import { docTree, activeDocId, selectDoc } from '../../store'
  import type { Doc } from '@shared/module-contract'

  interface DocNode extends Doc { children: DocNode[] }

  let expanded = $state(new Set<string>())

  function toggle(id: string) {
    const next = new Set(expanded)
    next.has(id) ? next.delete(id) : next.add(id)
    expanded = next
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
  >
    <span class="glyph" class:is-folder={node.kind === 'folder'}>
      {#if node.kind === 'folder'}
        {expanded.has(node.id) ? '▼' : '▶'}
      {:else if node.kind === 'chapter'}
        ◉
      {:else}
        ○
      {/if}
    </span>
    <span class="title">{node.title}</span>
  </div>

  {#if node.kind === 'folder' && expanded.has(node.id)}
    {#each node.children as child}
      {@render treeNode(child, depth + 1)}
    {/each}
  {/if}
{/snippet}

<div class="nav-view">
  <header class="nav-header">
    <span class="nav-title">Manuscript</span>
  </header>
  <div class="nav-tree">
    {#each $docTree as node}
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
    padding: var(--space-3);
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

  .nav-tree {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2) 0;
  }

  .tree-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: 28px;
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

  .title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
