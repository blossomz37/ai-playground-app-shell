import { get, readable } from 'svelte/store'
import type { AiChatMessage, AiChatMessageRole } from '@shared/ai'
import { AiChatStateSlice, type AiChatState, type AiConversationView } from '@shared/state/aichat-state'
import { workspaceId } from '../../store'

export type { AiConversationView }

const aiChatState = new AiChatStateSlice({
  conversations: (wsId) => window.shell.ai.conversations(wsId),
  createConversation: (params) => window.shell.ai.createConversation(params),
  appendMessage: (params) => window.shell.ai.appendMessage(params)
})

function fromAiChatState<T>(selector: (state: AiChatState) => T) {
  return readable(selector(aiChatState.getSnapshot()), (set) =>
    aiChatState.subscribe((state) => set(selector(state)))
  )
}

export const aiConversations = fromAiChatState(state => state.conversations)
export const selectedAiConversationId = fromAiChatState(state => state.selectedConversationId)
export const selectedAiConversation = fromAiChatState(state => state.selectedConversation)

export async function loadAiConversations(force = false): Promise<void> {
  await aiChatState.load(get(workspaceId), force)
}

export function selectAiConversation(id: string): void {
  aiChatState.selectConversation(id)
}

export async function createAiConversation(): Promise<string> {
  return aiChatState.createConversation(get(workspaceId))
}

export async function appendAiChatMessage(
  conversationId: string,
  message: { role: AiChatMessageRole; content: string; runId?: string | null }
): Promise<AiChatMessage> {
  return aiChatState.appendMessage(get(workspaceId), conversationId, message)
}

export function activeConversationId(): string {
  return aiChatState.activeConversationId()
}
