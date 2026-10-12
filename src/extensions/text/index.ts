import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';

declare module '../../core/types' {
  interface Commands {
    /**
     * Replaces the selection with `text`, with the marks active at the cursor. Returns `false`
     * for an empty string.
     */
    insertText: (text: string) => Command;
  }
}

/** The `text` node, and the `insertText` command. */
export const Text = defineExtension({
  name: 'text',
  nodes: () => ({
    text: { group: 'inline' },
  }),
  commands: () => ({
    insertText: (text: string) => (state, dispatch) => {
      if (!text) return false;
      dispatch?.(state.tr.insertText(text).scrollIntoView());
      return true;
    },
  }),
});
