import type { NodeType } from 'prosemirror-model';
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import { type Command, TextSelection } from 'prosemirror-state';
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
 * Backspace at the start of a textblock right after a list: moves its content to the end of the
 * list's last textblock and deletes it (an empty one just disappears). Without this, ProseMirror
 * wraps the textblock in a new list item.
 */
function joinBackwardIntoList(listItem: NodeType): Command {
  return (state, dispatch) => {
    const { $from, empty } = state.selection;
    if (!empty || !$from.parent.isTextblock || $from.parentOffset !== 0 || $from.index(-1) === 0) {
      return false;
    }
    let node = $from.node(-1).child($from.index(-1) - 1);
    if (node.lastChild?.type !== listItem) return false;
    // From the end of the list's content, descend to its last textblock: each level ends one
    // closing token earlier.
    let end = $from.before() - 1;
    while (!node.isTextblock) {
      const last = node.lastChild;
      if (!last) return false;
      node = last;
      end -= 1;
    }
    if (dispatch) {
      const tr = state.tr.delete($from.before(), $from.after()).insert(end, $from.parent.content);
      dispatch(tr.setSelection(TextSelection.create(tr.doc, end)).scrollIntoView());
    }
    return true;
  };
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
    Backspace: (state, dispatch) => {
      const { $from, empty } = state.selection;
      const isItemStart =
        empty &&
        $from.parentOffset === 0 &&
        $from.depth >= 2 &&
        $from.node(-1).type === schema.nodes.listItem &&
        $from.index(-1) === 0;
      if (isItemStart) return editor.commands.liftListItem();
      return joinBackwardIntoList(schema.nodes.listItem!)(state, dispatch);
    },
  }),
});
