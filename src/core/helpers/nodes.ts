import type { Attrs, Node, NodeType } from 'prosemirror-model';
import { type Command, NodeSelection, TextSelection, type Transaction } from 'prosemirror-state';

/**
 * Inserts a block `node` in place of the selection and puts the cursor at the start of the
 * textblock after it, creating a paragraph when no textblock follows. Used by commands and
 * input rules that insert atom blocks (horizontal rule, figure).
 */
export function insertBlockNode(tr: Transaction, node: Node): Transaction {
  tr.replaceSelectionWith(node);
  // When a textblock follows the node, the cursor is already at its start. Otherwise the node
  // itself is selected: move into the next textblock, creating a paragraph if needed.
  if (tr.selection instanceof NodeSelection) {
    const end = tr.selection.to;
    if (!tr.doc.resolve(end).nodeAfter?.isTextblock) {
      tr.insert(end, tr.doc.type.schema.nodes.paragraph!.create());
    }
    tr.setSelection(TextSelection.create(tr.doc, end + 1));
  }
  return tr.scrollIntoView();
}

/**
 * Command: inserts a block of `type` with {@link insertBlockNode}. Returns `false` where the
 * parent of the selected textblock does not allow `type`.
 */
export function insertBlock(type: NodeType, attrs: Attrs | null = null): Command {
  return (state, dispatch) => {
    const { $from } = state.selection;
    if (!$from.node(-1).canReplaceWith($from.index(-1), $from.indexAfter(-1), type)) return false;
    dispatch?.(insertBlockNode(state.tr, type.create(attrs)));
    return true;
  };
}
