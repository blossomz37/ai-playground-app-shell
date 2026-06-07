import { Extension, type Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface AnnotationDecorationRange {
  id: string
  from: number
  to: number
  status: 'active' | 'resolved' | 'orphaned'
  color: string
}

const annotationDecorationKey = new PluginKey<DecorationSet>('documents-annotation-decorations')

export const AnnotationHighlightExtension = Extension.create({
  name: 'documentsAnnotationHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: annotationDecorationKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, previous, _oldState, newState) {
            const ranges = transaction.getMeta(annotationDecorationKey) as AnnotationDecorationRange[] | undefined
            if (ranges) {
              return DecorationSet.create(
                newState.doc,
                ranges
                  .filter(range => range.to > range.from && range.status !== 'orphaned')
                  .map(range =>
                    Decoration.inline(range.from, range.to, {
                      class: `document-annotation document-annotation-${range.status}`,
                      'data-annotation-id': range.id,
                      'data-annotation-color': range.color
                    })
                  )
              )
            }
            return previous.map(transaction.mapping, transaction.doc)
          }
        },
        props: {
          decorations(state) {
            return annotationDecorationKey.getState(state)
          }
        }
      })
    ]
  }
})

export function setAnnotationDecorations(editor: Editor, ranges: AnnotationDecorationRange[]): void {
  editor.view.dispatch(editor.state.tr.setMeta(annotationDecorationKey, ranges))
}
