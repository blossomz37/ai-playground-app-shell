import { derived, get, writable } from 'svelte/store'

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiConversation {
  id: string
  title: string
  date: string
  messages: AiChatMessage[]
}

const welcomeMessage: AiChatMessage = {
  role: 'assistant',
  content: 'Hello! I\'m your AI writing assistant. How can I help with your manuscript today?'
}

export const aiConversations = writable<AiConversation[]>([
  {
    id: '1',
    title: 'Character development',
    date: 'Today',
    messages: [
      welcomeMessage,
      { role: 'user', content: 'Help me sharpen the protagonist\'s internal conflict.' },
      { role: 'assistant', content: 'Start by naming the visible want, then pressure it with the private fear the character refuses to admit.' }
    ]
  },
  {
    id: '2',
    title: 'Plot structure review',
    date: 'Yesterday',
    messages: [
      welcomeMessage,
      { role: 'user', content: 'What should I check before revising the midpoint?' },
      { role: 'assistant', content: 'Confirm the midpoint changes the cost of the goal, not just the amount of information the character has.' }
    ]
  },
  {
    id: '3',
    title: 'World-building notes',
    date: 'May 27',
    messages: [
      welcomeMessage,
      { role: 'user', content: 'How do I keep world-building from slowing the scene?' },
      { role: 'assistant', content: 'Tie each detail to a choice, obstacle, or social pressure inside the scene.' }
    ]
  }
])

export const selectedAiConversationId = writable('1')

export const selectedAiConversation = derived(
  [aiConversations, selectedAiConversationId],
  ([$conversations, $id]) => $conversations.find(chat => chat.id === $id) ?? $conversations[0] ?? null
)

export function selectAiConversation(id: string): void {
  selectedAiConversationId.set(id)
}

export function createAiConversation(): string {
  const id = `session-${Date.now()}`
  const conversation: AiConversation = {
    id,
    title: 'New conversation',
    date: 'Now',
    messages: [welcomeMessage]
  }
  aiConversations.update(conversations => [conversation, ...conversations])
  selectedAiConversationId.set(id)
  return id
}

export function appendAiChatMessage(conversationId: string, message: AiChatMessage): void {
  aiConversations.update(conversations => conversations.map(chat => {
    if (chat.id !== conversationId) return chat
    const title = chat.title === 'New conversation' && message.role === 'user'
      ? message.content.slice(0, 32)
      : chat.title
    return { ...chat, title, messages: [...chat.messages, message] }
  }))
}

export function activeConversationId(): string {
  return get(selectedAiConversationId)
}
