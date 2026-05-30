import { mount } from 'svelte'
import App from './App.svelte'
import { installBrowserShell } from './browser-shell'
import './styles/tokens.css'
import './styles/global.css'

installBrowserShell()

mount(App, { target: document.getElementById('app')! })
