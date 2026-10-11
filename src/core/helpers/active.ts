import type { Attrs, Mark, MarkType, NodeType } from 'prosemirror-model';
import { type EditorState, NodeSelection } from 'prosemirror-state';

/**
 * Whether `actual` contains every key of `expected` with a strictly equal (`===`) value.
 * `undefined` `expected` always matches.
 */
export function attrsMatch(actual: Attrs, expected?: Record<string, unknown>): boolean {
  if (!expected) return true;
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
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
  const hasMark = (marks: readonly Mark[]) =>
    marks.some((mark) => mark.type === type && attrsMatch(mark.attrs, attrs));
  const { empty, from, to, $from } = state.selection;
  if (empty) return hasMark(state.storedMarks ?? $from.marks());

  let found = false;
  let all = true;
  state.doc.nodesBetween(from, to, (node) => {
    if (node.isText) {
      found = true;
      all &&= hasMark(node.marks);
    }
    return all;
  });
  return found && all;
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
  const { selection } = state;
  const nodes = selection instanceof NodeSelection ? [selection.node] : [];
  for (let depth = selection.$from.depth; depth >= 0; depth--) {
    nodes.push(selection.$from.node(depth));
  }
  return nodes.some((node) => node.type === type && attrsMatch(node.attrs, attrs));
}
