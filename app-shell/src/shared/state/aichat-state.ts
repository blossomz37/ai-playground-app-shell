import type { AiChatMessage, AiChatMessageRole, AiConversation } from '../ai'
import { ObservableSlice } from './observable'

export interface AiConversationView extends AiConversation {
  date: string
}

export interface AiChatPort {
  conversations(workspaceId: string): Promise<AiConversation[]>
  archivedConversations(workspaceId: string): Promise<AiConversation[]>
  createConversation(params: { workspaceId: string; title?: string }): Promise<AiConversation>
  renameConversation(params: { workspaceId: string; id: string; title: string }): Promise<AiConversation>
  archiveConversation(params: { workspaceId: string; id: string }): Promise<AiConversation>
  restoreConversation(params: { workspaceId: string; id: string }): Promise<AiConversation>
  deleteConversation(params: { workspaceId: string; id: string }): Promise<{ id: string }>
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
  archivedConversations: AiConversationView[]
  selectedConversationId: string
  selectedConversation: AiConversationView | null
}

export class AiChatStateSlice extends ObservableSlice<AiChatState> {
  private conversations: AiConversationView[] = []
  private archivedConversations: AiConversationView[] = []
  private selectedConversationId = ''
  private initializedWorkspaceId: string | null = null
  private loadPromise: Promise<void> | null = null

  constructor(private readonly port: AiChatPort) {
    super()
  }

  getSnapshot(): AiChatState {
    return {
      conversations: this.conversations,
      archivedConversations: this.archivedConversations,
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
      this.archivedConversations = this.sortConversations(
        (await this.port.archivedConversations(workspaceId)).map(conversation => this.toView(conversation))
      )
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

  async renameConversation(workspaceId: string, id: string, title: string): Promise<void> {
    const nextTitle = title.trim()
    if (!nextTitle) return
    const updated = await this.port.renameConversation({ workspaceId, id, title: nextTitle })
    this.conversations = this.sortConversations(this.conversations.map(chat =>
      chat.id === id ? this.toView({ ...updated, messages: chat.messages }) : chat
    ))
    if (this.conversations.some(chat => chat.id === id)) {
      this.selectedConversationId = id
    }
    this.emit()
  }

  async archiveConversation(workspaceId: string, id: string): Promise<void> {
    const archived = this.toView(await this.port.archiveConversation({ workspaceId, id }))
    this.conversations = this.conversations.filter(chat => chat.id !== id)
    this.archivedConversations = this.sortConversations([
      archived,
      ...this.archivedConversations.filter(chat => chat.id !== id)
    ])
    if (this.selectedConversationId === id) {
      if (this.conversations.length === 0) {
        await this.createConversation(workspaceId)
        return
      }
      this.selectedConversationId = this.conversations[0]?.id ?? ''
    }
    this.emit()
  }

  async restoreConversation(workspaceId: string, id: string): Promise<void> {
    const restored = this.toView(await this.port.restoreConversation({ workspaceId, id }))
    this.archivedConversations = this.archivedConversations.filter(chat => chat.id !== id)
    this.conversations = this.sortConversations([
      restored,
      ...this.conversations.filter(chat => chat.id !== id)
    ])
    this.selectedConversationId = restored.id
    this.emit()
  }

  async deleteConversation(workspaceId: string, id: string): Promise<void> {
    await this.port.deleteConversation({ workspaceId, id })
    this.archivedConversations = this.archivedConversations.filter(chat => chat.id !== id)
    this.conversations = this.conversations.filter(chat => chat.id !== id)
    if (this.selectedConversationId === id) {
      if (this.conversations.length === 0) {
        await this.createConversation(workspaceId)
        return
      }
      this.selectedConversationId = this.conversations[0]?.id ?? ''
    }
    this.emit()
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
