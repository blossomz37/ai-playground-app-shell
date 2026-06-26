# Web Credentials Keychain Boundary

App Shell stores Web module credentials as app-owned macOS Keychain items through
`keytar`. It does not read Safari, iCloud Keychain, Chrome, or Google Password
Manager website passwords.

## Storage Boundary

- Keychain service prefix: `com.carlosantiago.appshell.web-credentials`
- Per-site service name: `<service-prefix>:<origin>`
- Per-account Keychain account: the user-entered account name or email
- Secret value: the user-entered password or token
- Access path: Electron main process only

The renderer can request account names for the current origin, save a new
account/secret pair, delete one, or ask main to fill the active webview. Main
retrieves the secret from Keychain and injects it directly into the target guest
`webContents` after verifying that the guest page origin matches the credential
origin.

## First-Run Save And Later Retrieval

The first run for a site is explicit:

1. Open the site in the Web module.
2. Enter the account and password/token in the Web inspector Credentials section.
3. Save it. The item is written to App Shell's own Keychain service.

Later retrieval is also explicit:

1. Open the same origin in the Web module.
2. Select the saved account.
3. Fill. Main reads the secret from Keychain and fills matching username/password
   fields in the active webview.

## macOS Prompt Behavior

Development builds run under the Electron development runtime. macOS Keychain
prompts may identify the requester as Electron or the local development binary.

Signed packaged builds run as App Shell with the configured bundle/signing
identity. macOS may prompt again when a signed build first accesses an item that
was created or previously accessed from the development runtime. This is
expected; choose the appropriate macOS allow option for the build you intend to
keep using.

Changing the bundle identifier, signing identity, or executable path can also
cause macOS to ask again because Keychain access control is tied to the calling
application identity.
