import { ObservableSlice } from './observable'

export interface WorkflowProfile {
  id: string
  name: string
  format: string
  status: 'ready' | 'draft'
  prompt: string
}

export interface WorkflowState {
  profiles: WorkflowProfile[]
  selectedProfileId: string
  selectedProfile: WorkflowProfile
  includeActiveDocument: boolean
  includeDescendants: boolean
  createProposal: boolean
}

export interface WorkflowPersistenceSnapshot {
  selectedProfileId: string
  includeActiveDocument: boolean
  includeDescendants: boolean
  createProposal: boolean
}

const initialProfiles: WorkflowProfile[] = [
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
]

export class WorkflowStateSlice extends ObservableSlice<WorkflowState> {
  private profiles = initialProfiles
  private selectedProfileId = 'manuscript-context-pass'
  private includeActiveDocument = true
  private includeDescendants = true
  private createProposal = false

  getSnapshot(): WorkflowState {
    return {
      profiles: this.profiles,
      selectedProfileId: this.selectedProfileId,
      selectedProfile: this.selectedProfile(),
      includeActiveDocument: this.includeActiveDocument,
      includeDescendants: this.includeDescendants,
      createProposal: this.createProposal
    }
  }

  selectProfile(id: string): void {
    if (!this.profiles.some(profile => profile.id === id)) return
    this.selectedProfileId = id
    this.emit()
  }

  setIncludeActiveDocument(value: boolean): void {
    this.includeActiveDocument = value
    this.emit()
  }

  setIncludeDescendants(value: boolean): void {
    this.includeDescendants = value
    this.emit()
  }

  setCreateProposal(value: boolean): void {
    this.createProposal = value
    this.emit()
  }

  hydrate(snapshot: WorkflowPersistenceSnapshot | undefined): void {
    if (!snapshot) {
      this.emit()
      return
    }

    this.selectedProfileId = this.profiles.some(profile => profile.id === snapshot.selectedProfileId)
      ? snapshot.selectedProfileId
      : this.profiles[0]?.id ?? this.selectedProfileId
    this.includeActiveDocument = snapshot.includeActiveDocument
    this.includeDescendants = snapshot.includeDescendants
    this.createProposal = snapshot.createProposal
    this.emit()
  }

  persistenceSnapshot(): WorkflowPersistenceSnapshot {
    return {
      selectedProfileId: this.selectedProfileId,
      includeActiveDocument: this.includeActiveDocument,
      includeDescendants: this.includeDescendants,
      createProposal: this.createProposal
    }
  }

  private selectedProfile(): WorkflowProfile {
    return this.profiles.find(profile => profile.id === this.selectedProfileId) ?? this.profiles[0]
  }
}
