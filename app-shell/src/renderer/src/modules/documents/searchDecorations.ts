import { Extension, type Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface SearchDecorationRange {
  from: number
  to: number
  active: boolean
}

const searchDecorationKey = new PluginKey<DecorationSet>('documents-search-decorations')

export const SearchHighlightExtension = Extension.create({
  name: 'documentsSearchHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: searchDecorationKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, previous, _oldState, newState) {
            const ranges = transaction.getMeta(searchDecorationKey) as SearchDecorationRange[] | undefined
            if (ranges) {
              return DecorationSet.create(
                newState.doc,
                ranges.map(range =>
                  Decoration.inline(range.from, range.to, {
                    class: range.active ? 'document-search-match active' : 'document-search-match'
                  })
                )
              )
            }
            return previous.map(transaction.mapping, transaction.doc)
          }
        },
        props: {
          decorations(state) {
            return searchDecorationKey.getState(state)
          }
        }
      })
    ]
  }
})

export function setSearchDecorations(editor: Editor, ranges: SearchDecorationRange[]): void {
  editor.view.dispatch(editor.state.tr.setMeta(searchDecorationKey, ranges))
}
