import type { Editor } from '@tiptap/core'
import type { AiWritingVariables } from '@shared/ai'
import type { Doc, Workspace } from '@shared/module-contract'

const MAX_SELECTED_CHARS = 6000
const MAX_SURROUNDING_CHARS = 4000

export interface DocumentsWritingContext {
  writingVariables: AiWritingVariables
  selectedWordCount: number
  mode: 'selection' | 'cursor'
}

function clipStart(value: string, max: number): string {
  if (value.length <= max) return value
  return `[truncated]\n${value.slice(value.length - max)}`
}

function clipEnd(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, max)}\n[truncated]`
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

export function captureDocumentsWritingContext(args: {
  editor: Editor | null
  activeDocument: Doc | null
  workspace: Workspace | null
  documentKind: string
  userInput?: string
}): DocumentsWritingContext {
  const selection = args.editor?.state.selection
  const doc = args.editor?.state.doc
  const from = selection?.from ?? 0
  const to = selection?.to ?? from
  const selected = doc && to > from ? doc.textBetween(from, to, '\n', ' ') : ''
  const before = doc ? doc.textBetween(0, from, '\n', ' ') : ''
  const after = doc ? doc.textBetween(to, doc.content.size, '\n', ' ') : ''

  return {
    mode: selected.trim() ? 'selection' : 'cursor',
    selectedWordCount: countWords(selected),
    writingVariables: {
      selectedText: clipEnd(selected, MAX_SELECTED_CHARS),
      userInput: args.userInput ?? '',
      before: clipStart(before, MAX_SURROUNDING_CHARS),
      after: clipEnd(after, MAX_SURROUNDING_CHARS),
      activeDocumentTitle: args.activeDocument?.title ?? '',
      documentKind: args.documentKind,
      workspaceName: args.workspace?.name ?? ''
    }
  }
}
