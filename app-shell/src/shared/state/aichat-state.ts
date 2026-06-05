import type { AiChatMessage, AiChatMessageRole, AiConversation } from '../ai'
import { ObservableSlice } from './observable'

export interface AiConversationView extends AiConversation {
  date: string
}

export interface AiChatPort {
  conversations(workspaceId: string): Promise<AiConversation[]>
  createConversation(params: { workspaceId: string; title?: string }): Promise<AiConversation>
  appendMessage(params: {
    workspaceId: string
    conversationId: string
    role: AiChatMessageRole
    content: string
    runId?: string | null
  }): Promise<AiChatMessage>
}

export interface AiChatState {
  conversations: AiConversationView[]
  selectedConversationId: string
  selectedConversation: AiConversationView | null
}

export class AiChatStateSlice extends ObservableSlice<AiChatState> {
  private conversations: AiConversationView[] = []
  private selectedConversationId = ''
  private initializedWorkspaceId: string | null = null
  private loadPromise: Promise<void> | null = null

  constructor(private readonly port: AiChatPort) {
    super()
  }

  getSnapshot(): AiChatState {
    return {
      conversations: this.conversations,
      selectedConversationId: this.selectedConversationId,
      selectedConversation: this.selectedConversation()
    }
  }

  async load(workspaceId: string, force = false): Promise<void> {
    if (!force && this.initializedWorkspaceId === workspaceId && this.conversations.length > 0) return
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = (async () => {
      let conversations = (await this.port.conversations(workspaceId)).map(conversation => this.toView(conversation))
      if (conversations.length === 0) {
        conversations = [await this.createEmptyConversation(workspaceId)]
      }

      this.conversations = this.sortConversations(conversations)
      this.selectedConversationId = this.conversations[0]?.id ?? ''
      this.initializedWorkspaceId = workspaceId
      this.emit()
    })()

    try {
      await this.loadPromise
    } finally {
      this.loadPromise = null
    }
  }

  selectConversation(id: string): void {
    if (!this.conversations.some(conversation => conversation.id === id)) return
    this.selectedConversationId = id
    this.emit()
  }

  async createConversation(workspaceId: string): Promise<string> {
    const conversation = await this.createEmptyConversation(workspaceId)
    this.conversations = [conversation, ...this.conversations]
    this.selectedConversationId = conversation.id
    this.initializedWorkspaceId = workspaceId
    this.emit()
    return conversation.id
  }

  async appendMessage(
    workspaceId: string,
    conversationId: string,
    message: { role: AiChatMessageRole; content: string; runId?: string | null }
  ): Promise<AiChatMessage> {
    const saved = await this.port.appendMessage({
      workspaceId,
      conversationId,
      role: message.role,
      content: message.content,
      runId: message.runId ?? null
    })

    this.conversations = this.sortConversations(this.conversations.map(chat => {
      if (chat.id !== conversationId) return chat
      const title = chat.title === 'New conversation' && message.role === 'user'
        ? this.titleFromMessage(message.content) || chat.title
        : chat.title

      return {
        ...chat,
        title,
        updatedAt: saved.createdAt,
        date: this.relativeDate(saved.createdAt),
        messages: [...chat.messages, saved]
      }
    }))
    this.emit()
    return saved
  }

  activeConversationId(): string {
    return this.selectedConversationId
  }

  private async createEmptyConversation(workspaceId: string): Promise<AiConversationView> {
    const conversation = await this.port.createConversation({ workspaceId })
    return this.toView(conversation)
  }

  private selectedConversation(): AiConversationView | null {
    return this.conversations.find(chat => chat.id === this.selectedConversationId) ?? this.conversations[0] ?? null
  }

  private toView(conversation: AiConversation): AiConversationView {
    return {
      ...conversation,
      date: this.relativeDate(conversation.updatedAt)
    }
  }

  private sortConversations(conversations: AiConversationView[]): AiConversationView[] {
    return [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  private titleFromMessage(content: string): string {
    return content.trim().replace(/\s+/g, ' ').slice(0, 48)
  }

  private relativeDate(iso: string): string {
    const date = new Date(iso)
    const now = new Date()
    const today = now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)

    if (date.toDateString() === today) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
}
