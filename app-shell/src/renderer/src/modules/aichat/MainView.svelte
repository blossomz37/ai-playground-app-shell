<!-- AI Chat MainView — chat interface with mock responses -->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import MarkdownContent from '../../shell/MarkdownContent.svelte'
  import { aiBusy, invokeAi, refreshAiContext } from '../../store/ai'
  import {
    activeConversationId,
    appendAiChatMessage,
    createAiConversation,
    loadAiConversations,
    selectedAiConversation
  } from './state'

  let input = $state('')
  let chat = $derived($selectedAiConversation)
  let captureMessageListener: ((event: Event) => void) | null = null

  onMount(() => {
    void loadAiConversations()
    void refreshAiContext()
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
    if (captureMessageListener) {
      window.removeEventListener('shell:capture-ai-message', captureMessageListener)
    }
  })

  async function send() {
    const text = input.trim()
    if (!text) return
    const conversationId = activeConversationId() || await createAiConversation()
    await appendAiChatMessage(conversationId, { role: 'user', content: text })
    input = ''

    const result = await invokeAi({
      moduleId: 'shell.aichat',
      originType: 'chat',
      originId: conversationId,
      prompt: text
    })

    await appendAiChatMessage(conversationId, {
      role: 'assistant',
      content: result.run.error ?? result.run.outputText,
      runId: result.run.id
    })
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }
</script>

<div class="main-view">
  <div class="messages">
    {#if chat}
      {#each chat.messages as msg, index (`${chat.id}-${msg.role}-${index}-${msg.content.slice(0, 24)}`)}
        <div class="message" class:user={msg.role === 'user'} class:assistant={msg.role === 'assistant'}>
          <span class="msg-avatar">{msg.role === 'user' ? '👤' : '🤖'}</span>
          <div class="msg-content">
            {#if msg.role === 'assistant'}
              <MarkdownContent content={msg.content} />
            {:else}
              {msg.content}
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
  <div class="input-area">
    <textarea
      bind:value={input}
      class="chat-input"
      placeholder="Ask about your manuscript…"
      rows="1"
      onkeydown={onKeydown}
    ></textarea>
    <button class="send-btn" onclick={send} disabled={!input.trim() || $aiBusy}>
      {$aiBusy ? '...' : '↑'}
    </button>
  </div>
</div>

<style>
  .main-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .messages { flex: 1; overflow-y: auto; padding: var(--space-4) var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); }
  .message { display: flex; gap: var(--space-3); max-width: 72ch; }
  .message.user { align-self: flex-end; flex-direction: row-reverse; }
  .msg-avatar { font-size: 16px; flex-shrink: 0; width: 24px; text-align: center; }
  .msg-content {
    padding: var(--space-3) var(--space-4); border-radius: var(--radius-md);
    font-size: var(--font-size-sm); line-height: 1.6; white-space: pre-wrap;
  }
  .assistant .msg-content { white-space: normal; }
  .assistant .msg-content { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .user .msg-content { background: var(--color-accent-dim); color: var(--color-fg-primary); }
  .input-area { display: flex; align-items: flex-end; gap: var(--space-2); padding: var(--space-3) var(--space-6); border-top: var(--border-subtle); }
  .chat-input {
    flex: 1; padding: var(--space-2) var(--space-3); background: var(--color-bg-overlay); border: var(--border-subtle);
    border-radius: var(--radius-md); color: var(--color-fg-primary); font-family: var(--font-sans);
    font-size: var(--font-size-sm); resize: none; outline: none; min-height: 36px; max-height: 120px;
  }
  .chat-input:focus { border-color: var(--color-accent); }
  .send-btn {
    width: 36px; height: 36px; border-radius: 50%; background: var(--color-accent); color: var(--color-bg-base);
    font-size: 16px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .send-btn:hover { opacity: 0.9; }
  .send-btn:disabled { opacity: 0.4; cursor: default; }
</style>
