function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function sanitizeUrl(value: string): string {
  const trimmed = value.trim()
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed
  return '#'
}

function renderInline(value: string): string {
  const codeSpans: string[] = []
  let html = value.replace(/`([^`]+)`/g, (_match, code: string) => {
    const token = `\u0000CODE${codeSpans.length}\u0000`
    codeSpans.push(`<code>${escapeHtml(code)}</code>`)
    return token
  })

  html = escapeHtml(html)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) =>
      `<a href="${escapeHtml(sanitizeUrl(url))}" target="_blank" rel="noreferrer">${label}</a>`
    )

  return html.replace(/\u0000CODE(\d+)\u0000/g, (_match, index: string) => codeSpans[Number(index)] ?? '')
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed.includes('|')) return false
  const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|')
  return cells.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell.trim()))
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
}

function renderTable(rows: string[]): string {
  const headers = splitTableRow(rows[0])
  const bodyRows = rows.slice(2).map(splitTableRow)

  return [
    '<div class="markdown-table-wrap"><table>',
    '<thead><tr>',
    headers.map(header => `<th>${renderInline(header)}</th>`).join(''),
    '</tr></thead>',
    '<tbody>',
    bodyRows.map(row => [
      '<tr>',
      headers.map((_header, index) => `<td>${renderInline(row[index] ?? '')}</td>`).join(''),
      '</tr>'
    ].join('')).join(''),
    '</tbody></table></div>'
  ].join('')
}

function renderParagraph(lines: string[]): string {
  return `<p>${lines.map(line => renderInline(line.trim())).join('<br>')}</p>`
}

function renderList(lines: string[], ordered: boolean): string {
  const tag = ordered ? 'ol' : 'ul'
  const items = lines.map(line => {
    const text = ordered
      ? line.replace(/^\s*\d+\.\s+/, '')
      : line.replace(/^\s*[-*]\s+/, '')
    return `<li>${renderInline(text)}</li>`
  })
  return `<${tag}>${items.join('')}</${tag}>`
}

export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const blocks: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i += 1
      continue
    }

    const fence = line.match(/^```([\w-]+)?\s*$/)
    if (fence) {
      const language = fence[1] ? ` data-language="${escapeHtml(fence[1])}"` : ''
      const code: string[] = []
      i += 1
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i])
        i += 1
      }
      if (i < lines.length) i += 1
      blocks.push(`<pre${language}><code>${escapeHtml(code.join('\n'))}</code></pre>`)
      continue
    }

    if (line.trim().startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const tableRows = [line, lines[i + 1]]
      i += 2
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim()) {
        tableRows.push(lines[i])
        i += 1
      }
      blocks.push(renderTable(tableRows))
      continue
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length
      blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`)
      i += 1
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const listLines: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        listLines.push(lines[i])
        i += 1
      }
      blocks.push(renderList(listLines, false))
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const listLines: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listLines.push(lines[i])
        i += 1
      }
      blocks.push(renderList(listLines, true))
      continue
    }

    const paragraphLines = [line]
    i += 1
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^```/.test(lines[i]) &&
      !/^#{1,4}\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !(lines[i].trim().startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      paragraphLines.push(lines[i])
      i += 1
    }
    blocks.push(renderParagraph(paragraphLines))
  }

  return blocks.join('\n')
}
