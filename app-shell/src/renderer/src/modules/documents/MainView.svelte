<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { get } from 'svelte/store'
  import { Editor } from '@tiptap/core'
  import StarterKit from '@tiptap/starter-kit'
  import { Markdown } from 'tiptap-markdown'
  import {
    activeDoc, editorContent, isDirty, saveDoc,
    editorSettings, scheduleAutoSave, cancelAutoSave
  } from '../../store'
  import { registerCommand } from '../../store/commands'
  import type { Disposable } from '@shared/module-contract'
  import EditorToolbar from './EditorToolbar.svelte'

  let element = $state<HTMLDivElement>()
  let editor = $state<Editor | null>(null)
  let saveCommand: Disposable | null = null

  onMount(() => {
    editor = new Editor({
      element,
      extensions: [StarterKit, Markdown],
      content: get(editorContent),
      onUpdate: ({ editor }) => {
        editorContent.set(editor.storage.markdown.getMarkdown())
        isDirty.set(true)
        scheduleAutoSave()
      },
    })

    // Interactive handler for documents.save: the renderer owns it because the
    // content to save lives in the open editor / store. Keybinding (CmdOrCtrl+S)
    // and the command palette both dispatch here via executeCommand.
    saveCommand = registerCommand('documents.save', () => saveDoc())
  })

  onDestroy(() => {
    cancelAutoSave()
    saveCommand?.dispose()
    editor?.destroy()
  })

  // Push store → editor only when the content arrives from outside the editor
  // (document switch, external reload). Editor-originated edits already match the
  // store value, so the equality guard makes typing a no-op here — no feedback loop.
  $effect(() => {
    const md = $editorContent
    if (!editor) return
    if (md !== editor.storage.markdown.getMarkdown()) {
      editor.commands.setContent(md, { emitUpdate: false })
    }
  })
</script>

<div class="main-view">
  {#if $activeDoc}
    <header class="doc-header">
      <h1 class="doc-title">{$activeDoc.title}</h1>
      <span class="doc-kind">{$activeDoc.kind}</span>
    </header>
  {/if}

  <!-- TipTap mounts into this element; always present so the editor instance is stable -->
  <div
    class="editor-area"
    class:hidden={!$activeDoc}
    bind:this={element}
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
    padding: var(--space-5) var(--space-6) var(--space-3);
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

  .doc-kind {
    font-size: var(--font-size-xs);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    flex-shrink: 0;
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
    padding: var(--space-5) var(--space-6);
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

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-fg-muted);
  }
</style>

