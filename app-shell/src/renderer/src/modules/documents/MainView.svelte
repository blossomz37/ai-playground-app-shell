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
    activeDoc, activeDocId, annotations, closeDoc, createAnnotation, documents, editorContent, refreshAnnotations,
    saveDoc, selectDoc, setEditorContent, editorSettings, scheduleAutoSave, cancelAutoSave, isDirty, workspaceId,
    lockDocumentSelection, unlockDocumentSelection
  } from '../../store'
  import { registerCommand } from '../../store/commands'
  import { addToast } from '../../store/toasts'
  import { clearShellContextDescriptor, setShellContextDescriptor } from '../../store/shell-context'
  import type { ShellContextDescriptor } from '../../store/shell-context'
  import type { Disposable, Doc, DocumentAnnotation, DocumentAnnotationTarget } from '@shared/module-contract'
  import {
    findDocumentMatches,
    normalizeDocumentSearchState,
    replaceDocumentMatches,
    type DocumentSearchMatch,
    type DocumentSearchMode,
    type DocumentSearchScope
  } from '@shared/document-search'
  import MarkdownBubbleToolbar, { type BubbleToolbarTextRange } from '../../shell/MarkdownBubbleToolbar.svelte'
  import DocumentSearchPanel from './DocumentSearchPanel.svelte'
  import { buildTextIndex, findEditorMatches, mapTextRangeToEditorRange, replaceEditorMatches, selectEditorMatch } from './editorSearch'
  import { AnnotationHighlightExtension, setAnnotationDecorations, type AnnotationDecorationRange } from './annotationDecorations'
  import { SearchHighlightExtension, setSearchDecorations } from './searchDecorations'

  interface ProjectSearchResult {
    documentId: string
    title: string
    count: number
    matches: DocumentSearchMatch[]
  }

  let element: HTMLDivElement | null = null
  let secondaryElement: HTMLDivElement | null = null
  let editor = $state<Editor | null>(null)
  let secondaryEditor = $state<Editor | null>(null)
  let commandDisposables: Disposable[] = []
  let editorContentUnsubscribe: (() => void) | null = null
  let secondaryDocId = $state<string | null>(null)
  let secondaryContent = $state('')
  let secondaryDirty = $state(false)
  let splitDiffMode = $state(false)
  let contextUnsubscribers: Array<() => void> = []
  let captureMarkdownListener: ((event: Event) => void) | null = null
  let captureSearchListener: ((event: Event) => void) | null = null
  let capturePlan47Listener: ((event: Event) => void) | null = null
  let searchOpen = $state(false)
  let searchQuery = $state('')
  let searchReplacement = $state('')
  let searchMode = $state<DocumentSearchMode>('word')
  let searchScope = $state<DocumentSearchScope>('document')
  let searchActiveIndex = $state(0)
  let projectReplacePreview = $state(false)
  let projectReplaceBusy = $state(false)
  let loadingSearchWorkspaceId: string | null = null
  let annotationJumpListener: ((event: Event) => void) | null = null
  let lastAnnotationSelection = $state<{ from: number; to: number } | null>(null)
  let hasAnnotationSelection = $state(false)
  let commentMode = $state(false)
  let commentModeDocId = $state<string | null>(null)
  let annotationCreatePending = false

  const secondaryDoc = $derived($documents.find(doc => doc.id === secondaryDocId) ?? null)
  const editableDocuments = $derived($documents.filter(doc => doc.nodeType !== 'folder'))
  const editorSearch = $derived(
    editor && searchQuery.trim()
      ? findEditorMatches(editor, searchQuery, searchMode)
      : { matches: [], error: null }
  )
  const projectSearch = $derived(buildProjectSearchResults(
    $documents,
    $activeDocId,
    $editorContent,
    searchQuery,
    searchMode
  ))
  const visibleSearchError = $derived(searchScope === 'project' ? projectSearch.error : editorSearch.error)
  const splitDiffRows = $derived(buildLineDiff($editorContent, secondaryContent))

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

  function enterCommentMode(): void {
    const id = get(activeDocId)
    if (!id) return
    commentMode = true
    commentModeDocId = id
    lockDocumentSelection(id)
    closeSearch()
    addToast('info', 'Comment mode enabled.')
    editor?.commands.focus()
  }

  function exitCommentMode(): void {
    unlockDocumentSelection(commentModeDocId)
    commentMode = false
    commentModeDocId = null
    lastAnnotationSelection = null
    hasAnnotationSelection = false
    addToast('info', 'Comment mode disabled.')
    editor?.commands.focus()
  }

  function toggleCommentMode(): void {
    if (commentMode) {
      exitCommentMode()
    } else {
      enterCommentMode()
    }
  }


  function editorHost(node: HTMLDivElement): void {
    element = node
  }

  function secondaryEditorHost(node: HTMLDivElement): void {
    secondaryElement = node
    mountSecondaryEditor()
  }

  function editorExtensions(includeAnnotations = false) {
    return [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      SearchHighlightExtension,
      ...(includeAnnotations ? [AnnotationHighlightExtension] : []),
      Markdown.configure({ transformPastedText: true })
    ]
  }

  function searchStateKey(id: string): string {
    return `documents.${id}.lastSearch`
  }

  async function loadPersistedSearchState(id: string): Promise<void> {
    loadingSearchWorkspaceId = id
    try {
      const saved = normalizeDocumentSearchState(await window.shell.settings.get(searchStateKey(id)))
      searchQuery = saved.query
      searchReplacement = saved.replacement
      searchMode = saved.mode
      searchScope = saved.scope
      searchActiveIndex = 0
    } catch {
      const saved = normalizeDocumentSearchState(null)
      searchQuery = saved.query
      searchReplacement = saved.replacement
      searchMode = saved.mode
      searchScope = saved.scope
      searchActiveIndex = 0
    } finally {
      loadingSearchWorkspaceId = null
    }
  }

  function persistSearchState(force = false): void {
    const id = get(workspaceId)
    if (!id || (!force && loadingSearchWorkspaceId === id)) return
    void window.shell.settings.set(searchStateKey(id), {
      query: searchQuery,
      replacement: searchReplacement,
      mode: searchMode,
      scope: searchScope
    })
  }

  function openSearch(focusReplace = false): void {
    searchOpen = true
    queueMicrotask(() => {
      const selector = focusReplace
        ? '[data-capture-document-replace-input]'
        : '[data-capture-document-search-input]'
      const input = document.querySelector<HTMLInputElement>(selector)
        ?? document.querySelector<HTMLInputElement>('[data-capture-document-search-input]')
      input?.focus()
      input?.select()
    })
  }

  function closeSearch(): void {
    searchOpen = false
    projectReplacePreview = false
    persistSearchState()
    editor?.commands.focus()
  }

  function setSearchQuery(value: string): void {
    searchQuery = value
    searchActiveIndex = 0
    projectReplacePreview = false
    persistSearchState()
    queueMicrotask(renderSearchDecorations)
  }

  function setSearchReplacementValue(value: string): void {
    searchReplacement = value
    projectReplacePreview = false
    persistSearchState()
  }

  function setSearchModeValue(value: DocumentSearchMode): void {
    searchMode = value
    searchActiveIndex = 0
    projectReplacePreview = false
    persistSearchState()
    queueMicrotask(renderSearchDecorations)
  }

  function setSearchScopeValue(value: DocumentSearchScope): void {
    searchScope = value
    projectReplacePreview = false
    persistSearchState()
  }

  function renderSearchDecorations(): void {
    if (!editor) return
    const activeIndex = Math.min(searchActiveIndex, Math.max(0, editorSearch.matches.length - 1))
    setSearchDecorations(
      editor,
      editorSearch.matches.map((match, index) => ({
        from: match.from,
        to: match.to,
        active: index === activeIndex
      }))
    )
  }

  function parseAnnotationTarget(annotation: DocumentAnnotation): DocumentAnnotationTarget | null {
    try {
      const target = JSON.parse(annotation.targetJson) as Partial<DocumentAnnotationTarget>
      if (
        typeof target.exact === 'string' &&
        typeof target.prefix === 'string' &&
        typeof target.suffix === 'string' &&
        typeof target.from === 'number' &&
        typeof target.to === 'number'
      ) {
        return target as DocumentAnnotationTarget
      }
    } catch {
      return null
    }
    return null
  }

  function locateAnnotation(editorInstance: Editor, annotation: DocumentAnnotation): AnnotationDecorationRange | null {
    const target = parseAnnotationTarget(annotation)
    if (!target) return null
    const directText = editorInstance.state.doc.textBetween(target.from, target.to)
    if (directText === target.exact) {
      return { id: annotation.id, from: target.from, to: target.to, status: annotation.status, color: annotation.color }
    }

    const index = buildTextIndex(editorInstance)
    const exactIndex = index.text.indexOf(target.exact)
    if (exactIndex >= 0) {
      const range = mapTextRangeToEditorRange(editorInstance, exactIndex, exactIndex + target.exact.length)
      if (range) return { id: annotation.id, ...range, status: annotation.status, color: annotation.color }
    }
    return null
  }

  function renderAnnotationDecorations(): void {
    if (!editor) return
    const ranges: AnnotationDecorationRange[] = []
    for (const annotation of $annotations) {
      if (annotation.deletedAt || annotation.status === 'orphaned') continue
      const range = locateAnnotation(editor, annotation)
      if (range) ranges.push(range)
    }
    setAnnotationDecorations(editor, ranges)
  }

  function trackAnnotationSelection(): void {
    if (!editor) {
      hasAnnotationSelection = false
      lastAnnotationSelection = null
      return
    }

    const { from, to, empty } = editor.state.selection
    const selectedText = empty || to <= from ? '' : editor.state.doc.textBetween(from, to).trim()
    hasAnnotationSelection = selectedText.length > 0
    if (hasAnnotationSelection) {
      lastAnnotationSelection = { from, to }
    } else {
      lastAnnotationSelection = null
    }
  }

  async function refreshAnnotationAnchors(): Promise<void> {
    if (!editor) return
    for (const annotation of $annotations) {
      if (annotation.deletedAt || annotation.status === 'orphaned') continue
      if (!locateAnnotation(editor, annotation)) {
        await window.shell.documents.updateAnnotation(annotation.id, { status: 'orphaned' })
      }
    }
    await refreshAnnotations()
    queueMicrotask(renderAnnotationDecorations)
  }

  async function annotateSelection(range: BubbleToolbarTextRange | null = hasAnnotationSelection ? lastAnnotationSelection : null): Promise<void> {
    if (!editor || !$activeDoc) return
    if (annotationCreatePending) return
    if (!commentMode) {
      addToast('warn', 'Turn on comment mode before adding comments.')
      return
    }
    const selection = editor.state.selection
    const activeRange = !selection.empty && selection.to > selection.from
      ? { from: selection.from, to: selection.to }
      : range

    if (!activeRange || activeRange.to <= activeRange.from) {
      addToast('warn', 'Select text before adding a comment.')
      return
    }

    const { from, to } = activeRange
    const exact = editor.state.doc.textBetween(from, to)
    if (!exact.trim()) {
      addToast('warn', 'Select text before adding a comment.')
      return
    }

    const existing = $annotations.find(annotation => {
      if (annotation.deletedAt || annotation.status !== 'active') return false
      const target = parseAnnotationTarget(annotation)
      return target?.from === from && target.to === to && target.exact === exact
    })
    if (existing) {
      addToast('warn', 'This text already has an active comment.')
      jumpToAnnotation(existing)
      return
    }

    const prefix = editor.state.doc.textBetween(Math.max(0, from - 80), from)
    const suffix = editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + 80))
    editor.chain().focus().setTextSelection({ from, to }).run()
    annotationCreatePending = true
    try {
      await createAnnotation({
        documentId: $activeDoc.id,
        note: 'New comment',
        color: 'yellow',
        target: { exact, prefix, suffix, from, to }
      })
      addToast('info', 'Comment added.')
      trackAnnotationSelection()
      queueMicrotask(renderAnnotationDecorations)
    } finally {
      annotationCreatePending = false
    }
  }

  function jumpToAnnotation(annotation: DocumentAnnotation): void {
    if (!editor) return
    const range = locateAnnotation(editor, annotation)
    if (!range) return
    selectEditorMatch(editor, { from: range.from, to: range.to, text: parseAnnotationTarget(annotation)?.exact ?? '' })
    renderAnnotationDecorations()
  }

  function activateSearchMatch(index: number): void {
    if (!editor || editorSearch.matches.length === 0) return
    searchActiveIndex = (index + editorSearch.matches.length) % editorSearch.matches.length
    renderSearchDecorations()
    selectEditorMatch(editor, editorSearch.matches[searchActiveIndex])
  }

  function previousSearchMatch(): void {
    activateSearchMatch(searchActiveIndex - 1)
  }

  function nextSearchMatch(): void {
    activateSearchMatch(searchActiveIndex + 1)
  }

  function replaceCurrentMatch(): void {
    if (!editor || editorSearch.matches.length === 0) return
    replaceEditorMatches(editor, searchQuery, searchMode, searchReplacement, [editorSearch.matches[searchActiveIndex]])
  }

  function replaceNextMatch(): void {
    replaceCurrentMatch()
    queueMicrotask(() => nextSearchMatch())
  }

  function replaceAllMatches(): void {
    if (searchScope === 'project') {
      projectReplacePreview = projectSearch.results.length > 0
      return
    }
    if (!editor || editorSearch.matches.length === 0) return
    replaceEditorMatches(editor, searchQuery, searchMode, searchReplacement, editorSearch.matches)
  }

  async function openProjectResult(documentId: string): Promise<void> {
    if (commentMode) {
      addToast('warn', 'Exit comment mode before switching documents.')
      return
    }
    await selectDoc(documentId)
    searchScope = 'document'
    searchActiveIndex = 0
    queueMicrotask(() => activateSearchMatch(0))
  }

  function closePrimaryDocument(): void {
    if (commentMode) {
      addToast('warn', 'Exit comment mode before closing this document.')
      return
    }
    closeSearch()
    closeDoc()
  }

  async function openSecondaryDocument(id: string): Promise<void> {
    if (commentMode) {
      addToast('warn', 'Exit comment mode before opening a second document.')
      return
    }
    const doc = $documents.find(item => item.id === id)
    if (!doc || doc.nodeType === 'folder') return
    secondaryDocId = doc.id
    secondaryContent = doc.content
    secondaryDirty = false
    splitDiffMode = false
    queueMicrotask(mountSecondaryEditor)
  }

  async function saveSecondaryDocument(): Promise<void> {
    if (!secondaryDocId || !secondaryDirty) return
    await window.shell.documents.save(secondaryDocId, secondaryContent)
    secondaryDirty = false
  }

  function closeSecondaryDocument(): void {
    secondaryEditor?.destroy()
    secondaryEditor = null
    secondaryDocId = null
    secondaryContent = ''
    secondaryDirty = false
    splitDiffMode = false
  }

  function mountSecondaryEditor(): void {
    if (!secondaryElement || !secondaryDocId || splitDiffMode) return
    if (secondaryEditor) {
      if (secondaryEditor.storage.markdown.getMarkdown() !== secondaryContent) {
        secondaryEditor.commands.setContent(secondaryContent, { emitUpdate: false })
      }
      return
    }

    secondaryEditor = new Editor({
      element: secondaryElement,
      extensions: editorExtensions(false),
      content: secondaryContent,
      onUpdate: ({ editor }) => {
        secondaryContent = editor.storage.markdown.getMarkdown()
        secondaryDirty = true
      }
    })
  }

  function setSplitDiffMode(value: boolean): void {
    splitDiffMode = value
    if (value) {
      secondaryEditor?.destroy()
      secondaryEditor = null
    } else {
      queueMicrotask(mountSecondaryEditor)
    }
  }

  function buildLineDiff(left: string, right: string): Array<{ index: number; left: string; right: string; changed: boolean }> {
    const leftLines = left.split('\n')
    const rightLines = right.split('\n')
    const length = Math.max(leftLines.length, rightLines.length)
    return Array.from({ length }, (_, index) => ({
      index,
      left: leftLines[index] ?? '',
      right: rightLines[index] ?? '',
      changed: (leftLines[index] ?? '') !== (rightLines[index] ?? '')
    }))
  }

  async function confirmProjectReplace(): Promise<void> {
    if (projectSearch.results.length === 0) return
    projectReplaceBusy = true
    try {
      if (get(isDirty)) {
        await saveDoc()
      }

      const activeId = get(activeDocId)
      const activeContent = get(editorContent)
      for (const result of projectSearch.results) {
        const doc = get(documents).find(item => item.id === result.documentId)
        if (!doc) continue
        const source = result.documentId === activeId ? activeContent : doc.content
        const current = findDocumentMatches(source, searchQuery, searchMode)
        if (current.error || current.matches.length === 0) continue
        const next = replaceDocumentMatches(source, searchQuery, searchMode, searchReplacement, current.matches)
        await window.shell.documents.save(result.documentId, next)
        if (result.documentId === activeId) {
          setEditorContent(next, { dirty: false })
        }
      }
      projectReplacePreview = false
    } finally {
      projectReplaceBusy = false
    }
  }

  function buildProjectSearchResults(
    docs: Doc[],
    activeId: string | null,
    activeContent: string,
    query: string,
    mode: DocumentSearchMode
  ): { results: ProjectSearchResult[]; error: string | null } {
    if (!query.trim()) return { results: [], error: null }

    const results: ProjectSearchResult[] = []
    let error: string | null = null
    for (const doc of docs) {
      if (doc.nodeType === 'folder') continue
      const content = doc.id === activeId ? activeContent : doc.content
      const result = findDocumentMatches(content, query, mode)
      if (result.error) {
        error = result.error
        break
      }
      if (result.matches.length > 0) {
        results.push({
          documentId: doc.id,
          title: doc.title,
          count: result.matches.length,
          matches: result.matches
        })
      }
    }
    return { results, error }
  }

  onMount(() => {
    if (!element) return

    editor = new Editor({
      element,
      extensions: [
        ...editorExtensions(true)
      ],
      content: get(editorContent),
      onUpdate: ({ editor }) => {
        setEditorContent(editor.storage.markdown.getMarkdown())
        trackAnnotationSelection()
        scheduleAutoSave()
        queueMicrotask(renderSearchDecorations)
        queueMicrotask(renderAnnotationDecorations)
        void refreshAnnotationAnchors()
      },
      onSelectionUpdate: () => {
        trackAnnotationSelection()
      }
    })

    // Interactive handler for documents.save: the renderer owns it because the
    // content to save lives in the open editor / store. Keybinding (CmdOrCtrl+S)
    // and the command palette both dispatch here via executeCommand.
    commandDisposables = [
      registerCommand('documents.save', () => saveDoc()),
      registerCommand('documents.find', () => openSearch(false)),
      registerCommand('documents.replace', () => openSearch(true)),
      registerCommand('documents.findNext', () => nextSearchMatch()),
      registerCommand('documents.close', () => closePrimaryDocument()),
      registerCommand('documents.annotateSelection', () => void annotateSelection())
    ]

    editorContentUnsubscribe = editorContent.subscribe((md) => {
      if (!editor) return
      if (md !== editor.storage.markdown.getMarkdown()) {
        editor.commands.setContent(md, { emitUpdate: false })
        queueMicrotask(renderSearchDecorations)
        queueMicrotask(renderAnnotationDecorations)
      }
    })

    contextUnsubscribers = [
      activeDoc.subscribe(refreshDocumentContextDescriptor),
      isDirty.subscribe(refreshDocumentContextDescriptor),
      annotations.subscribe(() => queueMicrotask(renderAnnotationDecorations)),
      workspaceId.subscribe((id) => {
        if (id) void loadPersistedSearchState(id)
      })
    ]

    captureMarkdownListener = (event: Event) => {
      const markdown = (event as CustomEvent<string>).detail
      if (!markdown || !editor) return
      editor.commands.setContent(markdown, { emitUpdate: false })
      setEditorContent(editor.storage.markdown.getMarkdown(), { dirty: false })
    }
    window.addEventListener('shell:capture-document-markdown', captureMarkdownListener)

    captureSearchListener = (event: Event) => {
      const detail = (event as CustomEvent<Partial<{
        query: string
        replacement: string
        mode: DocumentSearchMode
        scope: DocumentSearchScope
        preview: boolean
      }>>).detail ?? {}
      if (typeof detail.query === 'string') searchQuery = detail.query
      if (typeof detail.replacement === 'string') searchReplacement = detail.replacement
      if (detail.mode === 'word' || detail.mode === 'regex') searchMode = detail.mode
      if (detail.scope === 'document' || detail.scope === 'project') searchScope = detail.scope
      searchActiveIndex = 0
      searchOpen = true
      projectReplacePreview = detail.preview === true
      if (
        typeof detail.query === 'string' ||
        typeof detail.replacement === 'string' ||
        detail.mode === 'word' ||
        detail.mode === 'regex' ||
        detail.scope === 'document' ||
        detail.scope === 'project'
      ) {
        persistSearchState(true)
      }
      queueMicrotask(renderSearchDecorations)
      queueMicrotask(() => document.querySelector<HTMLInputElement>('[data-capture-document-search-input]')?.focus())
    }
    window.addEventListener('shell:capture-open-document-search', captureSearchListener)

    capturePlan47Listener = (event: Event) => {
      const detail = (event as CustomEvent<Partial<{ secondaryDocumentId: string; diff: boolean; close: boolean; commentMode: boolean }>>).detail ?? {}
      if (detail.secondaryDocumentId) {
        void openSecondaryDocument(detail.secondaryDocumentId).then(() => {
          if (detail.diff) setSplitDiffMode(true)
        })
      }
      if (detail.commentMode) {
        enterCommentMode()
      }
      if (detail.close) {
        closePrimaryDocument()
      }
      queueMicrotask(renderAnnotationDecorations)
    }
    window.addEventListener('shell:capture-plan47-documents', capturePlan47Listener)

    annotationJumpListener = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      const annotation = get(annotations).find(item => item.id === id)
      if (annotation) jumpToAnnotation(annotation)
    }
    window.addEventListener('documents:jump-to-annotation', annotationJumpListener)
  })

  onDestroy(() => {
    unlockDocumentSelection(commentModeDocId)
    cancelAutoSave()
    editorContentUnsubscribe?.()
    for (const unsubscribe of contextUnsubscribers) unsubscribe()
    contextUnsubscribers = []
    clearShellContextDescriptor('shell.documents')
    if (captureMarkdownListener) {
      window.removeEventListener('shell:capture-document-markdown', captureMarkdownListener)
    }
    if (captureSearchListener) {
      window.removeEventListener('shell:capture-open-document-search', captureSearchListener)
    }
    if (capturePlan47Listener) {
      window.removeEventListener('shell:capture-plan47-documents', capturePlan47Listener)
    }
    if (annotationJumpListener) {
      window.removeEventListener('documents:jump-to-annotation', annotationJumpListener)
    }
    for (const command of commandDisposables) command.dispose()
    editor?.destroy()
    secondaryEditor?.destroy()
  })
</script>

<div class="main-view">
  {#if $activeDoc}
    <header class="zone-header doc-toolbar" aria-label="Document editing toolbar">
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
      <div class="toolbar-group" role="group" aria-label="Document actions">
        <button
          type="button"
          class="tool-btn"
          class:active={commentMode}
          aria-label={commentMode ? 'Exit comment mode' : 'Enter comment mode'}
          aria-pressed={commentMode}
          title={commentMode ? 'Exit comment mode' : 'Enter comment mode'}
          disabled={!editor}
          onmousedown={(event) => { event.preventDefault(); toggleCommentMode() }}
        >Comment</button>
        <button type="button" class="tool-btn" aria-label="Close document" onclick={closePrimaryDocument}>Close</button>
      </div>
      <div class="toolbar-group split-controls" role="group" aria-label="Split editor">
        <select
          class="split-select"
          aria-label="Open second document"
          disabled={commentMode}
          value={secondaryDocId ?? ''}
          onchange={(event) => {
            const value = (event.currentTarget as HTMLSelectElement).value
            if (value) void openSecondaryDocument(value)
          }}
        >
          <option value="">Second document</option>
          {#each editableDocuments.filter(doc => doc.id !== $activeDocId) as doc (doc.id)}
            <option value={doc.id}>{doc.title}</option>
          {/each}
        </select>
        {#if secondaryDoc}
          <button type="button" class="tool-btn" aria-label="Toggle diff mode" onclick={() => setSplitDiffMode(!splitDiffMode)}>
            {splitDiffMode ? 'Edit' : 'Diff'}
          </button>
          <button type="button" class="tool-btn" aria-label="Save second document" disabled={!secondaryDirty} onclick={() => void saveSecondaryDocument()}>Save 2</button>
          <button type="button" class="tool-btn" aria-label="Close second document" onclick={closeSecondaryDocument}>Close 2</button>
        {/if}
      </div>
    </header>
  {/if}

  {#if searchOpen && $activeDoc}
    <DocumentSearchPanel
      query={searchQuery}
      replacement={searchReplacement}
      mode={searchMode}
      scope={searchScope}
      matchCount={editorSearch.matches.length}
      activeIndex={searchActiveIndex}
      validationError={visibleSearchError}
      projectResults={projectSearch.results}
      {projectReplacePreview}
      {projectReplaceBusy}
      onQueryChange={setSearchQuery}
      onReplacementChange={setSearchReplacementValue}
      onModeChange={setSearchModeValue}
      onScopeChange={setSearchScopeValue}
      onPrevious={previousSearchMatch}
      onNext={nextSearchMatch}
      onReplace={replaceCurrentMatch}
      onReplaceNext={replaceNextMatch}
      onReplaceAll={replaceAllMatches}
      onClose={closeSearch}
      onOpenProjectResult={(id) => void openProjectResult(id)}
      onConfirmProjectReplace={() => void confirmProjectReplace()}
      onCancelProjectReplace={() => (projectReplacePreview = false)}
    />
  {/if}

  <div class="editor-shell" class:split={Boolean(secondaryDoc)} class:diffing={splitDiffMode && Boolean(secondaryDoc)}>
    <section class="editor-pane primary-pane" aria-label={$activeDoc ? `Primary editor: ${$activeDoc.title}` : 'Primary editor'}>
      <!-- TipTap mounts into this element; always present so the editor instance is stable -->
      <div
        class="editor-area"
        class:hidden={!$activeDoc || (splitDiffMode && Boolean(secondaryDoc))}
        {@attach editorHost}
        role="textbox"
        tabindex="-1"
        style:--editor-font={$editorSettings.fontFamily}
        style:--editor-font-size={$editorSettings.fontSize}
      ></div>
    </section>

    {#if secondaryDoc}
      {#if splitDiffMode}
        <section class="diff-view" aria-label="Document diff">
          <header class="diff-header">
            <span>{$activeDoc?.title}</span>
            <span>{secondaryDoc.title}</span>
          </header>
          <div class="diff-rows">
            {#each splitDiffRows as row (row.index)}
              <div class="diff-row" class:changed={row.changed}>
                <pre>{row.left || ' '}</pre>
                <pre>{row.right || ' '}</pre>
              </div>
            {/each}
          </div>
        </section>
      {:else}
        <section class="editor-pane secondary-pane" aria-label={`Second editor: ${secondaryDoc.title}`}>
          <header class="secondary-title">
            <span>{secondaryDoc.title}</span>
            {#if secondaryDirty}<span class="dirty-pill">Unsaved</span>{/if}
          </header>
          <div
            class="editor-area secondary-editor"
            {@attach secondaryEditorHost}
            role="textbox"
            tabindex="-1"
            style:--editor-font={$editorSettings.fontFamily}
            style:--editor-font-size={$editorSettings.fontSize}
          ></div>
        </section>
      {/if}
    {/if}
  </div>

  <MarkdownBubbleToolbar {editor} onAnnotate={commentMode ? (range) => void annotateSelection(range) : null} />

  {#if !$activeDoc}
    <div class="empty">
      <div class="empty-copy">
        <h2>No document open.</h2>
        <p>Select a document in the manuscript tree to open it.</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .main-view {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background:
      radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--accent-editor) 7%, transparent), transparent 28%),
      var(--color-shell-main);
  }

  .doc-toolbar {
    gap: var(--space-2);
    padding: 0 clamp(var(--space-5), 6vw, 72px);
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

  .split-controls {
    margin-left: auto;
  }

  .split-select {
    height: 28px;
    max-width: 180px;
    padding-left: 4px;
    border: 1px solid color-mix(in srgb, var(--accent-editor) 22%, var(--color-border));
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-shell-main) 78%, var(--color-panel-glint));
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
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

  .tool-btn.active {
    color: var(--color-fg-primary);
    background: color-mix(in srgb, #f7c948 24%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, #f7c948 42%, transparent);
  }

  .tool-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .editor-shell {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .editor-shell.split {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .editor-shell.diffing {
    grid-template-columns: minmax(0, 1fr);
  }

  .editor-pane {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-right: var(--border-subtle);
  }

  .editor-pane:last-child {
    border-right: none;
  }

  .secondary-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: 34px;
    padding: 0 var(--space-4);
    border-bottom: var(--border-subtle);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .dirty-pill {
    color: var(--accent-editor);
    font-weight: 700;
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

  .editor-area :global(.document-search-match) {
    border-radius: 2px;
    background: color-mix(in srgb, var(--accent-editor) 24%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-editor) 24%, transparent);
  }

  .editor-area :global(.document-search-match.active) {
    background: color-mix(in srgb, var(--accent-editor) 42%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-editor) 58%, transparent);
  }

  .editor-area :global(.document-annotation) {
    border-radius: 2px;
    background: color-mix(in srgb, #f7c948 34%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, #f7c948 34%, transparent);
  }

  .editor-area :global(.document-annotation-resolved) {
    background: color-mix(in srgb, var(--color-fg-muted) 16%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-fg-muted) 18%, transparent);
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

  .secondary-editor :global(.ProseMirror) {
    max-width: 70ch;
    padding-inline: clamp(var(--space-4), 5vw, 56px);
  }

  .diff-view {
    min-height: 0;
    display: flex;
    flex-direction: column;
    grid-column: 1 / -1;
    overflow: hidden;
  }

  .diff-header,
  .diff-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .diff-header {
    min-height: 34px;
    border-bottom: var(--border-subtle);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .diff-header span {
    padding: var(--space-2) var(--space-4);
    border-right: var(--border-subtle);
  }

  .diff-header span:last-child {
    border-right: none;
  }

  .diff-rows {
    flex: 1;
    overflow: auto;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  .diff-row {
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 38%, transparent);
  }

  .diff-row.changed {
    background: color-mix(in srgb, var(--accent-editor) 9%, transparent);
  }

  .diff-row pre {
    min-width: 0;
    white-space: pre-wrap;
    margin: 0;
    padding: 6px var(--space-4);
    color: var(--color-fg-secondary);
    border-right: var(--border-subtle);
  }

  .diff-row pre:last-child {
    border-right: none;
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
    padding: var(--space-6);
    color: var(--color-fg-muted);
  }

  .empty-copy {
    display: grid;
    gap: var(--space-2);
    max-width: 420px;
    text-align: center;
  }

  .empty-copy h2 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: var(--font-size-xl);
    font-weight: 650;
  }

  .empty-copy p {
    margin: 0;
    font-size: var(--font-size-sm);
    line-height: 1.6;
  }
</style>
