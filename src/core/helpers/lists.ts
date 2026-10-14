import type { Attrs, Node, NodeType } from 'prosemirror-model';
import { liftListItem, wrapInList } from 'prosemirror-schema-list';
import { type Command, TextSelection } from 'prosemirror-state';
import { StepMap } from 'prosemirror-transform';

/**
 * Command: toggles a list of `listType` (whose items are `itemType`) at the selection. List
 * nodes are recognized by the `list` group in their spec. Looking at the nearest list around
 * the start of the selection:
 *
 * - a list of `listType`: the selected items are lifted out one level (`liftListItem`);
 * - a list of another type: that list becomes a `listType` list with `attrs`, its items
 *   `itemType` items (a task item loses its `checked` state);
 * - no list: the selected blocks are wrapped in a new list (`wrapInList`).
 */
export function toggleList(
  listType: NodeType,
  itemType: NodeType,
  attrs: Attrs | null = null,
): Command {
  return (state, dispatch) => {
    const { $from } = state.selection;
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      if (!node.type.isInGroup('list')) continue;
      if (node.type === listType) return liftListItem(itemType)(state, dispatch);
      if (dispatch) {
        const pos = $from.before(depth);
        const tr = state.tr;
        if (node.firstChild?.type === itemType) {
          tr.setNodeMarkup(pos, listType, attrs);
        } else {
          // One step for the whole list: a step per item would copy the parent's children
          // each time. The positions do not change, so the selection keeps them.
          const items: Node[] = [];
          node.forEach((item) => {
            items.push(itemType.create(null, item.content));
          });
          tr.replaceWith(pos, pos + node.nodeSize, listType.create(attrs, items));
          tr.setSelection(state.selection.map(tr.doc, StepMap.empty));
        }
        dispatch(tr.scrollIntoView());
      }
      return true;
    }
    return wrapInList(listType, attrs)(state, dispatch);
  };
}

/**
 * Command for `Backspace` in lists whose items are `itemType`. At the start of the first
 * textblock of an item, lifts the item (`liftListItem`). At the start of a textblock right after
 * such a list, moves its content to the end of the list's last textblock and deletes it (an
 * empty one just disappears); without this, ProseMirror wraps the textblock in a new item.
 */
export function backspaceInList(itemType: NodeType): Command {
  return (state, dispatch) => {
    const { $from, empty } = state.selection;
    if (!empty || !$from.parent.isTextblock || $from.parentOffset !== 0) return false;
    if ($from.depth >= 2 && $from.node(-1).type === itemType && $from.index(-1) === 0) {
      return liftListItem(itemType)(state, dispatch);
    }
    if ($from.index(-1) === 0) return false;
    let node = $from.node(-1).child($from.index(-1) - 1);
    if (node.lastChild?.type !== itemType) return false;
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
