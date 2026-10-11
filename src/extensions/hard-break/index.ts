import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';

declare module '../../core/types' {
  interface Commands {
    /** Inserts a hard break (`<br>`) at the cursor. */
    setHardBreak: () => Command;
  }
}

/**
 * The `hardBreak` node (`<br>`), docs/SPEC.md F-305.
 */
export const HardBreak = defineExtension({
  name: 'hardBreak',
  nodes: () => ({
    hardBreak: {
      inline: true,
      group: 'inline',
      selectable: false,
      linebreakReplacement: true,
      leafText: () => '\n',
      parseDOM: [{ tag: 'br' }],
      toDOM: () => ['br'],
    },
  }),
  commands: ({ schema }) => {
    const setHardBreak = (): Command => (state, dispatch) => {
      const type = schema.nodes.hardBreak!;
      const { $from } = state.selection;
      if (!$from.parent.canReplaceWith($from.index(), $from.index(), type)) return false;
      dispatch?.(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
      return true;
    };
    return { setHardBreak };
  },
  keymap: ({ editor }) => ({
    'Shift-Enter': () => editor.commands.setHardBreak(),
  }),
});
