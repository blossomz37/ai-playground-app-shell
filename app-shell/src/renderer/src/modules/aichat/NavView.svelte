<!-- AI Chat NavView — conversation list -->
<script lang="ts">
  import { onMount } from 'svelte'
  import InlineRename from '../../shell/InlineRename.svelte'
  import { addToast } from '../../store/toasts'
  import {
    aiConversations,
    createAiConversation,
    loadAiConversations,
    renameAiConversation,
    selectAiConversation,
    selectedAiConversationId
  } from './state'

  let renamingConversationId = $state<string | null>(null)

  onMount(() => {
    void loadAiConversations()
  })

  function messageCountLabel(count: number): string {
    return count === 1 ? '1 message' : `${count} messages`
  }

  function startRename(event: MouseEvent, id: string): void {
    event.stopPropagation()
    selectAiConversation(id)
    renamingConversationId = id
  }

  function cancelRename(): void {
    renamingConversationId = null
  }

  async function commitRename(id: string, title: string): Promise<void> {
    if (!title) {
      addToast('warn', 'Conversation title cannot be blank.')
      cancelRename()
      return
    }
    await renameAiConversation(id, title)
    selectAiConversation(id)
    cancelRename()
  }
</script>

<div class="nav-view">
  <header class="zone-header nav-header">
    <span class="zone-title nav-title">Conversations</span>
    <button class="new-btn" title="New conversation" onclick={() => void createAiConversation()}>+</button>
  </header>
  <div class="chat-list">
    {#each $aiConversations as chat (chat.id)}
      <div
        class="chat-item"
        class:active={$selectedAiConversationId === chat.id}
      >
        {#if renamingConversationId === chat.id}
          <InlineRename
            value={chat.title}
            ariaLabel="Rename AI conversation"
            onCommit={(title) => commitRename(chat.id, title)}
            onCancel={cancelRename}
          />
        {:else}
          <button
            type="button"
            class="chat-open"
            aria-pressed={$selectedAiConversationId === chat.id}
            onclick={() => selectAiConversation(chat.id)}
          >
            <span class="chat-icon" aria-hidden="true">AI</span>
            <div class="chat-info">
              <span class="chat-title">{chat.title}</span>
              <span class="chat-meta">{chat.date} · {messageCountLabel(chat.messages.length)}</span>
            </div>
          </button>
          <button
            type="button"
            class="row-action"
            title="Rename"
            aria-label={`Rename ${chat.title}`}
            onclick={(event) => startRename(event, chat.id)}
          >
            ✎
          </button>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-header { justify-content: space-between; }
  .new-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); color: var(--color-fg-muted); font-size: 16px; cursor: pointer; transition: background 0.1s, color 0.1s; }
  .new-btn:hover { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .chat-list { flex: 1; overflow-y: auto; padding: var(--space-2); }
  .chat-item { display: grid; grid-template-columns: minmax(0, 1fr) 24px; align-items: center; gap: var(--space-1); width: 100%; padding: var(--space-1); border-radius: var(--radius-md); text-align: left; color: var(--color-fg-secondary); transition: background 0.1s; }
  .chat-item:hover { background: var(--color-bg-overlay); }
  .chat-item.active { background: var(--color-accent-dim); color: var(--color-accent); }
  .chat-open { display: flex; align-items: flex-start; gap: var(--space-2); min-width: 0; padding: var(--space-1) var(--space-2); text-align: left; color: inherit; cursor: pointer; }
  .row-action { width: 22px; height: 22px; border-radius: var(--radius-sm); color: var(--color-fg-muted); opacity: 0; }
  .chat-item:hover .row-action, .chat-item.active .row-action, .row-action:focus-visible { opacity: 1; }
  .row-action:hover { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
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
