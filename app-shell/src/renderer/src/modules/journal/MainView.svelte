<!-- Journal MainView — today's entry editor -->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { Editor } from '@tiptap/core'
  import StarterKit from '@tiptap/starter-kit'
  import { Markdown } from 'tiptap-markdown'
  import InlineRename from '../../shell/InlineRename.svelte'
  import MarkdownBubbleToolbar from '../../shell/MarkdownBubbleToolbar.svelte'
  import { addToast } from '../../store/toasts'
  import { renameJournalEntry, selectedJournalEntry, updateSelectedJournalContent } from './state'

  let entry = $derived($selectedJournalEntry)
  let renamingTitle = $state(false)
  let editorElement: HTMLDivElement | null = null
  let editor = $state<Editor | null>(null)
  let journalEntryUnsubscribe: (() => void) | null = null

  function commitRename(id: string, title: string): void {
    if (!title) {
      addToast('warn', 'Journal title cannot be blank.')
      renamingTitle = false
      return
    }
    renameJournalEntry(id, title)
    renamingTitle = false
  }

  function toggleBold(): void {
    editor?.chain().focus().toggleBold().run()
  }

  function toggleItalic(): void {
    editor?.chain().focus().toggleItalic().run()
  }

  function toggleHeading(level: 1 | 2): void {
    editor?.chain().focus().toggleHeading({ level }).run()
  }

  function toggleBulletList(): void {
    editor?.chain().focus().toggleBulletList().run()
  }

  function toggleOrderedList(): void {
    editor?.chain().focus().toggleOrderedList().run()
  }

  function editorHost(node: HTMLDivElement): void {
    editorElement = node
  }

  onMount(() => {
    if (!editorElement) return

    editor = new Editor({
      element: editorElement,
      extensions: [
        StarterKit,
        Markdown.configure({ transformPastedText: true })
      ],
      content: get(selectedJournalEntry)?.content ?? '',
      onUpdate: ({ editor }) => {
        updateSelectedJournalContent(editor.storage.markdown.getMarkdown())
      }
    })

    journalEntryUnsubscribe = selectedJournalEntry.subscribe((nextEntry) => {
      if (!editor) return
      const nextMarkdown = nextEntry?.content ?? ''
      if (nextMarkdown !== editor.storage.markdown.getMarkdown()) {
        editor.commands.setContent(nextMarkdown, { emitUpdate: false })
      }
    })
  })

  onDestroy(() => {
    journalEntryUnsubscribe?.()
    editor?.destroy()
  })
</script>

<div class="main-view">
  {#if entry}
    <header class="zone-header entry-header">
      <div class="entry-heading">
        {#if renamingTitle}
          <InlineRename
            value={entry.title}
            ariaLabel="Rename journal entry"
            onCommit={(title) => commitRename(entry.id, title)}
            onCancel={() => renamingTitle = false}
          />
        {:else}
          <button type="button" class="title-button" onclick={() => renamingTitle = true}>
            {entry.title}
          </button>
        {/if}
        <span class="entry-full-date">{entry.fullDate}</span>
      </div>
      <span class="entry-badge">{entry.date}</span>
    </header>
    <header class="zone-header journal-toolbar" aria-label="Journal editing toolbar">
      <div class="toolbar-group" role="group" aria-label="Text style">
        <button type="button" class="tool-btn" aria-label="Heading 1" disabled={!editor} onclick={() => toggleHeading(1)}>H1</button>
        <button type="button" class="tool-btn" aria-label="Heading 2" disabled={!editor} onclick={() => toggleHeading(2)}>H2</button>
      </div>
      <div class="toolbar-group" role="group" aria-label="Formatting">
        <button type="button" class="tool-btn" aria-label="Bold" disabled={!editor} onclick={toggleBold}><strong>B</strong></button>
        <button type="button" class="tool-btn" aria-label="Italic" disabled={!editor} onclick={toggleItalic}><em>I</em></button>
      </div>
      <div class="toolbar-group" role="group" aria-label="Lists">
        <button type="button" class="tool-btn" aria-label="Bullet list" disabled={!editor} onclick={toggleBulletList}>UL</button>
        <button type="button" class="tool-btn" aria-label="Numbered list" disabled={!editor} onclick={toggleOrderedList}>1.</button>
      </div>
    </header>
    <div class="entry-editor" {@attach editorHost} role="textbox" tabindex="-1"></div>
    <MarkdownBubbleToolbar {editor} />
  {/if}
</div>

<style>
  .main-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .entry-header { justify-content: space-between; gap: var(--space-3); padding: 0 var(--space-6); }
  .entry-heading { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
  .title-button { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; font-size: var(--font-size-md); font-weight: 700; color: var(--color-fg-primary); }
  .entry-full-date { font-size: var(--font-size-xs); color: var(--color-fg-muted); }
  .entry-badge {
    font-size: var(--font-size-xs); color: var(--color-accent); background: var(--color-accent-dim);
    padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 500;
  }
  .journal-toolbar {
    min-height: 38px;
    height: 38px;
    gap: var(--space-2);
    padding: 0 var(--space-6);
    background: color-mix(in srgb, var(--color-bg-surface) 82%, var(--color-panel-glint));
    border-bottom: var(--border-subtle);
  }
  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 2px;
    padding-right: var(--space-2);
    border-right: var(--border-subtle);
  }
  .toolbar-group:last-child { border-right: none; }
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
  .tool-btn:hover:not(:disabled) { background: var(--color-hover); color: var(--color-fg-primary); }
  .tool-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .entry-editor {
    flex: 1;
    overflow-y: auto;
    scrollbar-gutter: stable both-edges;
    background:
      linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-panel-glint) 20%, transparent) 50%, transparent),
      transparent;
  }
  .entry-editor :global(.ProseMirror) {
    min-height: 100%;
    outline: none;
    color: var(--color-fg-primary);
    font-family: var(--font-serif);
    font-size: var(--font-size-lg);
    line-height: 1.68;
    padding: clamp(28px, 5vh, 56px) clamp(var(--space-5), 7vw, 80px) 88px;
    max-width: 72ch;
    margin: 0 auto;
  }
  .entry-editor :global(.ProseMirror p) { margin: 0 0 1em; }
  .entry-editor :global(.ProseMirror h1) {
    font-size: clamp(25px, 3vw, 34px);
    font-weight: 650;
    line-height: 1.22;
    margin: var(--space-3) 0 var(--space-5);
  }
  .entry-editor :global(.ProseMirror h2) {
    font-size: var(--font-size-xl);
    font-weight: 600;
    margin: var(--space-6) 0 var(--space-3);
    color: color-mix(in srgb, var(--accent-editor) 28%, var(--color-fg-primary));
  }
  .entry-editor :global(.ProseMirror ul),
  .entry-editor :global(.ProseMirror ol) {
    margin: 0 0 var(--space-4);
    padding-left: var(--space-6);
  }
  .entry-editor :global(.ProseMirror blockquote) {
    border-left: 3px solid var(--accent-inspector);
    margin: 0 0 var(--space-4);
    padding-left: var(--space-4);
    color: var(--color-fg-secondary);
    font-style: italic;
  }
  .entry-editor :global(.ProseMirror code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
    background: color-mix(in srgb, var(--accent-inspector) 12%, var(--color-shell-inspector));
    padding: 1px 5px;
    border-radius: var(--radius-sm);
  }
</style>
