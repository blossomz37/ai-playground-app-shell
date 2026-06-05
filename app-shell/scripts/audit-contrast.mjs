import { readFileSync } from 'fs'
import { resolve } from 'path'

const tokensPath = resolve('src/renderer/src/styles/tokens.css')
const css = readFileSync(tokensPath, 'utf8')

const tokenNames = [
  '--color-fg-primary',
  '--color-fg-secondary',
  '--color-fg-muted',
  '--color-accent',
  '--color-bg-overlay',
  '--color-shell-topbar',
  '--color-shell-rail',
  '--color-shell-sidebar',
  '--color-shell-main',
  '--color-shell-inspector',
  '--color-shell-status',
  '--color-focus-ring',
  '--color-action-text',
  '--editor-table-border',
  '--editor-table-header-bg',
  '--editor-table-header-fg',
  '--editor-table-cell-bg',
  '--editor-table-selection',
  '--editor-table-resize',
  '--accent-nav',
  '--accent-editor',
  '--accent-inspector',
  '--gray-1',
  '--gray-2',
  '--gray-3',
  '--gray-4',
  '--gray-5',
  '--gray-6',
  '--gray-7',
  '--gray-8',
  '--gray-9',
  '--gray-10',
  '--gray-11',
  '--gray-12',
  '--jewel-emerald',
  '--jewel-sapphire',
  '--jewel-amethyst'
]

const textPairs = [
  ['primary on topbar', '--color-fg-primary', '--color-shell-topbar', 4.5],
  ['secondary on topbar', '--color-fg-secondary', '--color-shell-topbar', 4.5],
  ['muted on topbar', '--color-fg-muted', '--color-shell-topbar', 4.5],
  ['primary on rail', '--color-fg-primary', '--color-shell-rail', 4.5],
  ['secondary on rail', '--color-fg-secondary', '--color-shell-rail', 4.5],
  ['muted on rail', '--color-fg-muted', '--color-shell-rail', 4.5],
  ['primary on sidebar', '--color-fg-primary', '--color-shell-sidebar', 4.5],
  ['secondary on sidebar', '--color-fg-secondary', '--color-shell-sidebar', 4.5],
  ['muted on sidebar', '--color-fg-muted', '--color-shell-sidebar', 4.5],
  ['primary on main', '--color-fg-primary', '--color-shell-main', 4.5],
  ['secondary on main', '--color-fg-secondary', '--color-shell-main', 4.5],
  ['muted on main', '--color-fg-muted', '--color-shell-main', 4.5],
  ['primary on inspector', '--color-fg-primary', '--color-shell-inspector', 4.5],
  ['secondary on inspector', '--color-fg-secondary', '--color-shell-inspector', 4.5],
  ['muted on inspector', '--color-fg-muted', '--color-shell-inspector', 4.5],
  ['primary on status', '--color-fg-primary', '--color-shell-status', 4.5],
  ['secondary on status', '--color-fg-secondary', '--color-shell-status', 4.5],
  ['muted on status', '--color-fg-muted', '--color-shell-status', 4.5],
  ['primary on overlay', '--color-fg-primary', '--color-bg-overlay', 4.5],
  ['secondary on overlay', '--color-fg-secondary', '--color-bg-overlay', 4.5],
  ['muted on overlay', '--color-fg-muted', '--color-bg-overlay', 4.5],
  ['rail inactive icon', '--color-fg-secondary', '--color-shell-rail', 4.5],
  ['rail active icon', '--accent-nav', '--color-shell-rail', 3],
  ['context strip action', '--color-action-text', '--color-shell-topbar', 4.5],
  ['AI input placeholder', '--color-fg-secondary', '--color-bg-overlay', 4.5],
  ['inspector labels', '--color-fg-muted', '--color-shell-inspector', 4.5],
  ['inspector values', '--color-fg-secondary', '--color-shell-inspector', 4.5],
  ['document table header text', '--editor-table-header-fg', '--editor-table-header-bg', 4.5]
]

const nonTextPairs = [
  ['focus ring on topbar', '--color-focus-ring', '--color-shell-topbar', 3],
  ['focus ring on rail', '--color-focus-ring', '--color-shell-rail', 3],
  ['focus ring on sidebar', '--color-focus-ring', '--color-shell-sidebar', 3],
  ['focus ring on main', '--color-focus-ring', '--color-shell-main', 3],
  ['focus ring on inspector', '--color-focus-ring', '--color-shell-inspector', 3],
  ['focus ring on status', '--color-focus-ring', '--color-shell-status', 3],
  ['document table border', '--editor-table-border', '--editor-table-cell-bg', 3],
  ['document table selection', '--editor-table-selection', '--editor-table-cell-bg', 3],
  ['document table resize handle', '--editor-table-resize', '--editor-table-cell-bg', 3]
]

const themes = {
  dark: collectThemeTokens('dark'),
  light: collectThemeTokens('light'),
  gray: collectThemeTokens('gray')
}

let failures = 0
for (const [themeName, tokens] of Object.entries(themes)) {
  console.log(`\n${themeName.toUpperCase()}`)
  for (const pair of [...textPairs, ...nonTextPairs]) {
    const [label, fgToken, bgToken, minimum] = pair
    const fg = resolveToken(tokens, fgToken)
    const bg = resolveToken(tokens, bgToken)
    const ratio = contrast(parseColor(fg), parseColor(bg))
    const pass = ratio >= minimum
    if (!pass) failures += 1
    console.log(`${pass ? 'PASS' : 'FAIL'} ${ratio.toFixed(2)} ${label} (${fgToken} on ${bgToken}, min ${minimum})`)
  }
}

if (failures > 0) {
  console.error(`\nContrast audit failed: ${failures} pair${failures === 1 ? '' : 's'} below target.`)
  process.exit(1)
}

console.log('\nContrast audit passed: all measured token pairs meet targets.')

function collectThemeTokens(themeName) {
  const rootTokens = readDeclarations(css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? '')
  const themeSelector = `\\[data-theme="${themeName}"\\]`
  const themeTokens = readDeclarations(css.match(new RegExp(`${themeSelector}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? '')
  return { ...rootTokens, ...themeTokens }
}

function readDeclarations(block) {
  const tokens = {}
  for (const match of block.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (tokenNames.includes(match[1])) {
      tokens[match[1]] = match[2].trim()
    }
  }
  return tokens
}

function resolveToken(tokens, name, seen = new Set()) {
  const value = tokens[name]
  if (!value) throw new Error(`Missing token ${name}`)
  const varMatch = value.match(/^var\((--[a-zA-Z0-9-]+)\)$/)
  if (!varMatch) return value
  if (seen.has(name)) throw new Error(`Circular token reference at ${name}`)
  seen.add(name)
  return resolveToken(tokens, varMatch[1], seen)
}

function parseColor(value) {
  const hex = value.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (hex) {
    const raw = hex[1].length === 3
      ? hex[1].split('').map((char) => char + char).join('')
      : hex[1]
    return [
      Number.parseInt(raw.slice(0, 2), 16),
      Number.parseInt(raw.slice(2, 4), 16),
      Number.parseInt(raw.slice(4, 6), 16)
    ]
  }

  const rgb = value.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*[\d.]+)?\s*\)$/)
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  }

  throw new Error(`Unsupported color value "${value}". Use direct hex/rgb tokens for audited pairs.`)
}

function contrast(foreground, background) {
  const fg = relativeLuminance(foreground)
  const bg = relativeLuminance(background)
  const lighter = Math.max(fg, bg)
  const darker = Math.min(fg, bg)
  return (lighter + 0.05) / (darker + 0.05)
}

function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
