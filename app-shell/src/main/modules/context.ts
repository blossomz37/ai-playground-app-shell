import type { ModuleContext, Workspace, Disposable } from '@shared/module-contract'
import { documents } from '../core/documents'
import { events } from '../core/events'
import { jobs } from '../core/jobs'
import { createSettingsStore } from '../core/settings'
import { createFileSystemService } from '../core/filesystem'
import { searchService } from '../core/search'
import { secretsService } from '../core/secrets'

const commandHandlers = new Map<string, (...args: unknown[]) => unknown>()

/**
 * Extended context that tracks all Disposable resources created during a
 * module's activate() so they can be bulk-disposed on deactivation.
 */
export interface DisposableModuleContext extends ModuleContext {
  _disposables: Disposable[]
  _disposeAll(): void
}

export function createModuleContext(moduleId: string, workspace: Workspace): DisposableModuleContext {
  const settings = createSettingsStore(moduleId)
  const disposables: Disposable[] = []
  const fs = createFileSystemService(workspace.root)

  /** Wrap a Disposable — track it for bulk cleanup and return the original. */
  function track(d: Disposable): Disposable {
    disposables.push(d)
    return d
  }

  return {
    moduleId,
    _disposables: disposables,
    _disposeAll() {
      for (const d of disposables) d.dispose()
      disposables.length = 0
    },

    commands: {
      register(id, handler) {
        commandHandlers.set(id, handler)
        return track({ dispose() { commandHandlers.delete(id) } })
      },
      async execute(id, ...args) {
        const h = commandHandlers.get(id)
        if (!h) throw new Error(`Command not found: ${id}`)
        return h(...args)
      }
    },

    settings,

    secrets: {
      async get(name) { return secretsService.get(name) },
      async list() { return secretsService.list() }
    },

    fs,

    search: {
      async query(text, opts) {
        return searchService.search(text, workspace.id, opts?.limit)
      }
    },

    jobs: {
      defineRunner(jobType, run) {
        return track(jobs.defineRunner(jobType, run))
      },
      submit: jobs.submit.bind(jobs)
    },

    events: {
      on(event, cb) {
        return track(events.on(event, cb))
      },
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
      onChanged(cb) { return track(events.on('documents:changed', cb as (p: unknown) => void)) }
    },

    notify(toast) { events.emit('shell:notify', toast) },

    theme: { token: (name) => `var(--${name})` },

    workspace
  }
}

export function getCommandHandler(id: string): ((...args: unknown[]) => unknown) | undefined {
  return commandHandlers.get(id)
}
