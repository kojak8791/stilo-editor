import { lift, wrapIn } from 'prosemirror-commands';
import { wrappingInputRule } from 'prosemirror-inputrules';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { isNodeActive } from '../../core/helpers/active';

declare module '../../core/types' {
  interface Commands {
    /** Turns the selected textblocks into a blockquote. */
    setBlockquote: () => Command;
    /** Removes the blockquote from the selected textblocks. */
    unsetBlockquote: () => Command;
    /** Removes the blockquote if active, otherwise adds it. */
    toggleBlockquote: () => Command;
  }
}

/**
 * The `blockquote` node (`<blockquote>`), docs/SPEC.md F-303.
 */
export const Blockquote = defineExtension({
  name: 'blockquote',
  nodes: () => ({
    blockquote: {
      group: 'block',
      content: 'block+',
      defining: true,
      parseDOM: [{ tag: 'blockquote' }],
      toDOM: () => ['blockquote', 0],
    },
  }),
  commands: ({ schema }) => {
    const blockquote = schema.nodes.blockquote!;
    return {
      setBlockquote: () => wrapIn(blockquote),
      unsetBlockquote: () => (state, dispatch) =>
        isNodeActive(state, blockquote) && lift(state, dispatch),
      toggleBlockquote: () => (state, dispatch) =>
        isNodeActive(state, blockquote)
          ? lift(state, dispatch)
          : wrapIn(blockquote)(state, dispatch),
    };
  },
  keymap: ({ editor }) => ({
    'Mod-Shift-b': () => editor.commands.toggleBlockquote(),
  }),
  inputRules: ({ schema }) => [wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote!)],
});
