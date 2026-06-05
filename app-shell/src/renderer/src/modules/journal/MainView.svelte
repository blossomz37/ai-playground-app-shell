<!-- Journal MainView — today's entry editor -->
<script lang="ts">
  import InlineRename from '../../shell/InlineRename.svelte'
  import { addToast } from '../../store/toasts'
  import { renameJournalEntry, selectedJournalEntry, updateSelectedJournalContent } from './state'

  let entry = $derived($selectedJournalEntry)
  let renamingTitle = $state(false)

  function commitRename(id: string, title: string): void {
    if (!title) {
      addToast('warn', 'Journal title cannot be blank.')
      renamingTitle = false
      return
    }
    renameJournalEntry(id, title)
    renamingTitle = false
  }
</script>

<div class="main-view">
  {#if entry}
    <header class="zone-header entry-header">
      <div class="entry-heading">
        {#if renamingTitle}
          <InlineRename
            value={entry.title}
            ariaLabel="Rename journal entry"
            onCommit={(title) => commitRename(entry.id, title)}
            onCancel={() => renamingTitle = false}
          />
        {:else}
          <button type="button" class="title-button" onclick={() => renamingTitle = true}>
            {entry.title}
          </button>
        {/if}
        <span class="entry-full-date">{entry.fullDate}</span>
      </div>
      <span class="entry-badge">{entry.date}</span>
    </header>
    <div class="entry-content">
      <textarea
        class="entry-editor"
        value={entry.content}
        spellcheck="true"
        placeholder="Write your thoughts..."
        oninput={(event) => updateSelectedJournalContent(event.currentTarget.value)}
      ></textarea>
    </div>
  {/if}
</div>

<style>
  .main-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .entry-header { justify-content: space-between; gap: var(--space-3); padding: 0 var(--space-6); }
  .entry-heading { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
  .title-button { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; font-size: var(--font-size-md); font-weight: 700; color: var(--color-fg-primary); }
  .entry-full-date { font-size: var(--font-size-xs); color: var(--color-fg-muted); }
  .entry-badge {
    font-size: var(--font-size-xs); color: var(--color-accent); background: var(--color-accent-dim);
    padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 500;
  }
  .entry-content { flex: 1; overflow: hidden; display: flex; }
  .entry-editor {
    flex: 1; padding: var(--space-5) var(--space-6); background: transparent; border: none;
    color: var(--color-fg-primary); font-family: var(--font-serif); font-size: var(--font-size-lg);
    line-height: var(--line-height); resize: none; outline: none; max-width: 72ch;
  }
</style>
