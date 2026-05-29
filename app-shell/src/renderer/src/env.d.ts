import type { ShellApi } from '@shared/module-contract'

declare global {
  interface Window {
    shell: ShellApi
  }
}
