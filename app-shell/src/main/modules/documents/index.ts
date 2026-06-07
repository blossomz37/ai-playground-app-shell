import type { Module, ModuleContext } from '@shared/module-contract'

export const documentsModule: Module = {
  manifest: {
    id: 'shell.documents',
    name: 'Documents',
    version: '0.1.0',
    requiredShellVersion: '^0.1.0',
    activation: [{ on: 'userEnable' }],
    permissions: ['documents.read', 'documents.write'],
    contributes: {
      zones: {
        railEntry: { icon: 'pen', label: 'Write' },
        navigation: { title: 'Manuscript' },
        main: { title: 'Editor' },
        inspector: { title: 'Document' },
        statusBar: [{ id: 'word-count' }, { id: 'save-state' }]
      },
      commands: [
        { id: 'documents.save',       title: 'Save Document',  keybinding: 'CmdOrCtrl+S' },
        { id: 'documents.newDocument', title: 'New Document' },
        { id: 'documents.newChapter', title: 'New Chapter' },
        { id: 'documents.newScene',   title: 'New Scene' },
        { id: 'documents.newFolder',  title: 'New Folder' },
        { id: 'documents.rename',     title: 'Rename' },
        { id: 'documents.export',     title: 'Export Document' },
        { id: 'documents.archive',    title: 'Archive' },
        { id: 'documents.close',      title: 'Close Document' },
        { id: 'documents.annotateSelection', title: 'Annotate Selection' },
        { id: 'documents.find',       title: 'Find in Document',  keybinding: 'CmdOrCtrl+F' },
        { id: 'documents.replace',    title: 'Replace in Document', keybinding: 'CmdOrCtrl+H' },
        { id: 'documents.findNext',   title: 'Find Next' },
        { id: 'shell.settings',       title: 'Open Settings',      keybinding: 'CmdOrCtrl+,' },
        { id: 'shell.layout.toggleSidebar',   title: 'Toggle Sidebar',   keybinding: 'CmdOrCtrl+B' },
        { id: 'shell.layout.toggleInspector', title: 'Toggle Inspector', keybinding: 'CmdOrCtrl+I' },
        { id: 'shell.layout.zenMode',         title: 'Zen Mode',         keybinding: 'CmdOrCtrl+Shift+Z' }
      ],
      documentTypes: [
        { kind: 'chapter', label: 'Chapter', icon: 'book-open' },
        { kind: 'scene',   label: 'Scene',   icon: 'file-text' },
        { kind: 'plan',    label: 'Plan',    icon: 'map' },
        { kind: 'note',    label: 'Note',    icon: 'file-text' },
        { kind: 'research', label: 'Research', icon: 'magnifying-glass' },
        { kind: 'character', label: 'Character', icon: 'user' },
        { kind: 'setting', label: 'Setting', icon: 'map-pin' },
        { kind: 'outline', label: 'Outline', icon: 'list' }
      ]
    }
  },

  async activate(ctx: ModuleContext): Promise<void> {
    ctx.commands.register('documents.save', async (id: unknown, content: unknown) => {
      await ctx.documents.save(String(id), String(content))
    })

    ctx.commands.register('documents.newDocument', async () => {
      ctx.notify({ level: 'info', message: 'New document is available from the Documents tree.' })
    })

    ctx.commands.register('documents.newChapter', async () => {
      ctx.notify({ level: 'info', message: 'New chapter is available from the Documents tree.' })
    })

    ctx.commands.register('documents.newScene', async () => {
      ctx.notify({ level: 'info', message: 'New scene is available from the Documents tree.' })
    })

    ctx.commands.register('documents.newFolder', async () => {
      ctx.notify({ level: 'info', message: 'New folder is available from the Documents tree.' })
    })

    ctx.commands.register('documents.rename', async () => {
      ctx.notify({ level: 'info', message: 'Rename is available from the Documents tree.' })
    })

    ctx.commands.register('documents.archive', async () => {
      ctx.notify({ level: 'info', message: 'Archive is available from the Documents tree.' })
    })

    ctx.commands.register('documents.export', async () => {
      ctx.notify({ level: 'info', message: 'Export is available from the Documents tree.' })
    })

    ctx.commands.register('documents.close', async () => {
      ctx.notify({ level: 'info', message: 'Open a document to close it.' })
    })

    ctx.commands.register('documents.annotateSelection', async () => {
      ctx.notify({ level: 'info', message: 'Open a document and select text to annotate.' })
    })

    ctx.commands.register('documents.find', async () => {
      ctx.notify({ level: 'info', message: 'Open a document to use Find.' })
    })

    ctx.commands.register('documents.replace', async () => {
      ctx.notify({ level: 'info', message: 'Open a document to use Replace.' })
    })

    ctx.commands.register('documents.findNext', async () => {
      ctx.notify({ level: 'info', message: 'Open Find in a document to jump to the next match.' })
    })

    ctx.events.on('documents:changed', (id) => {
      // Module reacts to document changes here (e.g. recompute word count)
      ctx.events.emit('documents.module:refresh', id)
    })
  }
}
