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
      submit(jobType, payload) {
        return jobs.submit(jobType, payload, { workspaceId: workspace.id, moduleId })
      }
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
      async save(id, content, options) { documents.save(id, String(content), options) },
      async update(id, patch) { return documents.update(id, patch) },
      async updateMetadata(id, patch) { return documents.updateMetadata(id, patch) },
      async duplicate(id, options) { return documents.duplicate(id, options) },
      async delete(id, options) { return documents.delete(id, options) },
      async create(params) { return documents.create(params) },
      async move(params) { return documents.move(params) },
      async archive(id, options) { return documents.archive(id, options) },
      async listArchived(workspaceId) { return documents.listArchived(workspaceId) },
      async restore(id, options) { return documents.restore(id, options) },
      async exportSubtree(id, params) { return documents.exportSubtree(id, params) },
      async versions(id) { return documents.versions(id) },
      async restoreVersion(versionId, params) { return documents.restoreVersion(versionId, params) },
      async listAnnotationSessions(documentId) { return documents.listAnnotationSessions(documentId) },
      async createAnnotationSession(params) { return documents.createAnnotationSession(params) },
      async listAnnotations(documentId, options) { return documents.listAnnotations(documentId, options) },
      async createAnnotation(params) { return documents.createAnnotation(params) },
      async updateAnnotation(id, patch) { return documents.updateAnnotation(id, patch) },
      async resolveAnnotation(id) { return documents.resolveAnnotation(id) },
      async reopenAnnotation(id) { return documents.reopenAnnotation(id) },
      async deleteAnnotation(id) { return documents.deleteAnnotation(id) },
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
