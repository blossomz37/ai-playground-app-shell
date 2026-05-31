import { readable } from 'svelte/store'
import {
  WorkflowStateSlice,
  type WorkflowPersistenceSnapshot,
  type WorkflowProfile,
  type WorkflowState
} from '@shared/state/workflow-state'
import { workspaceId } from '../../store'

export type { WorkflowProfile }

const workflowState = new WorkflowStateSlice()
let activeWorkspaceId = ''
let persistenceReady = false

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

function persistenceKey(wsId: string): string {
  return `modules.workflow.${wsId}.state`
}

async function loadWorkflowPersistence(wsId: string): Promise<void> {
  activeWorkspaceId = wsId
  persistenceReady = false
  const snapshot = await window.shell.settings.get(persistenceKey(wsId)) as WorkflowPersistenceSnapshot | undefined
  if (activeWorkspaceId !== wsId) return
  persistenceReady = true
  workflowState.hydrate(snapshot)
}

workspaceId.subscribe((wsId) => {
  void loadWorkflowPersistence(wsId)
})

workflowState.subscribe(() => {
  if (!persistenceReady || !activeWorkspaceId) return
  void window.shell.settings.set(persistenceKey(activeWorkspaceId), workflowState.persistenceSnapshot())
})
