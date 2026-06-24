// Playwright + Electron screenshot harness for the AI context picker (plan 50,
// Upgrade 2). Launches the BUILT app (out/main + out/renderer) against the real
// SQLite workspace, drives Prompt Studio, and captures the interactive states
// the cold-launch SHELL_CAPTURE hook cannot reach (open picker, populated
// context, preview panel).
//
// Prereqs:
//   npm run build           # produces out/main + out/renderer
//   quit any running dev instance (it locks the same SQLite file)
// Run:
//   node scripts/screenshot-context-picker.mjs
//
// Output: ../workspace-agents/implementation/screenshots/pw-*.png

import { _electron as electron } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const shotDir = join(appDir, '..', 'workspace-agents', 'implementation', 'screenshots')
const stamp = process.env.SHOT_DATE ?? '2026-06-24'
const shot = (name) => join(shotDir, `pw-${name}-${stamp}.png`)

// Some shells export ELECTRON_RUN_AS_NODE=1, which makes Electron run as plain
// Node (electron.app becomes undefined). Strip it so the app boots normally.
const { ELECTRON_RUN_AS_NODE, ...cleanEnv } = process.env
const app = await electron.launch({ args: ['.'], cwd: appDir, env: cleanEnv })
let previousProviderId
let previousDemoMode
try {
  const win = await app.firstWindow()
  win.on('pageerror', (err) => console.log('PAGEERROR:', err.message))
  win.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') console.log(`PAGE ${msg.type()}:`, msg.text())
  })
  await win.waitForSelector('.activity-rail', { timeout: 20000 })
  await win.screenshot({ path: shot('boot') })

  // 1. Navigate to Prompt Studio.
  const railIds = await win.$$eval('[data-rail-id]', (els) => els.map((e) => e.getAttribute('data-rail-id')))
  console.log('rail modules:', railIds.join(', '))
  await win.click('[data-rail-id="shell.promptstudio"]')
  await win.waitForTimeout(2500) // let module switch + onMount context refresh settle
  await win.screenshot({ path: shot('promptstudio') })
  const activeRail = await win.$$eval('[data-rail-id][aria-current="page"]', (e) => e.map((x) => x.getAttribute('data-rail-id')))
  const hasPicker = await win.$('.context-picker')
  console.log('after click -> active rail:', activeRail.join(',') || '(none)', '| context-picker:', !!hasPicker)
  if (!hasPicker) {
    console.log('Prompt Studio did not render the picker; see pw-promptstudio screenshot.')
    await app.close()
    process.exit(0)
  }

  const hasSelect = await win.$('.context-picker .doc-select')
  const candidateCount = await win.$$eval('.context-picker .candidate', (e) => e.length)
  console.log(`context-picker mounted. candidates=${candidateCount}, addable-select=${!!hasSelect}`)
  if (!hasSelect) {
    console.log('No addable documents in this workspace — nothing to expand. Captured promptstudio state.')
  }

  // 2. Read the picker's tree options — proof that folders + nested docs list.
  const options = hasSelect ? await win.$$eval('.context-picker .doc-select option', (els) =>
    els.map((el) => ({ value: el.value, label: el.textContent })).filter((o) => o.value)
  ) : []
  console.log('Context picker dropdown options:')
  for (const o of options) console.log(`  "${o.label}"`)

  // 3. Add the first folder (📁) and capture the populated context list.
  const folder = options.find((o) => o.label.includes('📁'))
  if (folder) {
    await win.selectOption('.context-picker .doc-select', folder.value)
    await win.click('.context-picker .add-btn')
    await win.waitForSelector('.context-picker .candidate', { timeout: 10000 })
    const added = await win.$$eval('.context-picker .candidate .candidate-title', (els) =>
      els.map((el) => el.textContent)
    )
    console.log(`\nAdded folder "${folder.label.trim()}" -> context candidates:`)
    for (const t of added) console.log(`  - ${t}`)
    await win.screenshot({ path: shot('context-populated') })
  } else {
    console.log('\nNo folder option found in this workspace; skipping folder-add capture.')
  }

  // 4. Preview the prompt (provider-free) and capture the preview panel.
  await win.click('button:has-text("Preview Prompt")')
  const previewPanel = win.locator('.preview-section')
  await previewPanel.waitFor({ timeout: 10000 })
  await previewPanel.scrollIntoViewIfNeeded()
  // Element screenshot so the panel is captured even when it sits below the fold.
  await previewPanel.screenshot({ path: shot('preview-panel') })

  // 5. Navigate to AI Chat and prove it uses the same full picker in the inspector.
  previousProviderId = await win.evaluate(() => window.shell.settings.get('ai.providerId') ?? null)
  previousDemoMode = await win.evaluate(() => window.shell.settings.get('demoMode.enabled') ?? false)
  await win.evaluate(() => window.shell.settings.set('demoMode.enabled', true))
  await win.evaluate(() => window.shell.settings.set('ai.providerId', 'mock-local'))
  await win.click('[data-rail-id="shell.aichat"]')
  await win.waitForTimeout(1500)
  await win.click('.new-btn')
  await win.waitForSelector('.empty-state', { timeout: 10000 })
  await win.click('.context-btn')
  await win.waitForSelector('aside.inspector .context-picker', { timeout: 10000 })

  const chatHasSelect = await win.$('aside.inspector .context-picker .doc-select')
  const chatOptions = chatHasSelect ? await win.$$eval('aside.inspector .context-picker .doc-select option', (els) =>
    els.map((el) => ({ value: el.value, label: el.textContent })).filter((o) => o.value)
  ) : []
  const chatFolder = chatOptions.find((o) => o.label.includes('📁'))
  if (chatFolder) {
    await win.selectOption('aside.inspector .context-picker .doc-select', chatFolder.value)
    await win.click('aside.inspector .context-picker .add-btn')
    await win.waitForSelector('aside.inspector .context-picker .candidate', { timeout: 10000 })
  }
  await win.screenshot({ path: shot('aichat-context') })

  // 6. Send a mock chat message so the selected context path is exercised without a provider call.
  const assistantCountBefore = await win.$$eval('.message.assistant', (els) => els.length)
  await win.fill('.chat-input', 'Summarize the selected context in one sentence.')
  await win.click('.send-btn')
  await win.waitForFunction(
    (count) => document.querySelectorAll('.message.assistant').length > count,
    assistantCountBefore,
    { timeout: 10000 }
  )
  await win.screenshot({ path: shot('aichat-response') })
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
