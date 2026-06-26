import { derived, writable } from 'svelte/store'
import type { JobSnapshot } from '@shared/module-contract'
import { addToast } from './toasts'

export const jobs = writable<JobSnapshot[]>([])
export const jobsPanelOpen = writable(false)

let listenerInstalled = false
let currentWorkspaceId: string | undefined

export const activeJobs = derived(jobs, ($jobs) =>
  $jobs.filter(job => job.status === 'queued' || job.status === 'running')
)

export const recentJobs = derived(jobs, ($jobs) =>
  $jobs.filter(job => job.status !== 'queued' && job.status !== 'running')
)

export async function loadJobs(workspaceId?: string): Promise<void> {
  currentWorkspaceId = workspaceId
  const rows = await window.shell.jobs.list({ workspaceId, limit: 50 })
  jobs.set(rows)

  if (!listenerInstalled) {
    window.shell.jobs.onChanged((job) => {
      if (currentWorkspaceId && job.workspaceId !== currentWorkspaceId) return
      jobs.update(current => {
        const without = current.filter(item => item.id !== job.id)
        return [job, ...without].slice(0, 50)
      })
      if (job.status === 'completed') addToast('info', `${job.title} completed`)
      if (job.status === 'failed') addToast('warn', `${job.title} needs attention`)
      if (job.status === 'cancelled') addToast('warn', `${job.title} cancelled`)
    })
    listenerInstalled = true
  }
}

export function toggleJobsPanel(): void {
  jobsPanelOpen.update(open => !open)
}

export async function submitJob(type: string, payload?: unknown): Promise<JobSnapshot | null> {
  const job = await window.shell.jobs.submit(type, payload)
  if (job) {
    jobs.update(current => [job, ...current.filter(item => item.id !== job.id)].slice(0, 50))
  }
  jobsPanelOpen.set(true)
  return job
}

export async function cancelJob(id: string): Promise<void> {
  const job = await window.shell.jobs.cancel(id)
  if (job) {
    jobs.update(current => [job, ...current.filter(item => item.id !== job.id)].slice(0, 50))
  }
}
