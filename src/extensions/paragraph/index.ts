import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { setTextblockType } from '../../core/helpers/nodes';
import { parseTextAlign, textAlignAttr, textAlignDOM } from '../../core/helpers/text-align';

declare module '../../core/types' {
  interface Commands {
    /** Turns the selected textblocks into paragraphs. */
    setParagraph: () => Command;
  }
}

/**
 * The `paragraph` node (`<p>`, with `style="text-align: x"` when aligned). Priority 1000 makes it the first block node, which ProseMirror
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
      attrs: textAlignAttr(),
      parseDOM: [
        {
          tag: 'p',
          // `null` keeps the shared default attributes: one object per paragraph is a lot of memory
          // in a large document.
          getAttrs: (node) => {
            const textAlign = parseTextAlign(node);
            return textAlign ? { textAlign } : null;
          },
        },
      ],
      toDOM: (node) => textAlignDOM('p', node),
    },
  }),
  commands: ({ schema }) => ({
    setParagraph: () => setTextblockType(schema.nodes.paragraph!),
  }),
  keymap: ({ editor }) => ({
    'Mod-Alt-0': () => editor.commands.setParagraph(),
  }),
});
