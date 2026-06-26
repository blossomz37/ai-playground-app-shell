export interface LineDiffRow {
  index: number
  left: string
  right: string
  changed: boolean
}

export function buildLineDiff(left: string, right: string): LineDiffRow[] {
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
