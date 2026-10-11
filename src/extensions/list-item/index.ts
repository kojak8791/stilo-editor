import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';

declare module '../../core/types' {
  interface Commands {
    /** Splits the list item at the cursor; in an empty item, lifts it out of the list. */
    splitListItem: () => Command;
    /** Nests the selected list items one level deeper. */
    sinkListItem: () => Command;
    /** Lifts the selected list items one level up (out of the list at the top level). */
    liftListItem: () => Command;
  }
}

/**
 * The `listItem` node (`<li>`), docs/SPEC.md F-403, F-404. Required by `BulletList` and
 * `OrderedList`.
 */
export const ListItem = defineExtension({
  name: 'listItem',
  nodes: () => ({
    listItem: {
      content: 'paragraph block*',
      defining: true,
      parseDOM: [{ tag: 'li' }],
      toDOM: () => ['li', 0],
    },
  }),
  commands: ({ schema }) => {
    const listItem = schema.nodes.listItem!;
    return {
      splitListItem: () => splitListItem(listItem),
      sinkListItem: () => sinkListItem(listItem),
      liftListItem: () => liftListItem(listItem),
    };
  },
  keymap: ({ editor, schema }) => ({
    Enter: () => editor.commands.splitListItem(),
    Tab: () => editor.commands.sinkListItem(),
    'Shift-Tab': () => editor.commands.liftListItem(),
    // At the start of the first paragraph of an item, Backspace lifts the item.
    Backspace: (state) => {
      const { $from, empty } = state.selection;
      const isItemStart =
        empty &&
        $from.parentOffset === 0 &&
        $from.depth >= 2 &&
        $from.node(-1).type === schema.nodes.listItem &&
        $from.index(-1) === 0;
      return isItemStart && editor.commands.liftListItem();
    },
  }),
});
