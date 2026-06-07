import type { Editor } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import {
  findDocumentMatches,
  replacementForDocumentMatch,
  type DocumentSearchMode
} from '@shared/document-search'

export interface EditorSearchMatch {
  from: number
  to: number
  text: string
}

export interface EditorSearchResult {
  matches: EditorSearchMatch[]
  error: string | null
}

export interface TextSegment {
  textStart: number
  textEnd: number
  from: number
}

export function findEditorMatches(editor: Editor, query: string, mode: DocumentSearchMode): EditorSearchResult {
  const index = buildTextIndex(editor)
  const result = findDocumentMatches(index.text, query, mode)
  if (result.error) return { matches: [], error: result.error }

  const matches = result.matches
    .map(match => {
      const startSegment = findSegment(index.segments, match.start)
      const endSegment = findSegment(index.segments, Math.max(match.start, match.end - 1))
      if (!startSegment || !endSegment) return null
      return {
        from: startSegment.from + (match.start - startSegment.textStart),
        to: endSegment.from + (match.end - endSegment.textStart),
        text: match.text
      }
    })
    .filter((match): match is EditorSearchMatch => match !== null && match.to > match.from)

  return { matches, error: null }
}

export function selectEditorMatch(editor: Editor, match: EditorSearchMatch): void {
  const transaction = editor.state.tr
    .setSelection(TextSelection.create(editor.state.doc, match.from, match.to))
    .scrollIntoView()
  editor.view.dispatch(transaction)
  editor.commands.focus()
}

export function replaceEditorMatches(
  editor: Editor,
  query: string,
  mode: DocumentSearchMode,
  replacement: string,
  matches: EditorSearchMatch[]
): void {
  if (matches.length === 0) return

  let transaction = editor.state.tr
  for (const match of [...matches].sort((left, right) => right.from - left.from)) {
    transaction = transaction.insertText(
      replacementForDocumentMatch(match.text, query, mode, replacement),
      match.from,
      match.to
    )
  }
  editor.view.dispatch(transaction.scrollIntoView())
  editor.commands.focus()
}

export function buildTextIndex(editor: Editor): { text: string; segments: TextSegment[] } {
  let text = ''
  const segments: TextSegment[] = []

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true

    const textStart = text.length
    text += node.text
    segments.push({
      textStart,
      textEnd: text.length,
      from: pos
    })
    return true
  })

  return { text, segments }
}

export function findSegment(segments: TextSegment[], offset: number): TextSegment | null {
  return segments.find(segment => offset >= segment.textStart && offset < segment.textEnd) ?? null
}

export function mapTextRangeToEditorRange(editor: Editor, start: number, end: number): { from: number; to: number } | null {
  const index = buildTextIndex(editor)
  const startSegment = findSegment(index.segments, start)
  const endSegment = findSegment(index.segments, Math.max(start, end - 1))
  if (!startSegment || !endSegment) return null
  return {
    from: startSegment.from + (start - startSegment.textStart),
    to: endSegment.from + (end - endSegment.textStart)
  }
}
