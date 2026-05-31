import { derived, get, writable } from 'svelte/store'
import type { AiChatMessage, AiChatMessageRole, AiConversation } from '@shared/ai'
import { workspaceId } from '../../store'

export interface AiConversationView extends AiConversation {
  date: string
}

const welcomeText = 'Hello! I\'m your AI writing assistant. How can I help with your manuscript today?'

export const aiConversations = writable<AiConversationView[]>([])
export const selectedAiConversationId = writable('')

export const selectedAiConversation = derived(
  [aiConversations, selectedAiConversationId],
  ([$conversations, $id]) => $conversations.find(chat => chat.id === $id) ?? $conversations[0] ?? null
)

let initializedWorkspaceId: string | null = null
let loadPromise: Promise<void> | null = null

function relativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const today = now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (date.toDateString() === today) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function toView(conversation: AiConversation): AiConversationView {
  return {
    ...conversation,
    date: relativeDate(conversation.updatedAt)
  }
}

function sortConversations(conversations: AiConversationView[]): AiConversationView[] {
  return [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

async function createWelcomeConversation(wsId: string): Promise<AiConversationView> {
  const conversation = await window.shell.ai.createConversation({ workspaceId: wsId })
  const message = await window.shell.ai.appendMessage({
    workspaceId: wsId,
    conversationId: conversation.id,
    role: 'assistant',
    content: welcomeText
  })

  return toView({
    ...conversation,
    updatedAt: message.createdAt,
    messages: [message]
  })
}

export async function loadAiConversations(force = false): Promise<void> {
  const wsId = get(workspaceId)
  if (!force && initializedWorkspaceId === wsId && get(aiConversations).length > 0) return
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    let conversations = (await window.shell.ai.conversations(wsId)).map(toView)
    if (conversations.length === 0) {
      conversations = [await createWelcomeConversation(wsId)]
    }

    conversations = sortConversations(conversations)
    aiConversations.set(conversations)
    selectedAiConversationId.set(conversations[0]?.id ?? '')
    initializedWorkspaceId = wsId
  })()

  try {
    await loadPromise
  } finally {
    loadPromise = null
  }
}

export function selectAiConversation(id: string): void {
  selectedAiConversationId.set(id)
}

export async function createAiConversation(): Promise<string> {
  const wsId = get(workspaceId)
  const conversation = await createWelcomeConversation(wsId)
  aiConversations.update(conversations => [conversation, ...conversations])
  selectedAiConversationId.set(conversation.id)
  initializedWorkspaceId = wsId
  return conversation.id
}

export async function appendAiChatMessage(
  conversationId: string,
  message: { role: AiChatMessageRole; content: string; runId?: string | null }
): Promise<AiChatMessage> {
  const wsId = get(workspaceId)
  const saved = await window.shell.ai.appendMessage({
    workspaceId: wsId,
    conversationId,
    role: message.role,
    content: message.content,
    runId: message.runId ?? null
  })

  aiConversations.update(conversations => sortConversations(conversations.map(chat => {
    if (chat.id !== conversationId) return chat
    const title = chat.title === 'New conversation' && message.role === 'user'
      ? message.content.trim().replace(/\s+/g, ' ').slice(0, 48) || chat.title
      : chat.title

    return {
      ...chat,
      title,
      updatedAt: saved.createdAt,
      date: relativeDate(saved.createdAt),
      messages: [...chat.messages, saved]
    }
  })))

  return saved
}

export function activeConversationId(): string {
  return get(selectedAiConversationId)
}
