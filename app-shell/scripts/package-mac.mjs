import { packager } from '@electron/packager'
import { notarize } from '@electron/notarize'
import { sign } from '@electron/osx-sign'
import { execFile } from 'node:child_process'
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(scriptDir, '..')
const outDir = resolve(appRoot, 'release')
const arch = process.arch === 'x64' ? 'x64' : 'arm64'
const packageJson = JSON.parse(await readFile(resolve(appRoot, 'package.json'), 'utf8'))
const execFileAsync = promisify(execFile)
const bundleId = process.env.APP_BUNDLE_ID ?? 'com.carlosantiago.appshell'
const signingIdentity = process.env.APPLE_SIGNING_IDENTITY
  ?? 'Developer ID Application: CARLO VAUGHN SANTIAGO (8A6AATAK67)'
const teamId = process.env.APPLE_TEAM_ID ?? '8A6AATAK67'
const entitlements = resolve(appRoot, 'resources/entitlements.mac.plist')

function notarizationOptions(appPath) {
  if (process.env.APPLE_NOTARY_KEYCHAIN_PROFILE) {
    return {
      appPath,
      keychainProfile: process.env.APPLE_NOTARY_KEYCHAIN_PROFILE
    }
  }

  if (process.env.APPLE_API_KEY && process.env.APPLE_API_ISSUER) {
    return {
      appPath,
      appleApiKey: process.env.APPLE_API_KEY,
      appleApiIssuer: process.env.APPLE_API_ISSUER
    }
  }

  if (process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    return {
      appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId
    }
  }

  return null
}

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
  appBundleId: bundleId,
  appCategoryType: 'public.app-category.productivity',
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
  const zipPath = resolve(outDir, `${packageJson.productName}-${packageJson.version}-${arch}-mac.zip`)
  await copyFile(
    resolve(appRoot, 'resources/icon.icns'),
    resolve(appBundle, 'Contents/Resources/electron.icns')
  )
  console.log(`Signing ${appBundle} with ${signingIdentity}`)
  await sign({
    app: appBundle,
    identity: signingIdentity,
    entitlements,
    hardenedRuntime: true
  })

  const notaryOptions = notarizationOptions(appBundle)
  if (notaryOptions) {
    console.log(`Notarizing ${appBundle}`)
    await notarize(notaryOptions)
    await execFileAsync('xcrun', ['stapler', 'validate', appBundle])
  } else {
    console.log('Skipping notarization: set APPLE_NOTARY_KEYCHAIN_PROFILE, APPLE_API_KEY/APPLE_API_ISSUER, or APPLE_ID/APPLE_APP_SPECIFIC_PASSWORD.')
  }

  await rm(zipPath, { force: true })
  await execFileAsync('ditto', ['-c', '-k', '--keepParent', appBundle, zipPath])
  console.log(`Packaged ${packageJson.productName} ${packageJson.version}: ${appPath}`)
  console.log(`Distribution zip: ${zipPath}`)
}
