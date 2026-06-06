import { mount } from 'svelte'
import { installBrowserShell } from './browser-shell'
import './styles/tokens.css'
import './styles/global.css'

async function bootstrap(): Promise<void> {
  installBrowserShell()

  const { default: App } = await import('./App.svelte')
  mount(App, { target: document.getElementById('app')! })
}

void bootstrap()
