<script lang="ts">
  import type { DocNode, DocumentDropPlacement } from '@shared/state/documents-state'

  interface Props {
    node: DocNode
    depth: number
    active: boolean
    dragging: boolean
    isDropTarget: boolean
    dropPlacement: DocumentDropPlacement
    renaming: boolean
    renameValue: string
    icon: string
    expanded: boolean
    contextIncluded: boolean
    contextPartial: boolean
    contextDisabled: boolean
    contextTokens: number
    showContextCount: boolean
    showContextSwitch: boolean
    focusRenameInput: (node: HTMLInputElement) => void
    onActivateIcon: () => void
    onActivateNode: () => void
    onToggleContext: (event: MouseEvent) => void
    onContextMenu: (event: MouseEvent) => void
    onDragStart: (event: DragEvent) => void
    onDragOver: (event: DragEvent) => void
    onDragLeave: (event: DragEvent) => void
    onDrop: (event: DragEvent) => void
    onDragEnd: () => void
    onPointerDown: (event: PointerEvent) => void
    onRenameInput: (value: string) => void
    onRenameKeydown: (event: KeyboardEvent) => void
    onRenameBlur: () => void
  }

  let {
    node,
    depth,
    active,
    dragging,
    isDropTarget,
    dropPlacement,
    renaming,
    renameValue,
    icon,
    expanded,
    contextIncluded,
    contextPartial,
    contextDisabled,
    contextTokens,
    showContextCount,
    showContextSwitch,
    focusRenameInput,
    onActivateIcon,
    onActivateNode,
    onToggleContext,
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

  let rowLabel = $derived(node.nodeType === 'folder'
    ? `${expanded ? 'Collapse' : 'Expand'} ${node.title}`
    : `Open ${node.title}`)
  let contextLabel = $derived(contextDisabled
    ? `${node.title} has no documents to include as AI context`
    : `${contextIncluded ? 'Remove' : 'Include'} ${node.title} as AI context`)
  let countLabel = $derived(contextTokens.toLocaleString())
</script>

<div
  class="tree-row"
  data-doc-id={node.id}
  class:active
  class:dragging
  class:drop-before={isDropTarget && dropPlacement === 'before'}
  class:drop-after={isDropTarget && dropPlacement === 'after'}
  class:drop-inside={isDropTarget && dropPlacement === 'inside'}
  style:padding-left="{12 + depth * 16}px"
  role="treeitem"
  aria-level={depth + 1}
  aria-selected={active}
  tabindex="-1"
  draggable={!renaming}
  ondragstart={onDragStart}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
  ondragend={onDragEnd}
  onpointerdown={onPointerDown}
>
  <button
    type="button"
    class="icon-button"
    class:is-folder={node.nodeType === 'folder'}
    aria-label={rowLabel}
    aria-expanded={node.children.length > 0 ? expanded : undefined}
    draggable={true}
    ondragstart={onDragStart}
    ondragend={onDragEnd}
    onclick={onActivateIcon}
    oncontextmenu={onContextMenu}
  >
    {icon}
  </button>
  {#if renaming}
    <input
      class="rename-input"
      value={renameValue}
      aria-label="Rename document"
      {@attach focusRenameInput}
      oninput={(event) => onRenameInput(event.currentTarget.value)}
      onkeydown={onRenameKeydown}
      onblur={onRenameBlur}
    />
  {:else}
    <button
      type="button"
      class="title-button"
      aria-label={rowLabel}
      draggable={true}
      ondragstart={onDragStart}
      ondragend={onDragEnd}
      onclick={onActivateNode}
      oncontextmenu={onContextMenu}
    >
      <span class="title">{node.title}</span>
    </button>
    {#if showContextCount}
      <span class="context-count">{countLabel}</span>
    {/if}
    {#if showContextSwitch}
      <button
        type="button"
        class="context-switch"
        class:included={contextIncluded}
        class:partial={contextPartial}
        title={contextLabel}
        aria-label={contextLabel}
        aria-pressed={contextPartial ? 'mixed' : contextIncluded}
        disabled={contextDisabled}
        onclick={onToggleContext}
        onpointerdown={(event) => event.stopPropagation()}
      ></button>
    {/if}
  {/if}
</div>

<style>
  .tree-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-1);
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

  .context-count {
    flex: 0 0 58px;
    color: color-mix(in srgb, var(--accent-nav) 50%, var(--color-fg-muted));
    font-size: var(--font-size-xs);
    text-align: right;
  }

  .context-switch {
    position: relative;
    display: inline-flex;
    flex: 0 0 32px;
    width: 32px;
    height: 18px;
    border: none;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent-nav) 20%, var(--color-bg-overlay));
    cursor: pointer;
    padding: 0;
    transition: background 0.15s ease, opacity 0.15s ease;
  }

  .context-switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: var(--color-bg-base);
    box-shadow: 0 1px 2px color-mix(in srgb, var(--color-fg-primary) 18%, transparent);
    transition: transform 0.15s ease;
  }

  .context-switch.included {
    background: color-mix(in srgb, var(--color-accent) 62%, var(--accent-nav));
  }

  .context-switch.included::after {
    transform: translateX(14px);
  }

  .context-switch.partial {
    background: color-mix(in srgb, var(--color-accent) 34%, var(--color-bg-overlay));
  }

  .context-switch:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .context-switch:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 1px;
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
