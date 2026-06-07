import { packager } from '@electron/packager'
import { execFile } from 'node:child_process'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(scriptDir, '..')
const outDir = resolve(appRoot, 'release')
const arch = process.arch === 'x64' ? 'x64' : 'arm64'
const packageJson = JSON.parse(await readFile(resolve(appRoot, 'package.json'), 'utf8'))
const execFileAsync = promisify(execFile)

await mkdir(outDir, { recursive: true })

const paths = await packager({
  dir: appRoot,
  name: packageJson.productName,
  platform: 'darwin',
  arch,
  out: outDir,
  overwrite: true,
  prune: true,
  appVersion: packageJson.version,
  buildVersion: packageJson.version,
  executableName: packageJson.productName,
  ignore: [
    /^\/\.electron-dev($|\/)/,
    /^\/release($|\/)/,
    /^\/src($|\/)/,
    /^\/tsconfig.*\.json$/,
    /^\/electron\.vite\.config\.ts$/,
    /^\/scripts\/audit-contrast\.mjs$/,
    /^\/scripts\/start-dev\.mjs$/
  ]
})

for (const appPath of paths) {
  const appBundle = resolve(appPath, `${packageJson.productName}.app`)
  await copyFile(
    resolve(appRoot, 'resources/icon.icns'),
    resolve(appBundle, 'Contents/Resources/electron.icns')
  )
  await execFileAsync('codesign', ['--force', '--deep', '--sign', '-', appBundle])
  console.log(`Packaged ${packageJson.productName} ${packageJson.version}: ${appPath}`)
}
