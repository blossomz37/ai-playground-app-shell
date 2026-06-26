import { readable } from 'svelte/store'
import type { AiChatMessage, AiChatMessageRole } from '@shared/ai'
import { AiChatStateSlice, type AiChatState, type AiConversationView } from '@shared/state/aichat-state'
import { resolveWorkspaceId } from '../../store'
import { getModuleState } from '../module-state-registry'

export type { AiConversationView }

const aiChatState = getModuleState<AiChatStateSlice>('shell.aichat', 'aichat')

function fromAiChatState<T>(selector: (state: AiChatState) => T) {
  return readable(selector(aiChatState.getSnapshot()), (set) =>
    aiChatState.subscribe((state) => set(selector(state)))
  )
}

export const aiConversations = fromAiChatState(state => state.conversations)
export const archivedAiConversations = fromAiChatState(state => state.archivedConversations)
export const selectedAiConversationId = fromAiChatState(state => state.selectedConversationId)
export const selectedAiConversation = fromAiChatState(state => state.selectedConversation)

export async function loadAiConversations(force = false): Promise<void> {
  await aiChatState.load(await resolveWorkspaceId(), force)
}

export function selectAiConversation(id: string): void {
  aiChatState.selectConversation(id)
}

export async function renameAiConversation(id: string, title: string): Promise<void> {
  await aiChatState.renameConversation(await resolveWorkspaceId(), id, title)
}

export async function archiveAiConversation(id: string): Promise<void> {
  await aiChatState.archiveConversation(await resolveWorkspaceId(), id)
}

export async function restoreAiConversation(id: string): Promise<void> {
  await aiChatState.restoreConversation(await resolveWorkspaceId(), id)
}

export async function deleteAiConversation(id: string): Promise<void> {
  await aiChatState.deleteConversation(await resolveWorkspaceId(), id)
}

export async function createAiConversation(): Promise<string> {
  return aiChatState.createConversation(await resolveWorkspaceId())
}

export async function appendAiChatMessage(
  conversationId: string,
  message: { role: AiChatMessageRole; content: string; runId?: string | null }
): Promise<AiChatMessage> {
  return aiChatState.appendMessage(await resolveWorkspaceId(), conversationId, message)
}

export function activeConversationId(): string {
  return aiChatState.activeConversationId()
}
