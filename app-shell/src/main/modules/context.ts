import type { ModuleContext, Workspace } from '@shared/module-contract'
import { documents } from '../core/documents'
import { events } from '../core/events'
import { jobs } from '../core/jobs'
import { createSettingsStore } from '../core/settings'

const commandHandlers = new Map<string, (...args: unknown[]) => unknown>()

export function createModuleContext(moduleId: string, workspace: Workspace): ModuleContext {
  const settings = createSettingsStore(moduleId)

  return {
    moduleId,

    commands: {
      register(id, handler) {
        commandHandlers.set(id, handler)
        return { dispose() { commandHandlers.delete(id) } }
      },
      async execute(id, ...args) {
        const h = commandHandlers.get(id)
        if (!h) throw new Error(`Command not found: ${id}`)
        return h(...args)
      }
    },

    settings,

    secrets: {
      async get(_name) { return undefined }, // TODO: Electron safeStorage
      async list() { return [] }
    },

    jobs: {
      defineRunner: jobs.defineRunner.bind(jobs),
      submit: jobs.submit.bind(jobs)
    },

    events: {
      on: events.on.bind(events),
      emit: events.emit.bind(events)
    },

    documents: {
      async open(id) {
        const doc = documents.open(id)
        if (!doc) throw new Error(`Document not found: ${id}`)
        return doc
      },
      async save(id, content) { documents.save(id, String(content)) },
      async versions(id) { return documents.versions(id) },
      onChanged(cb) { return events.on('documents:changed', cb as (p: unknown) => void) }
    },

    notify(toast) { events.emit('shell:notify', toast) },

    theme: { token: (name) => `var(--${name})` },

    workspace
  }
}

export function getCommandHandler(id: string): ((...args: unknown[]) => unknown) | undefined {
  return commandHandlers.get(id)
}
