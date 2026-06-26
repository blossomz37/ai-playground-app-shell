import { app, webContents } from 'electron'
import type * as Keytar from 'keytar'
import type {
  WebCredentialAccount,
  WebCredentialFillResult,
  WebCredentialStoreInfo
} from '@shared/module-contract'

const SERVICE_PREFIX = 'com.carlosantiago.appshell.web-credentials'

let keytarModule: typeof Keytar | null = null

async function getKeytar(): Promise<typeof Keytar> {
  if (process.platform !== 'darwin') {
    throw new Error('App-owned web credentials are currently supported on macOS only.')
  }
  if (!keytarModule) {
    const imported = await import('keytar')
    keytarModule = ('default' in imported ? imported.default : imported) as typeof Keytar
  }
  return keytarModule
}

function normalizeOrigin(value: string): string {
  const origin = new URL(value).origin
  if (!origin.startsWith('https://') && !origin.startsWith('http://')) {
    throw new Error('Only HTTP and HTTPS origins can store web credentials.')
  }
  return origin
}

function normalizeAccount(value: string): string {
  const account = value.trim()
  if (!account) throw new Error('Credential account is required.')
  return account
}

function serviceForOrigin(origin: string): string {
  return `${SERVICE_PREFIX}:${normalizeOrigin(origin)}`
}

function appIdentity(): string {
  return app.isPackaged ? `${app.getName()} (${app.getVersion()})` : 'Electron development build'
}

function promptBehavior(): string {
  if (app.isPackaged) {
    return 'macOS Keychain prompts identify the signed App Shell build. A changed signing identity may trigger a new access prompt.'
  }
  return 'macOS Keychain prompts identify the unsigned Electron development runtime. The signed App Shell build may prompt again for the same saved item.'
}

function fillCredentialScript(account: string, secret: string): string {
  return `
    (() => {
      const account = ${JSON.stringify(account)};
      const secret = ${JSON.stringify(secret)};
      const controls = Array.from(document.querySelectorAll('input'))
        .filter((input) => !input.disabled && !input.readOnly && input.offsetParent !== null);
      const passwordInput = controls.find((input) => input.type === 'password') || null;
      const accountInput = controls.find((input) => {
        if (input === passwordInput) return false;
        const type = (input.type || 'text').toLowerCase();
        const autocomplete = (input.autocomplete || '').toLowerCase();
        const name = (input.name || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        return ['email', 'text', 'search', 'tel', 'url'].includes(type)
          && (autocomplete.includes('username')
            || autocomplete.includes('email')
            || name.includes('email')
            || name.includes('user')
            || id.includes('email')
            || id.includes('user')
            || !input.value);
      }) || null;

      function setControlValue(input, value) {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
        if (setter) setter.call(input, value);
        else input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (accountInput) setControlValue(accountInput, account);
      if (passwordInput) {
        setControlValue(passwordInput, secret);
        passwordInput.focus();
      }

      return {
        filledAccount: Boolean(accountInput),
        filledSecret: Boolean(passwordInput)
      };
    })();
  `
}

export const webCredentialsService = {
  info(): WebCredentialStoreInfo {
    return {
      supported: process.platform === 'darwin',
      platform: process.platform,
      servicePrefix: SERVICE_PREFIX,
      appIdentity: appIdentity(),
      promptBehavior: promptBehavior()
    }
  },

  async list(origin: string): Promise<WebCredentialAccount[]> {
    const normalizedOrigin = normalizeOrigin(origin)
    const keytar = await getKeytar()
    const credentials = await keytar.findCredentials(serviceForOrigin(normalizedOrigin))
    return credentials
      .map(credential => ({ origin: normalizedOrigin, account: credential.account }))
      .sort((a, b) => a.account.localeCompare(b.account))
  },

  async save(params: { origin: string; account: string; secret: string }): Promise<void> {
    const normalizedOrigin = normalizeOrigin(params.origin)
    const account = normalizeAccount(params.account)
    if (!params.secret) throw new Error('Credential secret is required.')

    const keytar = await getKeytar()
    await keytar.setPassword(serviceForOrigin(normalizedOrigin), account, params.secret)
  },

  async delete(params: { origin: string; account: string }): Promise<boolean> {
    const keytar = await getKeytar()
    return keytar.deletePassword(serviceForOrigin(params.origin), normalizeAccount(params.account))
  },

  async fill(params: { origin: string; account: string; webContentsId: number }): Promise<WebCredentialFillResult> {
    const normalizedOrigin = normalizeOrigin(params.origin)
    const account = normalizeAccount(params.account)
    const target = webContents.fromId(params.webContentsId)
    if (!target) throw new Error('Web credential target was not found.')

    const targetOrigin = normalizeOrigin(target.getURL())
    if (targetOrigin !== normalizedOrigin) {
      throw new Error('Credential origin does not match the active web page.')
    }

    const keytar = await getKeytar()
    const secret = await keytar.getPassword(serviceForOrigin(normalizedOrigin), account)
    if (!secret) throw new Error('Credential was not found in Keychain.')

    return target.executeJavaScript(fillCredentialScript(account, secret), true) as Promise<WebCredentialFillResult>
  }
}
