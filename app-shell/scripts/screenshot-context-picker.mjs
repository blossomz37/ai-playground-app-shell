// Playwright + Electron screenshot harness for Plan 50 context evidence.
// Launches the built app, drives the shared context tree in the AI-facing
// surfaces, and writes screenshots under workspace-agents/implementation/screenshots.
//
// Prereqs:
//   npm run build
// Run:
//   SHOT_DATE=<stamp> node scripts/screenshot-context-picker.mjs

import { _electron as electron } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const shotDir = join(appDir, '..', 'workspace-agents', 'implementation', 'screenshots')
const stamp = process.env.SHOT_DATE ?? '2026-06-25-context-tree'
const shot = (name) => join(shotDir, `pw-${name}-${stamp}.png`)

const { ELECTRON_RUN_AS_NODE, ...cleanEnv } = process.env
const app = await electron.launch({ args: ['.'], cwd: appDir, env: cleanEnv })
let previousProviderId
let previousDemoMode

async function clickRail(win, moduleId) {
  await win.click(`[data-rail-id="${moduleId}"]`)
  await win.waitForTimeout(1200)
}

async function ensureInspector(win) {
  const inspector = win.locator('aside.inspector')
  if (await inspector.count()) return
  await win.keyboard.press(process.platform === 'darwin' ? 'Meta+I' : 'Control+I')
  await inspector.waitFor({ timeout: 5000 })
}

async function toggleFirstContextRow(scope, kind) {
  const rows = scope.locator('.context-picker .tree-row')
  const count = await rows.count()
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index)
    const text = await row.textContent()
    if (!text?.includes(kind)) continue
    const checkbox = row.locator('input[type="checkbox"]')
    if (await checkbox.isEnabled()) {
      await checkbox.click()
      return text.replace(/\s+/g, ' ').trim()
    }
  }
  return null
}

async function expandFirstFolder(scope) {
  const folderRow = scope.locator('.context-picker .tree-row').filter({ hasText: 'Folder' }).first()
  if (await folderRow.count()) {
    const button = folderRow.locator('.expand-btn')
    if (await button.isEnabled()) await button.click()
  }
}

try {
  const win = await app.firstWindow()
  win.on('pageerror', (err) => console.log('PAGEERROR:', err.message))
  win.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') console.log(`PAGE ${msg.type()}:`, msg.text())
  })
  await win.waitForSelector('.activity-rail', { timeout: 20000 })
  await win.screenshot({ path: shot('boot') })

  previousProviderId = await win.evaluate(() => window.shell.settings.get('ai.providerId') ?? null)
  previousDemoMode = await win.evaluate(() => window.shell.settings.get('demoMode.enabled') ?? false)
  await win.evaluate(() => window.shell.settings.set('demoMode.enabled', true))
  await win.evaluate(() => window.shell.settings.set('ai.providerId', 'mock-local'))

  const railIds = await win.$$eval('[data-rail-id]', (els) => els.map((e) => e.getAttribute('data-rail-id')))
  console.log('rail modules:', railIds.join(', '))

  // Prompt Studio: context tree lives in the left panel tab.
  await clickRail(win, 'shell.promptstudio')
  await win.getByRole('tab', { name: 'Context' }).click()
  await win.waitForSelector('.context-picker .tree-row', { timeout: 10000 })
  await expandFirstFolder(win)
  const promptFolder = await toggleFirstContextRow(win, 'Folder')
  if (promptFolder) console.log('Prompt Studio toggled folder:', promptFolder)
  await win.screenshot({ path: shot('promptstudio-context-tree') })

  await win.getByRole('tab', { name: 'Templates' }).click()
  await win.getByTitle('New Template').click()
  await win.waitForSelector('.template-item.active input.inline-rename', { timeout: 10000 })
  await win.screenshot({ path: shot('promptstudio-new-template') })
  await win.keyboard.press('Escape')

  await win.click('button:has-text("Preview Prompt")')
  const previewPanel = win.locator('.preview-section')
  await previewPanel.waitFor({ timeout: 10000 })
  await previewPanel.scrollIntoViewIfNeeded()
  await previewPanel.screenshot({ path: shot('preview-panel') })

  // AI Chat: compact button opens the inspector tree.
  await clickRail(win, 'shell.aichat')
  await win.waitForTimeout(500)
  const newButton = win.locator('.new-btn')
  if (await newButton.count()) await newButton.click()
  await win.click('.context-btn')
  await win.waitForSelector('aside.inspector .context-picker .tree-row', { timeout: 10000 })
  await expandFirstFolder(win.locator('aside.inspector'))
  const chatDoc = await toggleFirstContextRow(win.locator('aside.inspector'), 'Doc')
  if (chatDoc) console.log('AI Chat toggled document:', chatDoc)
  await win.screenshot({ path: shot('aichat-context-tree') })

  const assistantCountBefore = await win.$$eval('.message.assistant', (els) => els.length)
  await win.fill('.chat-input', 'Summarize the selected context in one sentence.')
  await win.click('.send-btn')
  await win.waitForFunction(
    (count) => document.querySelectorAll('.message.assistant').length > count,
    assistantCountBefore,
    { timeout: 10000 }
  )
  await win.screenshot({ path: shot('aichat-response') })

  // Documents: inspector exposes the same AI context tree.
  await clickRail(win, 'shell.documents')
  const selectedDocumentId = await win.evaluate(async () => {
    const workspace = await window.shell.workspace.get()
    const docs = await window.shell.documents.list(workspace.id)
    const doc = docs.find((item) => item.nodeType === 'document' && !item.archivedAt) ?? docs.find((item) => !item.archivedAt)
    if (!doc) return null
    window.dispatchEvent(new CustomEvent('shell:capture-select-document', { detail: doc.id }))
    return doc.id
  })
  if (selectedDocumentId) {
    await win.waitForSelector(`[data-doc-id="${selectedDocumentId}"].active`, { timeout: 10000 }).catch(() => {})
  }
  await ensureInspector(win)
  await win.waitForSelector('aside.inspector .context-picker .tree-row', { timeout: 10000 })
  await win.screenshot({ path: shot('documents-context-tree') })

  // Workflow/Chains: same inspector tree drives chain context.
  await clickRail(win, 'shell.workflow')
  await ensureInspector(win)
  await win.waitForSelector('aside.inspector .context-picker .tree-row', { timeout: 10000 })
  await win.screenshot({ path: shot('workflow-context-tree') })

  console.log('\nScreenshots written to workspace-agents/implementation/screenshots/')
} finally {
  if (previousProviderId !== undefined) {
    const win = await app.firstWindow().catch(() => null)
    if (win) {
      await win.evaluate((providerId) => window.shell.settings.set('ai.providerId', providerId ?? 'openai-responses'), previousProviderId)
      if (previousDemoMode !== undefined) {
        await win.evaluate((demoMode) => window.shell.settings.set('demoMode.enabled', demoMode), previousDemoMode)
      }
    }
  }
  await app.close()
}
