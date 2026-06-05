import type { DocumentDropPlacement } from '@shared/state/documents-state'

const POINTER_DRAG_THRESHOLD_PX = 6
const TREE_ROW_SELECTOR = '[data-doc-id]'

export interface DocumentTreePointerDrag {
  sourceId: string
  startX: number
  startY: number
  dragging: boolean
}

export interface DocumentTreeDragTarget {
  id: string
  placement: DocumentDropPlacement
}

export function createDocumentTreePointerDrag(sourceId: string, event: PointerEvent): DocumentTreePointerDrag {
  return {
    sourceId,
    startX: event.clientX,
    startY: event.clientY,
    dragging: false
  }
}

export function hasPointerDragPassedThreshold(drag: DocumentTreePointerDrag, event: PointerEvent): boolean {
  if (drag.dragging) return true
  return Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= POINTER_DRAG_THRESHOLD_PX
}

export function getDocumentDropPlacement(target: HTMLElement, clientY: number): DocumentDropPlacement {
  const rect = target.getBoundingClientRect()
  const offset = clientY - rect.top
  const third = rect.height / 3

  if (offset < third) return 'before'
  if (offset > third * 2) return 'after'
  return 'inside'
}

export function setNativeDocumentDragPayload(event: DragEvent, sourceId: string) {
  event.dataTransfer?.setData('text/plain', sourceId)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

export function getNativeDocumentDragSourceId(event: DragEvent, activeSourceId: string | null): string | null {
  return activeSourceId ?? event.dataTransfer?.getData('text/plain') ?? null
}

export function markNativeDocumentDropMove(event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

export function isInternalDocumentDragLeave(event: DragEvent): boolean {
  const target = event.currentTarget
  return target instanceof HTMLElement
    && event.relatedTarget instanceof Node
    && target.contains(event.relatedTarget)
}

export function getDocumentTreeDragTarget(clientX: number, clientY: number, sourceId: string): DocumentTreeDragTarget | null {
  const targetRow = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>(TREE_ROW_SELECTOR)
  if (!targetRow) return null

  const targetId = targetRow.dataset.docId ?? null
  if (!targetId || targetId === sourceId) return null

  return {
    id: targetId,
    placement: getDocumentDropPlacement(targetRow, clientY)
  }
}
