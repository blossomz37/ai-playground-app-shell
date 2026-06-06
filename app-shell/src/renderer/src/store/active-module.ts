import { writable } from 'svelte/store'
import { FALLBACK_MODULE_ID } from '@shared/module-policy'

export const activeModuleId = writable<string | null>(FALLBACK_MODULE_ID)
