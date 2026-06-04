The common CSS language is: **a jewel-toned, document-centric desktop shell with fixed workspace zones.** The mockups differ in surface treatment, but they share the same design grammar.

Core overlaps:

- **Jewel token palette:** ruby, amber/citrine, emerald, sapphire, amethyst, tourmaline show up across all three as named semantic colors, not random accents. See [mockup1](/Users/carlo/Github/app-shell-project/more-mockups/mock-shells/jewel-box-editor-mockup1.html:11), [mockup2](/Users/carlo/Github/app-shell-project/more-mockups/mock-shells/jewel-box-editor-mockup2.html:8), and [mockup3](/Users/carlo/Github/app-shell-project/more-mockups/mock-shells/jewel_box_workspace3.html:24).

- **Fixed app-shell structure:** title/global controls, context/breadcrumb row, left tree, center editor, right inspector, bottom/status area. The convergence doc names the same pattern directly: three-pane layout, persistent chrome, document-centric workflow, collapsible side panels [convergence.md](/Users/carlo/Github/app-shell-project/more-mockups/designer-descriptions/convergence.md:5).

- **Dark, glassy / faceted chrome:** thin borders, translucent panels, soft shadows, radial jewel glows, inset highlights, and clipped gem/facet motifs. Mockup 1 uses `--facet`, glow gradients, and window blur [mockup1](/Users/carlo/Github/app-shell-project/more-mockups/mock-shells/jewel-box-editor-mockup1.html:52). Mockup 2 uses panel overlays and gem shapes [mockup2](/Users/carlo/Github/app-shell-project/more-mockups/mock-shells/jewel-box-editor-mockup2.html:88). Mockup 3 keeps the jewel facet and tab glow [mockup3](/Users/carlo/Github/app-shell-project/more-mockups/mock-shells/jewel_box_workspace3.html:51).

- **Compact productivity UI:** small uppercase labels, tight controls, icon buttons, breadcrumbs, metadata fields, tab strips, chips, and status text. This reads more like Obsidian/VS Code than a marketing app.

- **Semantic zone coloring:** left/navigation tends toward emerald or file-color accents, center/editor gets sapphire or neutral focus, inspector/metadata gets amethyst/purple, warnings or selected story metadata use ruby/citrine/gold.

- **Editor-first center:** all versions make the prose area dominant, with surrounding CSS devoted to navigation, formatting, metadata, word count, saved state, linked mentions, or scene/status info. Mockup 1 uses a paper page [mockup1](/Users/carlo/Github/app-shell-project/more-mockups/mock-shells/jewel-box-editor-mockup1.html:228); mockup 2 uses a dark manuscript editor [mockup2](/Users/carlo/Github/app-shell-project/more-mockups/mock-shells/jewel-box-editor-mockup2.html:430); mockup 3 uses markdown/prose styling [mockup3](/Users/carlo/Github/app-shell-project/more-mockups/mock-shells/jewel_box_workspace3.html:80).

- **Stateful shell behavior:** collapsible/resizable sidebars, hover states, active row/tab indicators, theme switching, scrollbars, saved/online/status indicators. Mockup 1 and 2 encode collapsed sidebars in CSS grid; mockup 3 has resizers and right-panel toggling.

The useful takeaway: these mockups converge on a **tokenized Jewel Box shell theme**, not one exact layout. The implementation should probably preserve the shared grammar: named jewel tokens, thin separators, compact fixed zones, active left-tree rows, editor toolbar, right metadata inspector, bottom writing/status strip, and light/dark theme parity.