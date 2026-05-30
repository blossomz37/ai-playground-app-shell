import { randomUUID } from 'crypto'
import type { Disposable, JobHandle, JobRunner, JobSnapshot, JobStatus } from '@shared/module-contract'
import { events } from './events'
import { getDb } from './db'

const runners = new Map<string, JobRunner>()
const cancelled = new Set<string>()

function humanizeJobType(type: string): string {
  return type
    .split(/[.:_-]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function rowToJob(row: Record<string, unknown>): JobSnapshot {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    moduleId: String(row.moduleId),
    type: String(row.type),
    title: String(row.title),
    status: String(row.status) as JobStatus,
    progress: Number(row.progress),
    message: String(row.message ?? ''),
    error: row.error ? String(row.error) : null,
    createdAt: String(row.createdAt),
    startedAt: row.startedAt ? String(row.startedAt) : null,
    completedAt: row.completedAt ? String(row.completedAt) : null,
    updatedAt: String(row.updatedAt)
  }
}

function getJob(id: string): JobSnapshot | null {
  const row = getDb().prepare('SELECT * FROM job_runs WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToJob(row) : null
}

function emitJob(id: string): JobSnapshot | null {
  const job = getJob(id)
  if (job) events.emit('jobs:changed', job)
  return job
}

function updateJob(id: string, status: JobStatus, fields: Partial<Pick<JobSnapshot, 'progress' | 'message' | 'error'>> = {}): JobSnapshot | null {
  const now = new Date().toISOString()
  const completedAt = status === 'completed' || status === 'failed' || status === 'cancelled' ? now : null
  getDb().prepare(`
    UPDATE job_runs
    SET status = ?,
        progress = COALESCE(?, progress),
        message = COALESCE(?, message),
        error = ?,
        completedAt = COALESCE(?, completedAt),
        updatedAt = ?
    WHERE id = ?
  `).run(
    status,
    fields.progress ?? null,
    fields.message ?? null,
    fields.error ?? null,
    completedAt,
    now,
    id
  )
  return emitJob(id)
}

export const jobs = {
  defineRunner(jobType: string, run: JobRunner): Disposable {
    runners.set(jobType, run)
    return { dispose() { runners.delete(jobType) } }
  },

  list(params: { workspaceId?: string; limit?: number } = {}): JobSnapshot[] {
    const limit = Math.max(1, Math.min(params.limit ?? 50, 200))
    const rows = params.workspaceId
      ? getDb()
        .prepare('SELECT * FROM job_runs WHERE workspaceId = ? ORDER BY datetime(createdAt) DESC LIMIT ?')
        .all(params.workspaceId, limit)
      : getDb()
        .prepare('SELECT * FROM job_runs ORDER BY datetime(createdAt) DESC LIMIT ?')
        .all(limit)
    return (rows as Array<Record<string, unknown>>).map(rowToJob)
  },

  submit(jobType: string, payload: unknown, options: { workspaceId: string; moduleId?: string; title?: string }): JobHandle {
    const id = randomUUID()
    const now = new Date().toISOString()
    const title = options.title ?? humanizeJobType(jobType)

    getDb().prepare(`
      INSERT INTO job_runs
        (id, workspaceId, moduleId, type, title, status, progress, message, payloadJson, createdAt, startedAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 'queued', 0, 'Queued', ?, ?, NULL, ?)
    `).run(
      id,
      options.workspaceId,
      options.moduleId ?? 'shell',
      jobType,
      title,
      JSON.stringify(payload ?? {}),
      now,
      now
    )
    emitJob(id)

    const handle: JobHandle = {
      id,
      get cancelled() { return cancelled.has(id) },
      cancel() { jobs.cancel(id) },
      progress(pct: number, message?: string) {
        if (cancelled.has(id)) return
        const progress = Math.max(0, Math.min(100, Math.round(pct)))
        updateJob(id, 'running', { progress, message })
      }
    }

    const runner = runners.get(jobType)
    if (!runner) {
      updateJob(id, 'failed', { error: `No runner registered for ${jobType}`, message: 'No runner registered' })
      return handle
    }

    queueMicrotask(async () => {
      const startedAt = new Date().toISOString()
      getDb()
        .prepare("UPDATE job_runs SET status = 'running', message = 'Starting', startedAt = ?, updatedAt = ? WHERE id = ?")
        .run(startedAt, startedAt, id)
      emitJob(id)

      try {
        await runner(payload, handle)
        if (cancelled.has(id)) {
          updateJob(id, 'cancelled', { message: 'Cancelled' })
        } else {
          updateJob(id, 'completed', { progress: 100, message: 'Completed' })
        }
      } catch (err) {
        if (cancelled.has(id)) {
          updateJob(id, 'cancelled', { message: 'Cancelled' })
        } else {
          updateJob(id, 'failed', {
            error: err instanceof Error ? err.message : String(err),
            message: 'Failed'
          })
        }
      } finally {
        cancelled.delete(id)
      }
    })

    return handle
  },

  cancel(id: string): JobSnapshot | null {
    const job = getJob(id)
    if (!job || job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return job
    }
    cancelled.add(id)
    return updateJob(id, 'cancelled', { message: 'Cancelled' })
  }
}
