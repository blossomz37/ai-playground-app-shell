import { randomUUID } from 'crypto'
import type { JobHandle, JobRunner, Disposable } from '@shared/module-contract'
import { events } from './events'

const runners = new Map<string, JobRunner>()

export const jobs = {
  defineRunner(jobType: string, run: JobRunner): Disposable {
    runners.set(jobType, run)
    return { dispose() { runners.delete(jobType) } }
  },

  submit(jobType: string, payload: unknown): JobHandle {
    const id = randomUUID()

    const handle: JobHandle = {
      id,
      cancel() { events.emit('jobs:cancelled', { id }) },
      progress(pct: number, message?: string) { events.emit('jobs:progress', { id, pct, message }) }
    }

    const runner = runners.get(jobType)
    if (runner) {
      runner(payload, handle).catch((err: Error) => {
        events.emit('jobs:error', { id, error: err.message })
      })
    }

    return handle
  }
}
