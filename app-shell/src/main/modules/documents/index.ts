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
        { id: 'documents.newChapter', title: 'New Chapter' },
        { id: 'documents.newScene',   title: 'New Scene' },
        { id: 'documents.newFolder',  title: 'New Folder' },
        { id: 'documents.rename',     title: 'Rename' },
        { id: 'documents.export',     title: 'Export Document' },
        { id: 'documents.archive',    title: 'Archive' },
        { id: 'shell.settings',       title: 'Open Settings',      keybinding: 'CmdOrCtrl+,' },
        { id: 'shell.layout.toggleSidebar',   title: 'Toggle Sidebar',   keybinding: 'CmdOrCtrl+B' },
        { id: 'shell.layout.toggleInspector', title: 'Toggle Inspector', keybinding: 'CmdOrCtrl+I' },
        { id: 'shell.layout.zenMode',         title: 'Zen Mode',         keybinding: 'CmdOrCtrl+Shift+Z' }
      ],
      documentTypes: [
        { kind: 'folder',  label: 'Folder',  icon: 'folder' },
        { kind: 'chapter', label: 'Chapter', icon: 'book-open' },
        { kind: 'scene',   label: 'Scene',   icon: 'file-text' },
        { kind: 'plan',    label: 'Plan',    icon: 'map' }
      ]
    }
  },

  async activate(ctx: ModuleContext): Promise<void> {
    ctx.commands.register('documents.save', async (id: unknown, content: unknown) => {
      await ctx.documents.save(String(id), String(content))
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

    ctx.events.on('documents:changed', (id) => {
      // Module reacts to document changes here (e.g. recompute word count)
      ctx.events.emit('documents.module:refresh', id)
    })
  }
}
