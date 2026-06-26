<!-- AI Chat MainView — chat interface with mock responses -->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import MarkdownContent from '../../shell/MarkdownContent.svelte'
  import { executeCommand } from '../../store/commands'
  import { clearShellContextDescriptor, setShellContextDescriptor } from '../../store/shell-context'
  import { aiBusy, aiContextCandidates, aiRunSettingsForSurface, invokeAi, refreshAiContext } from '../../store/ai'
  import { addToast } from '../../store/toasts'
  import {
    activeConversationId,
    appendAiChatMessage,
    createAiConversation,
    loadAiConversations,
    selectedAiConversation,
    type AiConversationView
  } from './state'

  let input = $state('')
  let inputElement = $state<HTMLTextAreaElement | null>(null)
  const runSettings = aiRunSettingsForSurface('shell.aichat')
  let chat = $derived($selectedAiConversation)
  let hasMessages = $derived(!!chat?.messages.length)
  let includedContextCount = $derived($aiContextCandidates.filter(candidate => candidate.included).length)
  let includedContextTokens = $derived($aiContextCandidates.filter(candidate => candidate.included).reduce((sum, candidate) => sum + candidate.estimatedTokens, 0))
  let contextButtonLabel = $derived(includedContextCount > 0 ? `Context ${includedContextCount} · ~${includedContextTokens}` : 'Manage context')
  let captureMessageListener: ((event: Event) => void) | null = null
  let conversationUnsubscribe: (() => void) | null = null
  const promptSuggestions = [
    'Analyze pacing',
    'Find continuity issues',
    'Suggest a stronger opening',
    'Summarize this chapter',
    'Question the character motivation'
  ]

  function refreshShellContext(conversation: AiConversationView | null): void {
    if (conversation) {
      setShellContextDescriptor({
        moduleId: 'shell.aichat',
        primaryLabel: conversation.title,
        trail: [
          { id: 'ai-conversations', label: 'Conversations' },
          { id: conversation.id, label: conversation.title }
        ]
      })
      return
    }

    setShellContextDescriptor({
      moduleId: 'shell.aichat',
      primaryLabel: 'No conversation selected'
    })
  }

  onMount(() => {
    void loadAiConversations()
    void refreshAiContext()
    conversationUnsubscribe = selectedAiConversation.subscribe((conversation) => refreshShellContext(conversation))
    captureMessageListener = (event: Event) => {
      const content = (event as CustomEvent<string>).detail
      if (content) {
        void (async () => {
          const conversationId = activeConversationId() || await createAiConversation()
          await appendAiChatMessage(conversationId, { role: 'assistant', content })
        })()
      }
    }
    window.addEventListener('shell:capture-ai-message', captureMessageListener)
  })

  onDestroy(() => {
    conversationUnsubscribe?.()
    clearShellContextDescriptor('shell.aichat')
    if (captureMessageListener) {
      window.removeEventListener('shell:capture-ai-message', captureMessageListener)
    }
  })

  async function send() {
    const text = input.trim()
    if (!text) return
    try {
      const conversationId = activeConversationId() || await createAiConversation()
      await appendAiChatMessage(conversationId, { role: 'user', content: text })
      input = ''

      const result = await invokeAi({
        moduleId: 'shell.aichat',
        originType: 'chat',
        originId: conversationId,
        prompt: text,
        providerId: $runSettings.providerId,
        model: $runSettings.model,
        temperature: $runSettings.temperature
      })

      await appendAiChatMessage(conversationId, {
        role: 'assistant',
        content: result.run.error ?? result.run.outputText,
        runId: result.run.id
      })
    } catch (error) {
      input = text
      addToast('warn', error instanceof Error ? error.message : 'AI chat message could not be sent.')
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function useSuggestion(prompt: string): void {
    input = prompt
    inputElement?.focus()
  }

  async function openContextInspector(): Promise<void> {
    const layout = await window.shell.layout.get()
    if (!layout.inspectorVisible) {
      await executeCommand('shell.layout.toggleInspector')
    }
  }

  function inputHost(node: HTMLTextAreaElement): void {
    inputElement = node
  }
</script>

<div class="main-view">
  <div class="messages">
    {#if hasMessages && chat}
      {#each chat.messages as msg, index (`${chat.id}-${msg.role}-${index}-${msg.content.slice(0, 24)}`)}
        <div class="message" class:user={msg.role === 'user'} class:assistant={msg.role === 'assistant'}>
          <span class="msg-avatar" class:user-avatar={msg.role === 'user'} aria-hidden="true">{msg.role === 'user' ? 'You' : 'AI'}</span>
          <div class="msg-content">
            {#if msg.role === 'assistant'}
              <MarkdownContent content={msg.content} />
            {:else}
              {msg.content}
            {/if}
          </div>
        </div>
      {/each}
    {:else}
      <section class="empty-state" aria-label="AI Chat starter prompts">
        <div class="empty-avatar" aria-hidden="true">AI</div>
        <h2>Ask about the current manuscript.</h2>
        <p>Use the chat for pacing, continuity, openings, summaries, motivation, and revision choices.</p>
        <div class="suggestions" aria-label="Suggested prompts">
          {#each promptSuggestions as suggestion (suggestion)}
            <button type="button" class="suggestion" onclick={() => useSuggestion(suggestion)}>
              {suggestion}
            </button>
          {/each}
        </div>
      </section>
    {/if}
  </div>
  <div class="input-area">
    <div class="input-shell">
      <div class="input-tools">
        <div class="context-wrap">
          <button
            type="button"
            class="context-btn"
            aria-label={contextButtonLabel}
            title="Manage AI context in the inspector"
            onclick={openContextInspector}
          >
            {contextButtonLabel}
          </button>
        </div>
        <button type="button" class="attach-btn" disabled title="File attachments are not available yet" aria-label="File attachments not available yet">
          Attach
        </button>
      </div>
      <textarea
        bind:value={input}
        class="chat-input"
        placeholder="Ask about pacing, continuity, characters, or revision choices"
        rows="1"
        {@attach inputHost}
        onkeydown={onKeydown}
      ></textarea>
    </div>
    <button class="send-btn" class:ready={!!input.trim()} onclick={send} disabled={!input.trim() || $aiBusy} aria-label="Send message">
      {$aiBusy ? '...' : '↑'}
    </button>
  </div>
</div>

<style>
  .main-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .messages { flex: 1; overflow-y: auto; padding: var(--space-4) var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); }
  .empty-state {
    max-width: 680px;
    margin: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
    color: var(--color-fg-secondary);
  }
  .empty-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--accent-inspector) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 32%, var(--color-border));
    color: var(--color-fg-primary);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0;
  }
  .empty-state h2 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: var(--font-size-xl);
    font-weight: 650;
  }
  .empty-state p {
    max-width: 58ch;
    margin: 0;
    font-size: var(--font-size-sm);
    line-height: 1.6;
  }
  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-1);
  }
  .suggestion {
    min-height: 30px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-md);
    background: var(--color-bg-overlay);
    border: 1px solid color-mix(in srgb, var(--color-border-strong) 70%, transparent);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }
  .suggestion:hover {
    background: var(--color-hover);
    color: var(--color-fg-primary);
  }
  .message { display: flex; gap: var(--space-3); max-width: 72ch; }
  .message.user { align-self: flex-end; flex-direction: row-reverse; }
  .msg-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 999px;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--accent-inspector) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-inspector) 26%, var(--color-border));
    color: color-mix(in srgb, var(--accent-inspector) 55%, var(--color-fg-primary));
    font-size: 9px;
    font-weight: 800;
    text-align: center;
  }
  .user-avatar {
    background: color-mix(in srgb, var(--accent-editor) 18%, transparent);
    border-color: color-mix(in srgb, var(--accent-editor) 26%, var(--color-border));
    color: color-mix(in srgb, var(--accent-editor) 52%, var(--color-fg-primary));
  }
  .msg-content {
    padding: var(--space-3) var(--space-4); border-radius: var(--radius-md);
    font-size: var(--font-size-sm); line-height: 1.6; white-space: pre-wrap;
  }
  .assistant .msg-content { white-space: normal; }
  .assistant .msg-content { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .user .msg-content { background: var(--color-accent-dim); color: var(--color-fg-primary); }
  .input-area { display: flex; align-items: flex-end; gap: var(--space-2); padding: var(--space-3) var(--space-6); border-top: var(--border-subtle); }
  .input-shell {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-bg-overlay);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
  }
  .input-tools {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .context-wrap {
    position: relative;
  }
  .context-btn,
  .attach-btn {
    min-height: 24px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid color-mix(in srgb, var(--color-border-strong) 62%, transparent);
    color: var(--color-fg-secondary);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }
  .context-btn:hover:not(:disabled),
  .attach-btn:hover:not(:disabled) {
    background: var(--color-hover);
    color: var(--color-fg-primary);
  }
  .context-btn:disabled,
  .attach-btn:disabled {
    color: var(--color-fg-muted);
    opacity: 0.75;
    cursor: not-allowed;
  }
  .chat-input {
    width: 100%; padding: 0; background: transparent; border: none;
    color: var(--color-fg-primary); font-family: var(--font-sans);
    font-size: var(--font-size-sm); resize: none; outline: none; min-height: 36px; max-height: 120px;
  }
  .chat-input::placeholder { color: var(--color-fg-secondary); }
  .send-btn {
    width: 36px; height: 36px; border-radius: 50%; background: transparent; color: var(--color-fg-secondary);
    border: 1px solid color-mix(in srgb, var(--color-border-strong) 70%, transparent);
    font-size: 16px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .send-btn.ready {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-bg-base);
  }
  .send-btn:hover { opacity: 0.9; }
  .send-btn:disabled { opacity: 0.58; cursor: default; }
</style>
