import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { blockStyleAttrs, blockStyleDOM, parseBlockStyle } from '../../core/helpers/block-style';
import { setTextblockType } from '../../core/helpers/nodes';

declare module '../../core/types' {
  interface Commands {
    /** Turns the selected textblocks into paragraphs. */
    setParagraph: () => Command;
  }
}

/**
 * The `paragraph` node (`<p>`, with `style` for its alignment and line height). Priority 1000
 * makes it the first block node, which ProseMirror uses as the default block. `<div>` needs no
 * parse rule: ProseMirror treats it as a block wrapper and wraps its loose inline content in
 * paragraphs (the `div` fallback of docs/ARCHITECTURE.md §7.1).
 */
export const Paragraph = defineExtension({
  name: 'paragraph',
  priority: 1000,
  nodes: () => ({
    paragraph: {
      group: 'block',
      content: 'inline*',
      attrs: blockStyleAttrs(),
      parseDOM: [{ tag: 'p', getAttrs: parseBlockStyle }],
      toDOM: (node) => blockStyleDOM('p', node),
    },
  }),
  commands: ({ schema }) => ({
    setParagraph: () => setTextblockType(schema.nodes.paragraph!),
  }),
  keymap: ({ editor }) => ({
    'Mod-Alt-0': () => editor.commands.setParagraph(),
  }),
});
