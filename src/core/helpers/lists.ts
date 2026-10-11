import type { Attrs, NodeType } from 'prosemirror-model';
import { liftListItem, wrapInList } from 'prosemirror-schema-list';
import type { Command } from 'prosemirror-state';

/**
 * Command: toggles a list of `listType` (whose items are `itemType`) at the selection. List
 * nodes are recognized by the `list` group in their spec. Looking at the nearest list around
 * the start of the selection:
 *
 * - a list of `listType`: the selected items are lifted out one level (`liftListItem`);
 * - a list of another type: that list becomes a `listType` list with `attrs`, items unchanged;
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
      dispatch?.(state.tr.setNodeMarkup($from.before(depth), listType, attrs).scrollIntoView());
      return true;
    }
    return wrapInList(listType, attrs)(state, dispatch);
  };
}
