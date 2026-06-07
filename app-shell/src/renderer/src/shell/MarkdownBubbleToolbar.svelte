<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import type { Editor } from '@tiptap/core'

  export interface BubbleToolbarTextRange {
    from: number
    to: number
  }

  interface Props {
    editor: Editor | null
    onAnnotate?: ((range: BubbleToolbarTextRange) => void) | null
  }

  let { editor, onAnnotate = null }: Props = $props()

  let toolbarEl = $state<HTMLDivElement>()
  let visible = $state(false)
  let x = $state(0)
  let y = $state(0)
  let isBold = $state(false)
  let isItalic = $state(false)
  let isStrike = $state(false)
  let isCode = $state(false)
  let isBlockquote = $state(false)
  let headingLevel = $state(0)
  let selectedRange = $state<BubbleToolbarTextRange | null>(null)
  let annotationPointerHandled = false
  let raf = 0

  function toolbarHost(node: HTMLDivElement): void {
    toolbarEl = node
  }

  function updatePosition(): void {
    if (!editor || editor.state.selection.empty) {
      visible = false
      selectedRange = null
      return
    }

    const { from, to } = editor.state.selection
    selectedRange = { from, to }
    const start = editor.view.coordsAtPos(from)
    const end = editor.view.coordsAtPos(to)
    const midX = (start.left + end.right) / 2
    const topY = Math.min(start.top, end.top)
    const toolbarWidth = toolbarEl?.offsetWidth ?? 320
    const toolbarHeight = toolbarEl?.offsetHeight ?? 40

    let posX = midX - toolbarWidth / 2
    posX = Math.max(8, Math.min(posX, window.innerWidth - toolbarWidth - 8))

    let posY = topY - toolbarHeight - 8
    if (posY < 8) {
      posY = Math.max(start.bottom, end.bottom) + 8
    }

    x = posX
    y = posY
    visible = true
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

  function toggleBold(): void {
    editor?.chain().focus().toggleBold().run()
  }

  function toggleItalic(): void {
    editor?.chain().focus().toggleItalic().run()
  }

  function toggleStrike(): void {
    editor?.chain().focus().toggleStrike().run()
  }

  function toggleCode(): void {
    editor?.chain().focus().toggleCode().run()
  }

  function toggleBlockquote(): void {
    editor?.chain().focus().toggleBlockquote().run()
  }

  function toggleHeading(level: 1 | 2 | 3): void {
    if (headingLevel === level) {
      editor?.chain().focus().setParagraph().run()
    } else {
      editor?.chain().focus().toggleHeading({ level }).run()
    }
  }

  function requestAnnotation(range: BubbleToolbarTextRange): void {
    window.setTimeout(() => {
      onAnnotate?.(range)
      window.setTimeout(() => {
        annotationPointerHandled = false
      }, 0)
    }, 0)
  }

  function annotateFromPointer(event: PointerEvent): void {
    event.preventDefault()
    event.stopPropagation()
    if (!selectedRange) return
    annotationPointerHandled = true
    requestAnnotation(selectedRange)
  }

  function annotateFromClick(event: MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
    if (annotationPointerHandled || !selectedRange) return
    requestAnnotation(selectedRange)
  }
</script>

{#if visible && editor}
  <div
    class="editor-toolbar"
    {@attach toolbarHost}
    style:left="{x}px"
    style:top="{y}px"
    role="toolbar"
    aria-label="Text formatting"
  >
    <button
      class="tb-btn"
      class:active={isBold}
      title="Bold"
      onmousedown={(e) => { e.preventDefault(); toggleBold() }}
    ><strong>B</strong></button>

    <button
      class="tb-btn"
      class:active={isItalic}
      title="Italic"
      onmousedown={(e) => { e.preventDefault(); toggleItalic() }}
    ><em>I</em></button>

    <button
      class="tb-btn"
      class:active={isStrike}
      title="Strikethrough"
      onmousedown={(e) => { e.preventDefault(); toggleStrike() }}
    ><s>S</s></button>

    <button
      class="tb-btn mono"
      class:active={isCode}
      title="Inline code"
      onmousedown={(e) => { e.preventDefault(); toggleCode() }}
    >&lt;/&gt;</button>

    <span class="tb-sep"></span>

    <button
      class="tb-btn heading"
      class:active={headingLevel === 1}
      title="Heading 1"
      onmousedown={(e) => { e.preventDefault(); toggleHeading(1) }}
    >H1</button>

    <button
      class="tb-btn heading"
      class:active={headingLevel === 2}
      title="Heading 2"
      onmousedown={(e) => { e.preventDefault(); toggleHeading(2) }}
    >H2</button>

    <button
      class="tb-btn heading"
      class:active={headingLevel === 3}
      title="Heading 3"
      onmousedown={(e) => { e.preventDefault(); toggleHeading(3) }}
    >H3</button>

    <span class="tb-sep"></span>

    <button
      class="tb-btn"
      class:active={isBlockquote}
      title="Blockquote"
      onmousedown={(e) => { e.preventDefault(); toggleBlockquote() }}
    >❝</button>

    {#if onAnnotate}
      <span class="tb-sep"></span>

      <button
        type="button"
        class="tb-btn comment"
        title="Add comment"
        aria-label="Add comment to selected text"
        onpointerdown={annotateFromPointer}
        onclick={annotateFromClick}
      >Comment</button>
    {/if}
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
    background: color-mix(in srgb, var(--color-shell-inspector) 88%, transparent);
    backdrop-filter: blur(16px) saturate(1.4);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    border: 1px solid color-mix(in srgb, var(--accent-editor) 26%, var(--color-border));
    box-shadow: var(--shadow-panel);
    pointer-events: auto;
    animation: toolbar-in 0.12s ease-out;
  }

  @keyframes toolbar-in {
    from { opacity: 0; transform: translateY(4px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
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
    transition: color 0.1s, background 0.1s, box-shadow 0.1s;
    line-height: 1;
  }

  .tb-btn:hover {
    color: var(--color-fg-primary);
    background: var(--color-hover);
  }

  .tb-btn.active {
    color: var(--color-fg-primary);
    background: color-mix(in srgb, var(--accent-editor) 22%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-inspector) 30%, transparent);
  }

  .tb-btn.mono {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  .tb-btn.heading {
    font-weight: 700;
    font-size: var(--font-size-xs);
  }

  .tb-btn.comment {
    min-width: 76px;
    color: var(--color-fg-primary);
    font-size: var(--font-size-xs);
    font-weight: 700;
    background: color-mix(in srgb, #f7c948 20%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, #f7c948 34%, transparent);
  }

  .tb-btn.comment:hover {
    background: color-mix(in srgb, #f7c948 30%, transparent);
  }

  .tb-sep {
    width: 1px;
    height: 16px;
    background: color-mix(in srgb, var(--accent-inspector) 28%, var(--color-border));
    opacity: 0.5;
    margin: 0 2px;
    flex-shrink: 0;
  }
</style>
