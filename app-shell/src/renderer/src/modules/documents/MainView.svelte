<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { get } from 'svelte/store'
  import { Editor } from '@tiptap/core'
  import StarterKit from '@tiptap/starter-kit'
  import { Table } from '@tiptap/extension-table'
  import TableCell from '@tiptap/extension-table-cell'
  import TableHeader from '@tiptap/extension-table-header'
  import TableRow from '@tiptap/extension-table-row'
  import { Markdown } from 'tiptap-markdown'
  import {
    activeDoc, editorContent, saveDoc, setEditorContent,
    editorSettings, scheduleAutoSave, cancelAutoSave, isDirty
  } from '../../store'
  import { registerCommand } from '../../store/commands'
  import { clearShellContextDescriptor, setShellContextDescriptor } from '../../store/shell-context'
  import type { ShellContextDescriptor } from '../../store/shell-context'
  import type { Disposable } from '@shared/module-contract'
  import EditorToolbar from './EditorToolbar.svelte'

  let element: HTMLDivElement | null = null
  let editor = $state<Editor | null>(null)
  let saveCommand: Disposable | null = null
  let editorContentUnsubscribe: (() => void) | null = null
  let contextUnsubscribers: Array<() => void> = []
  let captureMarkdownListener: ((event: Event) => void) | null = null

  function buildDocumentContextDescriptor(): ShellContextDescriptor {
    const doc = get(activeDoc)
    const dirty = get(isDirty)

    if (!doc) {
      return {
        moduleId: 'shell.documents',
        primaryLabel: 'Manuscript',
        secondaryLabel: 'Select a document',
        trail: [{ id: 'documents-root', label: 'Manuscript' }]
      }
    }

    return {
      moduleId: 'shell.documents',
      primaryLabel: doc.title,
      trail: [
        { id: 'documents-root', label: 'Manuscript' },
        { id: doc.id, label: doc.title }
      ],
      actions: dirty
        ? [{ id: 'documents-save', label: 'Save', commandId: 'documents.save' }]
        : []
    }
  }

  function refreshDocumentContextDescriptor(): void {
    setShellContextDescriptor(buildDocumentContextDescriptor())
  }

  function toggleBold(): void {
    editor?.chain().focus().toggleBold().run()
  }

  function toggleItalic(): void {
    editor?.chain().focus().toggleItalic().run()
  }

  function toggleStrike(): void {
    editor?.chain().focus().toggleStrike().run()
  }

  function setParagraph(): void {
    editor?.chain().focus().setParagraph().run()
  }

  function toggleHeading(level: 1 | 2): void {
    editor?.chain().focus().toggleHeading({ level }).run()
  }

  function toggleBlockquote(): void {
    editor?.chain().focus().toggleBlockquote().run()
  }

  function editorHost(node: HTMLDivElement): void {
    element = node
  }

  onMount(() => {
    if (!element) return

    editor = new Editor({
      element,
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Markdown.configure({ transformPastedText: true })
      ],
      content: get(editorContent),
      onUpdate: ({ editor }) => {
        setEditorContent(editor.storage.markdown.getMarkdown())
        scheduleAutoSave()
      },
    })

    // Interactive handler for documents.save: the renderer owns it because the
    // content to save lives in the open editor / store. Keybinding (CmdOrCtrl+S)
    // and the command palette both dispatch here via executeCommand.
    saveCommand = registerCommand('documents.save', () => saveDoc())

    editorContentUnsubscribe = editorContent.subscribe((md) => {
      if (!editor) return
      if (md !== editor.storage.markdown.getMarkdown()) {
        editor.commands.setContent(md, { emitUpdate: false })
      }
    })

    contextUnsubscribers = [
      activeDoc.subscribe(refreshDocumentContextDescriptor),
      isDirty.subscribe(refreshDocumentContextDescriptor)
    ]

    captureMarkdownListener = (event: Event) => {
      const markdown = (event as CustomEvent<string>).detail
      if (!markdown || !editor) return
      editor.commands.setContent(markdown, { emitUpdate: false })
      setEditorContent(editor.storage.markdown.getMarkdown(), { dirty: false })
    }
    window.addEventListener('shell:capture-document-markdown', captureMarkdownListener)
  })

  onDestroy(() => {
    cancelAutoSave()
    editorContentUnsubscribe?.()
    for (const unsubscribe of contextUnsubscribers) unsubscribe()
    contextUnsubscribers = []
    clearShellContextDescriptor('shell.documents')
    if (captureMarkdownListener) {
      window.removeEventListener('shell:capture-document-markdown', captureMarkdownListener)
    }
    saveCommand?.dispose()
    editor?.destroy()
  })
</script>

<div class="main-view">
  {#if $activeDoc}
    <header class="doc-toolbar" aria-label="Document editing toolbar">
      <div class="toolbar-group" role="group" aria-label="Text style">
        <button type="button" class="tool-btn" aria-label="Paragraph" disabled={!editor} onclick={setParagraph}>P</button>
        <button type="button" class="tool-btn" aria-label="Heading 1" disabled={!editor} onclick={() => toggleHeading(1)}>H1</button>
        <button type="button" class="tool-btn" aria-label="Heading 2" disabled={!editor} onclick={() => toggleHeading(2)}>H2</button>
      </div>
      <div class="toolbar-group" role="group" aria-label="Formatting">
        <button type="button" class="tool-btn" aria-label="Bold" disabled={!editor} onclick={toggleBold}><strong>B</strong></button>
        <button type="button" class="tool-btn" aria-label="Italic" disabled={!editor} onclick={toggleItalic}><em>I</em></button>
        <button type="button" class="tool-btn" aria-label="Strikethrough" disabled={!editor} onclick={toggleStrike}><s>S</s></button>
        <button type="button" class="tool-btn" aria-label="Blockquote" disabled={!editor} onclick={toggleBlockquote}>&gt;</button>
      </div>
    </header>
  {/if}

  <!-- TipTap mounts into this element; always present so the editor instance is stable -->
  <div
    class="editor-area"
    class:hidden={!$activeDoc}
    {@attach editorHost}
    role="textbox"
    tabindex="-1"
    style:--editor-font={$editorSettings.fontFamily}
    style:--editor-font-size={$editorSettings.fontSize}
  ></div>

  <EditorToolbar {editor} />

  {#if !$activeDoc}
    <div class="empty">
      <p>Select a document from the sidebar to begin.</p>
    </div>
  {/if}
</div>

<style>
  .main-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background:
      radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--accent-editor) 7%, transparent), transparent 28%),
      var(--color-shell-main);
  }

  .doc-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 42px;
    padding: 0 clamp(var(--space-5), 6vw, 72px);
    border-bottom: var(--border-zone);
    flex-shrink: 0;
    background: color-mix(in srgb, var(--color-shell-main) 88%, var(--color-panel-glint));
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 2px;
    padding-right: var(--space-2);
    border-right: var(--border-subtle);
  }

  .toolbar-group:last-child {
    border-right: none;
  }

  .tool-btn {
    min-width: 30px;
    height: 28px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    font-weight: 700;
  }

  .tool-btn:hover:not(:disabled) {
    background: var(--color-hover);
    color: var(--color-fg-primary);
  }

  .tool-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .editor-area {
    flex: 1;
    overflow-y: auto;
    display: block;
    scrollbar-gutter: stable both-edges;
    background:
      linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-panel-glint) 24%, transparent) 50%, transparent),
      transparent;
  }

  .editor-area::selection,
  .editor-area :global(.ProseMirror ::selection) {
    background: color-mix(in srgb, var(--accent-editor) 28%, transparent);
    color: var(--color-fg-primary);
  }

  .editor-area.hidden {
    display: none;
  }

  /* TipTap injects .ProseMirror; style the prose surface here.
     Font and size cascade from editorSettings via CSS custom properties. */
  .editor-area :global(.ProseMirror) {
    min-height: 100%;
    outline: none;
    color: var(--color-fg-primary);
    font-family: var(--editor-font, var(--font-serif));
    font-size: var(--editor-font-size, var(--font-size-lg));
    line-height: 1.72;
    padding: clamp(34px, 6vh, 70px) clamp(var(--space-5), 7vw, 84px) 96px;
    max-width: 78ch;
    margin: 0 auto;
  }

  .editor-area :global(.ProseMirror p) {
    margin: 0 0 1.05em;
  }

  .editor-area :global(.ProseMirror h1) {
    font-size: clamp(26px, 3vw, 34px);
    font-weight: 650;
    margin: var(--space-3) 0 var(--space-5);
    line-height: 1.22;
    color: var(--color-fg-primary);
  }

  .editor-area :global(.ProseMirror h2) {
    font-size: var(--font-size-xl);
    font-weight: 600;
    margin: var(--space-6) 0 var(--space-3);
    color: color-mix(in srgb, var(--accent-editor) 28%, var(--color-fg-primary));
  }

  .editor-area :global(.ProseMirror h3) {
    font-size: var(--font-size-lg);
    font-weight: 650;
    margin: var(--space-5) 0 var(--space-2);
    color: color-mix(in srgb, var(--accent-inspector) 36%, var(--color-fg-secondary));
  }

  .editor-area :global(.ProseMirror blockquote) {
    border-left: 3px solid var(--accent-inspector);
    margin: 0 0 var(--space-4);
    padding-left: var(--space-4);
    color: var(--color-fg-secondary);
    font-style: italic;
  }

  .editor-area :global(.ProseMirror ul),
  .editor-area :global(.ProseMirror ol) {
    margin: 0 0 var(--space-4);
    padding-left: var(--space-6);
  }

  .editor-area :global(.ProseMirror code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
    background: color-mix(in srgb, var(--accent-inspector) 12%, var(--color-shell-inspector));
    padding: 1px 5px;
    border-radius: var(--radius-sm);
  }

  .editor-area :global(.ProseMirror pre) {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    background: color-mix(in srgb, var(--color-shell-inspector) 82%, black);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 24%, var(--color-border));
    margin: 0 0 var(--space-4);
    overflow-x: auto;
  }

  .editor-area :global(.ProseMirror pre code) {
    background: none;
    padding: 0;
  }

  .editor-area :global(.ProseMirror .tableWrapper) {
    overflow-x: auto;
    margin: var(--space-4) 0 var(--space-5);
  }

  .editor-area :global(.ProseMirror table) {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    background: var(--editor-table-cell-bg);
    border-top: 1px solid var(--editor-table-border);
    border-bottom: 1px solid var(--editor-table-border);
  }

  .editor-area :global(.ProseMirror th),
  .editor-area :global(.ProseMirror td) {
    position: relative;
    min-width: 90px;
    padding: 10px var(--space-3);
    border: none;
    border-bottom: 1px solid var(--editor-table-border);
    vertical-align: top;
    background: var(--editor-table-cell-bg);
  }

  .editor-area :global(.ProseMirror th) {
    background: var(--editor-table-header-bg);
    color: var(--editor-table-header-fg);
    font-weight: 700;
  }

  .editor-area :global(.ProseMirror td) {
    color: var(--color-fg-primary);
  }

  .editor-area :global(.ProseMirror th p),
  .editor-area :global(.ProseMirror td p) {
    margin: 0;
  }

  .editor-area :global(.ProseMirror .selectedCell::after) {
    content: '';
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--editor-table-selection) 32%, transparent);
    pointer-events: none;
  }

  .editor-area :global(.ProseMirror .column-resize-handle) {
    position: absolute;
    top: 0;
    right: -2px;
    bottom: 0;
    width: 4px;
    background: var(--editor-table-resize);
    pointer-events: none;
  }

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-fg-muted);
  }
</style>
