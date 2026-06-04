import { spawn } from 'child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const APP_NAME = 'App Shell'
const APP_BUNDLE_ID = 'com.carlosantiago.appshell.dev'
const APP_BUNDLE_NAME = `${APP_NAME}.app`

const scriptDir = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

if (process.platform === 'darwin') {
  env.ELECTRON_EXEC_PATH = join(
    prepareMacDevElectronBundle(),
    APP_BUNDLE_NAME,
    'Contents',
    'MacOS',
    'Electron'
  )
}

const electronViteBin =
  process.platform === 'win32'
    ? join(appRoot, 'node_modules', '.bin', 'electron-vite.cmd')
    : join(appRoot, 'node_modules', '.bin', 'electron-vite')

const child = spawn(electronViteBin, ['dev', ...args], {
  cwd: appRoot,
  env,
  shell: process.platform === 'win32',
  stdio: 'inherit'
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})

function prepareMacDevElectronBundle() {
  const sourceDist = join(appRoot, 'node_modules', 'electron', 'dist')
  const sourceBundle = join(sourceDist, 'Electron.app')
  const sourcePlist = join(sourceBundle, 'Contents', 'Info.plist')
  const devDist = join(appRoot, '.electron-dev')
  const targetBundle = join(devDist, APP_BUNDLE_NAME)
  const targetPlist = join(targetBundle, 'Contents', 'Info.plist')
  const markerPath = join(devDist, 'app-shell-electron-dev.json')

  if (!existsSync(sourceBundle)) {
    throw new Error(`Electron bundle not found at ${sourceBundle}`)
  }

  const sourceVersion = readPlistString(sourcePlist, 'CFBundleVersion')
  const sourceMtimeMs = Math.round(statSync(sourcePlist).mtimeMs)
  const marker = readJson(markerPath)
  const targetReady =
    existsSync(targetPlist) &&
    marker?.sourceVersion === sourceVersion &&
    marker?.sourceMtimeMs === sourceMtimeMs &&
    marker?.appBundleName === APP_BUNDLE_NAME &&
    readPlistString(targetPlist, 'CFBundleDisplayName') === APP_NAME &&
    readPlistString(targetPlist, 'CFBundleName') === APP_NAME &&
    readPlistString(targetPlist, 'CFBundleIdentifier') === APP_BUNDLE_ID

  if (targetReady) return devDist

  rmSync(devDist, { recursive: true, force: true })
  mkdirSync(devDist, { recursive: true })
  cpSync(sourceBundle, targetBundle, {
    recursive: true,
    preserveTimestamps: true,
    verbatimSymlinks: true
  })

  let plist = readFileSync(targetPlist, 'utf8')
  plist = setPlistString(plist, 'CFBundleDisplayName', APP_NAME)
  plist = setPlistString(plist, 'CFBundleName', APP_NAME)
  plist = setPlistString(plist, 'CFBundleIdentifier', APP_BUNDLE_ID)
  writeFileSync(targetPlist, plist)
  writeFileSync(
    markerPath,
    JSON.stringify(
      { appName: APP_NAME, appBundleName: APP_BUNDLE_NAME, bundleId: APP_BUNDLE_ID, sourceVersion, sourceMtimeMs },
      null,
      2
    )
  )

  return devDist
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function readPlistString(plistPath, key) {
  if (!existsSync(plistPath)) return null
  const plist = readFileSync(plistPath, 'utf8')
  const match = plist.match(new RegExp(`<key>${escapeRegExp(key)}</key>\\s*<string>([^<]*)</string>`))
  return match?.[1] ?? null
}

function setPlistString(plist, key, value) {
  const escapedKey = escapeRegExp(key)
  const pattern = new RegExp(`(<key>${escapedKey}</key>\\s*<string>)([^<]*)(</string>)`)
  if (pattern.test(plist)) {
    return plist.replace(pattern, `$1${escapePlistString(value)}$3`)
  }

  return plist.replace(
    '<dict>',
    `<dict>\n\t<key>${key}</key>\n\t<string>${escapePlistString(value)}</string>`
  )
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapePlistString(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
