import { readable } from 'svelte/store'
import {
  WorkflowStateSlice,
  type WorkflowProfile,
  type WorkflowState
} from '@shared/state/workflow-state'
import { workspaceId } from '../../store'
import { getModuleState } from '../module-state-registry'
import { connectSettingsBackedPersistence } from '../settings-backed-persistence'

export type { WorkflowProfile }

const workflowState = getModuleState<WorkflowStateSlice>('shell.workflow', 'workflow')

function fromWorkflowState<T>(selector: (state: WorkflowState) => T) {
  return readable(selector(workflowState.getSnapshot()), (set) =>
    workflowState.subscribe((state) => set(selector(state)))
  )
}

function writableWorkflowField<T>(
  selector: (state: WorkflowState) => T,
  setValue: (value: T) => void
) {
  return {
    subscribe: fromWorkflowState(selector).subscribe,
    set: setValue
  }
}

export const workflowProfiles = fromWorkflowState(state => state.profiles)
export const selectedWorkflowProfileId = fromWorkflowState(state => state.selectedProfileId)
export const selectedWorkflowProfile = fromWorkflowState(state => state.selectedProfile)
export const workflowIncludeActiveDocument = writableWorkflowField(
  state => state.includeActiveDocument,
  value => workflowState.setIncludeActiveDocument(value)
)
export const workflowIncludeDescendants = writableWorkflowField(
  state => state.includeDescendants,
  value => workflowState.setIncludeDescendants(value)
)
export const workflowCreateProposal = writableWorkflowField(
  state => state.createProposal,
  value => workflowState.setCreateProposal(value)
)

export function selectWorkflowProfile(id: string): void {
  workflowState.selectProfile(id)
}

export function renameWorkflowProfile(id: string, name: string): void {
  workflowState.renameProfile(id, name)
}

function persistenceKey(wsId: string): string {
  return `modules.workflow.${wsId}.state`
}

connectSettingsBackedPersistence({
  label: 'shell.workflow',
  workspaceId,
  slice: workflowState,
  settingsKey: persistenceKey
})
