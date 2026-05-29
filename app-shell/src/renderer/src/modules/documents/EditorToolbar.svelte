<!-- ──────────────────────────────────────────────
  File:        EditorToolbar.svelte
  Description: Floating bubble menu on text selection — format actions
  Version:     0.1.0
  Created:     2026-05-29
  Modified:    2026-05-29
  Author:      carlo
  ────────────────────────────────────────────── -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { Editor } from '@tiptap/core'

  interface Props {
    editor: Editor | null
  }

  let { editor }: Props = $props()

  let toolbarEl = $state<HTMLDivElement>()
  let visible = $state(false)
  let x = $state(0)
  let y = $state(0)

  // Active mark/node states for highlighting
  let isBold = $state(false)
  let isItalic = $state(false)
  let isStrike = $state(false)
  let isCode = $state(false)
  let isBlockquote = $state(false)
  let headingLevel = $state(0) // 0 = paragraph

  let raf = 0

  function updatePosition(): void {
    if (!editor || editor.state.selection.empty) {
      visible = false
      return
    }

    // Get the selection coordinates from ProseMirror's coordsAtPos
    const { from, to } = editor.state.selection
    const start = editor.view.coordsAtPos(from)
    const end = editor.view.coordsAtPos(to)

    // Position above the selection midpoint
    const midX = (start.left + end.right) / 2
    const topY = Math.min(start.top, end.top)

    const toolbarWidth = toolbarEl?.offsetWidth ?? 320
    const toolbarHeight = toolbarEl?.offsetHeight ?? 40

    // Clamp within viewport
    let posX = midX - toolbarWidth / 2
    posX = Math.max(8, Math.min(posX, window.innerWidth - toolbarWidth - 8))

    let posY = topY - toolbarHeight - 8
    // Flip below if it would go off top
    if (posY < 8) {
      posY = Math.max(start.bottom, end.bottom) + 8
    }

    x = posX
    y = posY
    visible = true

    // Update active states
    isBold = editor.isActive('bold')
    isItalic = editor.isActive('italic')
    isStrike = editor.isActive('strike')
    isCode = editor.isActive('code')
    isBlockquote = editor.isActive('blockquote')
    headingLevel = editor.isActive('heading') ? (editor.getAttributes('heading').level as number) : 0
  }

  function tick(): void {
    updatePosition()
    raf = requestAnimationFrame(tick)
  }

  onMount(() => {
    raf = requestAnimationFrame(tick)
  })

  onDestroy(() => {
    cancelAnimationFrame(raf)
  })

  // --- Actions ---

  function toggleBold() { editor?.chain().focus().toggleBold().run() }
  function toggleItalic() { editor?.chain().focus().toggleItalic().run() }
  function toggleStrike() { editor?.chain().focus().toggleStrike().run() }
  function toggleCode() { editor?.chain().focus().toggleCode().run() }
  function toggleBlockquote() { editor?.chain().focus().toggleBlockquote().run() }

  function toggleHeading(level: 1 | 2 | 3) {
    if (headingLevel === level) {
      editor?.chain().focus().setParagraph().run()
    } else {
      editor?.chain().focus().toggleHeading({ level }).run()
    }
  }
</script>

{#if visible && editor}
  <div
    class="editor-toolbar"
    bind:this={toolbarEl}
    style:left="{x}px"
    style:top="{y}px"
    role="toolbar"
    aria-label="Text formatting"
  >
    <button
      class="tb-btn" class:active={isBold}
      title="Bold"
      onmousedown={(e) => { e.preventDefault(); toggleBold() }}
    ><strong>B</strong></button>

    <button
      class="tb-btn" class:active={isItalic}
      title="Italic"
      onmousedown={(e) => { e.preventDefault(); toggleItalic() }}
    ><em>I</em></button>

    <button
      class="tb-btn" class:active={isStrike}
      title="Strikethrough"
      onmousedown={(e) => { e.preventDefault(); toggleStrike() }}
    ><s>S</s></button>

    <button
      class="tb-btn mono" class:active={isCode}
      title="Inline code"
      onmousedown={(e) => { e.preventDefault(); toggleCode() }}
    >&lt;/&gt;</button>

    <span class="tb-sep"></span>

    <button
      class="tb-btn heading" class:active={headingLevel === 1}
      title="Heading 1"
      onmousedown={(e) => { e.preventDefault(); toggleHeading(1) }}
    >H1</button>

    <button
      class="tb-btn heading" class:active={headingLevel === 2}
      title="Heading 2"
      onmousedown={(e) => { e.preventDefault(); toggleHeading(2) }}
    >H2</button>

    <button
      class="tb-btn heading" class:active={headingLevel === 3}
      title="Heading 3"
      onmousedown={(e) => { e.preventDefault(); toggleHeading(3) }}
    >H3</button>

    <span class="tb-sep"></span>

    <button
      class="tb-btn" class:active={isBlockquote}
      title="Blockquote"
      onmousedown={(e) => { e.preventDefault(); toggleBlockquote() }}
    >❝</button>
  </div>
{/if}

<style>
  .editor-toolbar {
    position: fixed;
    z-index: 900;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 6px;
    border-radius: var(--radius-md);
    background: rgba(36, 36, 62, 0.88);
    backdrop-filter: blur(16px) saturate(1.4);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    border: 1px solid rgba(137, 180, 250, 0.15);
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.04) inset;
    pointer-events: auto;
    animation: toolbar-in 0.12s ease-out;
  }

  @keyframes toolbar-in {
    from { opacity: 0; transform: translateY(4px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .tb-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0 6px;
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);
    cursor: pointer;
    transition: color 0.1s, background 0.1s;
    line-height: 1;
  }

  .tb-btn:hover {
    color: var(--color-fg-primary);
    background: rgba(255, 255, 255, 0.08);
  }

  .tb-btn.active {
    color: var(--color-accent);
    background: var(--color-accent-dim);
  }

  .tb-btn.mono {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    letter-spacing: -0.02em;
  }

  .tb-btn.heading {
    font-weight: 700;
    font-size: var(--font-size-xs);
    letter-spacing: 0.02em;
  }

  .tb-sep {
    width: 1px;
    height: 16px;
    background: var(--color-border);
    opacity: 0.5;
    margin: 0 2px;
    flex-shrink: 0;
  }
</style>
