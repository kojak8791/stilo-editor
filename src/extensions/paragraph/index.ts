import { setBlockType } from 'prosemirror-commands';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';

declare module '../../core/types' {
  interface Commands {
    /** Turns the selected textblocks into paragraphs. */
    setParagraph: () => Command;
  }
}

/**
 * The `paragraph` node (`<p>`). Priority 1000 makes it the first block node, which ProseMirror
 * uses as the default block. `<div>` needs no parse rule: ProseMirror treats it as a block
 * wrapper and wraps its loose inline content in paragraphs (the `div` fallback of
 * docs/ARCHITECTURE.md §7.1).
 */
export const Paragraph = defineExtension({
  name: 'paragraph',
  priority: 1000,
  nodes: () => ({
    paragraph: {
      group: 'block',
      content: 'inline*',
      parseDOM: [{ tag: 'p' }],
      toDOM: () => ['p', 0],
    },
  }),
  commands: ({ schema }) => ({
    setParagraph: () => setBlockType(schema.nodes.paragraph!),
  }),
  keymap: ({ editor }) => ({
    'Mod-Alt-0': () => editor.commands.setParagraph(),
  }),
});
