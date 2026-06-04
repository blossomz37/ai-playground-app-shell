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
    editorSettings, scheduleAutoSave, cancelAutoSave, countWords, isDirty
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
    const content = get(editorContent)
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
      secondaryLabel: `${doc.kind} · ${countWords(content).toLocaleString()} words · ${dirty ? 'unsaved' : 'saved'}`,
      trail: [
        { id: 'documents-root', label: 'Manuscript' },
        { id: doc.id, label: doc.title }
      ],
      actions: [
        { id: 'documents-save', label: 'Save', commandId: 'documents.save', disabled: !dirty }
      ]
    }
  }

  function refreshDocumentContextDescriptor(): void {
    setShellContextDescriptor(buildDocumentContextDescriptor())
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
      editorContent.subscribe(refreshDocumentContextDescriptor),
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
    <header class="doc-header">
      <h1 class="doc-title">{$activeDoc.title}</h1>
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
  }

  .doc-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6) var(--space-3);
    border-bottom: var(--border-subtle);
    flex-shrink: 0;
  }

  .doc-title {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--color-fg-primary);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editor-area {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .editor-area.hidden {
    display: none;
  }

  /* TipTap injects .ProseMirror; style the prose surface here.
     Font and size cascade from editorSettings via CSS custom properties. */
  .editor-area :global(.ProseMirror) {
    flex: 1;
    outline: none;
    color: var(--color-fg-primary);
    font-family: var(--editor-font, var(--font-serif));
    font-size: var(--editor-font-size, var(--font-size-lg));
    line-height: var(--line-height);
    padding: var(--space-6);
    max-width: 72ch;
  }

  .editor-area :global(.ProseMirror p) {
    margin: 0 0 var(--space-4);
  }

  .editor-area :global(.ProseMirror h1) {
    font-size: var(--font-size-xl);
    font-weight: 600;
    margin: var(--space-3) 0 var(--space-4);
    line-height: 1.3;
  }

  .editor-area :global(.ProseMirror h2) {
    font-size: var(--font-size-lg);
    font-weight: 600;
    margin: var(--space-4) 0 var(--space-3);
  }

  .editor-area :global(.ProseMirror h3) {
    font-size: var(--font-size-md);
    font-weight: 600;
    margin: var(--space-3) 0 var(--space-2);
    color: var(--color-fg-secondary);
  }

  .editor-area :global(.ProseMirror blockquote) {
    border-left: 3px solid var(--color-border);
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
    background: var(--color-bg-overlay);
    padding: 1px 5px;
    border-radius: var(--radius-sm);
  }

  .editor-area :global(.ProseMirror pre) {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    background: var(--color-bg-overlay);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    margin: 0 0 var(--space-4);
    overflow-x: auto;
  }

  .editor-area :global(.ProseMirror pre code) {
    background: none;
    padding: 0;
  }

  .editor-area :global(.ProseMirror .tableWrapper) {
    overflow-x: auto;
    margin: 0 0 var(--space-4);
  }

  .editor-area :global(.ProseMirror table) {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
  }

  .editor-area :global(.ProseMirror th),
  .editor-area :global(.ProseMirror td) {
    position: relative;
    min-width: 90px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    vertical-align: top;
  }

  .editor-area :global(.ProseMirror th) {
    background: var(--color-bg-active);
    color: var(--color-fg-primary);
    font-weight: 700;
  }

  .editor-area :global(.ProseMirror td) {
    background: color-mix(in srgb, var(--color-bg-surface) 70%, transparent);
  }

  .editor-area :global(.ProseMirror th p),
  .editor-area :global(.ProseMirror td p) {
    margin: 0;
  }

  .editor-area :global(.ProseMirror .selectedCell::after) {
    content: '';
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    pointer-events: none;
  }

  .editor-area :global(.ProseMirror .column-resize-handle) {
    position: absolute;
    top: 0;
    right: -2px;
    bottom: 0;
    width: 4px;
    background: var(--color-accent);
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
