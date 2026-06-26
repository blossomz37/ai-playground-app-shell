<!-- AI Chat NavView — conversation list -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { ArchiveIcon, ArrowClockwiseIcon, TrashIcon } from 'phosphor-svelte'
  import InlineRename from '../../shell/InlineRename.svelte'
  import { addToast } from '../../store/toasts'
  import {
    archivedAiConversations,
    archiveAiConversation,
    aiConversations,
    createAiConversation,
    deleteAiConversation,
    loadAiConversations,
    renameAiConversation,
    restoreAiConversation,
    selectAiConversation,
    selectedAiConversationId
  } from './state'

  let renamingConversationId = $state<string | null>(null)
  let filterQuery = $state('')
  let normalizedFilter = $derived(filterQuery.trim().toLowerCase())
  let visibleConversations = $derived(
    normalizedFilter
      ? $aiConversations.filter(chat => conversationMatches(chat, normalizedFilter))
      : $aiConversations
  )
  let visibleArchivedConversations = $derived(
    normalizedFilter
      ? $archivedAiConversations.filter(chat => conversationMatches(chat, normalizedFilter))
      : $archivedAiConversations
  )

  onMount(() => {
    void loadAiConversations()
  })

  function conversationMatches(chat: { title: string; date: string; messages: Array<{ content: string }> }, query: string): boolean {
    return [
      chat.title,
      chat.date,
      ...chat.messages.map(message => message.content)
    ].some(value => value.toLowerCase().includes(query))
  }

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

  async function archiveConversation(event: MouseEvent, id: string, title: string): Promise<void> {
    event.stopPropagation()
    await archiveAiConversation(id)
    addToast('info', `Archived ${title}.`)
  }

  async function restoreConversation(event: MouseEvent, id: string, title: string): Promise<void> {
    event.stopPropagation()
    await restoreAiConversation(id)
    addToast('info', `Restored ${title}.`)
  }

  async function deleteConversation(event: MouseEvent, id: string, title: string): Promise<void> {
    event.stopPropagation()
    if (!window.confirm(`Delete "${title}" permanently? This cannot be undone.`)) return
    await deleteAiConversation(id)
    addToast('info', `Deleted ${title}.`)
  }
</script>

<div class="nav-view">
  <header class="zone-header nav-header">
    <span class="zone-title nav-title">Conversations</span>
    <button class="new-btn" title="New conversation" onclick={() => void createAiConversation()}>+</button>
  </header>
  <div class="nav-filter">
    <input
      bind:value={filterQuery}
      data-capture-nav-search
      type="search"
      class="filter-input"
      placeholder="Filter conversations"
      aria-label="Filter conversations"
      autocomplete="off"
    />
  </div>
  <div class="chat-list">
    {#each visibleConversations as chat (chat.id)}
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
          <button
            type="button"
            class="row-action"
            title="Archive"
            aria-label={`Archive ${chat.title}`}
            onclick={(event) => void archiveConversation(event, chat.id, chat.title)}
          >
            <ArchiveIcon size={14} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="row-action danger"
            title="Delete"
            aria-label={`Delete ${chat.title}`}
            onclick={(event) => void deleteConversation(event, chat.id, chat.title)}
          >
            <TrashIcon size={14} weight="bold" aria-hidden="true" />
          </button>
        {/if}
      </div>
    {:else}
      <div class="list-empty">No conversations match.</div>
    {/each}
  </div>
  {#if $archivedAiConversations.length > 0}
    <section class="archived-section" aria-label="Archived conversations">
      <div class="archived-header">
        <span>Archived</span>
        <span class="archived-count">{visibleArchivedConversations.length}</span>
      </div>
      <div class="archived-list">
        {#each visibleArchivedConversations as chat (chat.id)}
          <div class="archived-item">
            <div class="archived-copy">
              <span class="chat-title">{chat.title}</span>
              <span class="chat-meta">{chat.date} · {messageCountLabel(chat.messages.length)}</span>
            </div>
            <button
              type="button"
              class="row-action restore-action"
              title="Restore"
              aria-label={`Restore ${chat.title}`}
              onclick={(event) => void restoreConversation(event, chat.id, chat.title)}
            >
              <ArrowClockwiseIcon size={14} weight="bold" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="row-action danger"
              title="Delete"
              aria-label={`Delete ${chat.title}`}
              onclick={(event) => void deleteConversation(event, chat.id, chat.title)}
            >
              <TrashIcon size={14} weight="bold" aria-hidden="true" />
            </button>
          </div>
        {:else}
          <div class="list-empty compact">No archived conversations match.</div>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .nav-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .nav-header { justify-content: space-between; }
  .new-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); color: var(--color-fg-muted); font-size: 16px; cursor: pointer; transition: background 0.1s, color 0.1s; }
  .new-btn:hover { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .nav-filter { flex: 0 0 auto; padding: var(--space-2) var(--space-2) 0; }
  .filter-input { width: 100%; height: 28px; padding: 0 var(--space-2); border: var(--border-subtle); border-radius: var(--radius-sm); background: var(--color-bg-base); color: var(--color-fg-primary); font-size: var(--font-size-xs); }
  .filter-input::placeholder { color: var(--color-fg-muted); }
  .filter-input:focus { outline: 2px solid var(--color-focus-ring); outline-offset: 1px; }
  .chat-list { flex: 1; overflow-y: auto; padding: var(--space-2); }
  .list-empty { padding: var(--space-3) var(--space-2); color: var(--color-fg-muted); font-size: var(--font-size-sm); }
  .list-empty.compact { padding: var(--space-2); font-size: var(--font-size-xs); }
  .chat-item { display: grid; grid-template-columns: minmax(0, 1fr) repeat(3, 24px); align-items: center; gap: var(--space-1); width: 100%; padding: var(--space-1); border-radius: var(--radius-md); text-align: left; color: var(--color-fg-secondary); transition: background 0.1s; }
  .chat-item:hover { background: var(--color-bg-overlay); }
  .chat-item.active { background: var(--color-accent-dim); color: var(--color-accent); }
  .chat-open { display: flex; align-items: flex-start; gap: var(--space-2); min-width: 0; padding: var(--space-1) var(--space-2); text-align: left; color: inherit; cursor: pointer; }
  .row-action { width: 22px; height: 22px; border-radius: var(--radius-sm); color: var(--color-fg-muted); opacity: 0; display: inline-flex; align-items: center; justify-content: center; }
  .chat-item:hover .row-action, .chat-item.active .row-action, .archived-item .row-action, .row-action:focus-visible { opacity: 1; }
  .row-action:hover { background: var(--color-bg-overlay); color: var(--color-fg-primary); }
  .row-action.danger:hover { color: var(--color-danger); }
  .restore-action:hover { color: var(--color-success); }
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
  .archived-section { flex: 0 0 auto; border-top: 1px solid color-mix(in srgb, var(--accent-nav) 18%, var(--color-border)); padding: var(--space-2); }
  .archived-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-1) var(--space-2); color: var(--color-fg-muted); font-size: var(--font-size-xs); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .archived-count { color: var(--color-fg-secondary); }
  .archived-list { max-height: 172px; overflow-y: auto; padding-top: var(--space-1); }
  .archived-item { display: grid; grid-template-columns: minmax(0, 1fr) repeat(2, 24px); align-items: center; gap: var(--space-1); padding: var(--space-1); border-radius: var(--radius-sm); color: var(--color-fg-secondary); }
  .archived-item:hover { background: var(--color-bg-overlay); }
  .archived-copy { min-width: 0; display: flex; flex-direction: column; gap: 1px; padding: 0 var(--space-2); }
</style>
