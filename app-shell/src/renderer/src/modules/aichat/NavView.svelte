<!-- AI Chat NavView — conversation list -->
<script lang="ts">
  import { onMount } from 'svelte'
  import {
    aiConversations,
    createAiConversation,
    loadAiConversations,
    selectAiConversation,
    selectedAiConversationId
  } from './state'

  onMount(() => {
    void loadAiConversations()
  })

  function messageCountLabel(count: number): string {
    return count === 1 ? '1 message' : `${count} messages`
  }
</script>

<div class="nav-view">
  <header class="nav-header">
    <span class="nav-title">Conversations</span>
    <button class="new-btn" title="New conversation" onclick={() => void createAiConversation()}>+</button>
  </header>
  <div class="chat-list">
    {#each $aiConversations as chat (chat.id)}
      <button
        class="chat-item"
        class:active={$selectedAiConversationId === chat.id}
        aria-pressed={$selectedAiConversationId === chat.id}
        onclick={() => selectAiConversation(chat.id)}
      >
        <span class="chat-icon" aria-hidden="true">AI</span>
        <div class="chat-info">
          <span class="chat-title">{chat.title}</span>
          <span class="chat-meta">{chat.date} · {messageCountLabel(chat.messages.length)}</span>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-3); border-bottom: var(--border-zone); flex-shrink: 0; }
  .nav-title { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; color: var(--color-fg-secondary); }
  .new-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); color: var(--color-fg-muted); font-size: 16px; cursor: pointer; transition: background 0.1s, color 0.1s; }
  .new-btn:hover { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .chat-list { flex: 1; overflow-y: auto; padding: var(--space-2); }
  .chat-item { display: flex; align-items: flex-start; gap: var(--space-2); width: 100%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); text-align: left; color: var(--color-fg-secondary); transition: background 0.1s; cursor: pointer; }
  .chat-item:hover { background: var(--color-bg-overlay); }
  .chat-item.active { background: var(--color-accent-dim); color: var(--color-accent); }
  .chat-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--accent-inspector) 18%, transparent);
    color: color-mix(in srgb, var(--accent-inspector) 55%, var(--color-fg-primary));
    font-size: 9px;
    font-weight: 800;
  }
  .chat-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .chat-title { font-size: var(--font-size-sm); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chat-meta { font-size: var(--font-size-xs); color: var(--color-fg-secondary); }
</style>
