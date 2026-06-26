import { writable } from 'svelte/store'
import type { AiPreview } from '@shared/ai'
import type { DocumentsAiPromptAction } from '@shared/ai-writing-prompts'
import type { DocumentsWritingContext } from './documentWritingContext'

export const documentsAiUserInput = writable('')
export const documentsAiWritingContext = writable<DocumentsWritingContext | null>(null)
export const documentsAiPreview = writable<AiPreview | null>(null)
export const documentsAiPreviewLabel = writable('')
export const documentsAiPreviewAction = writable<DocumentsAiPromptAction | null>(null)
export const documentsAiPreviewBusy = writable(false)
export const documentsAiProposalBusy = writable(false)
export const documentsAiCancelAvailable = writable(false)

export function clearDocumentsAiPreview(): void {
  documentsAiPreview.set(null)
  documentsAiPreviewAction.set(null)
  documentsAiPreviewLabel.set('')
}
