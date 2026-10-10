import type { Attrs, MarkType, NodeType } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';
import { notImplemented } from '../errors';

/**
 * Whether `actual` contains every key of `expected` with a strictly equal (`===`) value.
 * `undefined` `expected` always matches.
 */
export function attrsMatch(actual: Attrs, expected?: Record<string, unknown>): boolean {
  return notImplemented('attrsMatch');
}

/**
 * Whether a mark of `type` (with matching `attrs`, see {@link attrsMatch}) is active:
 *
 * - empty selection: present in `state.storedMarks`, or if those are `null`, in
 *   `selection.$from.marks()`;
 * - non-empty selection: every text node between `from` and `to` has the mark, and there is at
 *   least one text node. Traverse only the selected range (`doc.nodesBetween(from, to)`).
 */
export function isMarkActive(
  state: EditorState,
  type: MarkType,
  attrs?: Record<string, unknown>,
): boolean {
  return notImplemented('isMarkActive');
}

/**
 * Whether a node of `type` (with matching `attrs`) is active: the selection is a
 * `NodeSelection` of such a node, or `selection.$from` has such an ancestor (any depth,
 * including the document itself).
 */
export function isNodeActive(
  state: EditorState,
  type: NodeType,
  attrs?: Record<string, unknown>,
): boolean {
  return notImplemented('isNodeActive');
}
