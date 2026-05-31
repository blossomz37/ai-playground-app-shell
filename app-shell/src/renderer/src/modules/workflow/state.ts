import { derived, writable } from 'svelte/store'

export interface WorkflowProfile {
  id: string
  name: string
  format: string
  status: 'ready' | 'draft'
  prompt: string
}

export const workflowProfiles = writable<WorkflowProfile[]>([
  {
    id: 'manuscript-context-pass',
    name: 'Manuscript Context Pass',
    format: 'AI',
    status: 'ready',
    prompt: 'Run a first-pass manuscript workflow over the included context. Return notable signals, missing context, and the next useful prompt step.'
  },
  {
    id: 'scene-diagnosis',
    name: 'Scene Diagnosis',
    format: 'AI',
    status: 'ready',
    prompt: 'Diagnose the selected scene for goal, pressure, turn, and unresolved next action.'
  },
  {
    id: 'revision-chain',
    name: 'Revision Chain',
    format: 'AI',
    status: 'draft',
    prompt: 'Draft a revision chain for the selected material. Keep recommendations concrete and ordered.'
  }
])

export const selectedWorkflowProfileId = writable('manuscript-context-pass')
export const workflowIncludeActiveDocument = writable(true)
export const workflowIncludeDescendants = writable(true)
export const workflowCreateProposal = writable(false)

export const selectedWorkflowProfile = derived(
  [workflowProfiles, selectedWorkflowProfileId],
  ([$profiles, $id]) => $profiles.find(profile => profile.id === $id) ?? $profiles[0]
)

export function selectWorkflowProfile(id: string): void {
  selectedWorkflowProfileId.set(id)
}
