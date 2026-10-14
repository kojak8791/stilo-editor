import type { Attrs, Node, NodeType } from 'prosemirror-model';
import { type Command, NodeSelection, TextSelection, type Transaction } from 'prosemirror-state';
import { BLOCK_STYLE_ATTRS } from './block-style';

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
 * container of the selection (the parent of the selected textblock, or the parent of a selected
 * block node) does not allow `type`.
 */
export function insertBlock(type: NodeType, attrs: Attrs | null = null): Command {
  return (state, dispatch) => {
    const { $from } = state.selection;
    const depth = $from.parent.isTextblock ? $from.depth - 1 : $from.depth;
    const container = $from.node(depth);
    if (!container.canReplaceWith($from.index(depth), $from.indexAfter(depth), type)) return false;
    dispatch?.(insertBlockNode(state.tr, type.create(attrs)));
    return true;
  };
}

/**
 * Command: like `setBlockType` from prosemirror-commands (turns the selected textblocks into
 * `type` with `attrs`), but a block keeps the style attributes (`textAlign`, `lineHeight`) that
 * `type` also has, so a centered heading stays centered as a paragraph. `false` when no selected
 * textblock changes.
 */
export function setTextblockType(type: NodeType, attrs: Attrs = {}): Command {
  const kept = BLOCK_STYLE_ATTRS.filter((name) => type.spec.attrs?.[name] !== undefined);
  const attrsFor = (node: Node): Attrs => {
    const styles = Object.fromEntries(kept.map((name) => [name, node.attrs[name] ?? null]));
    return type.create({ ...attrs, ...styles }).attrs;
  };

  return (state, dispatch) => {
    let applicable = false;
    for (const { $from, $to } of state.selection.ranges) {
      state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
        if (applicable) return false;
        if (!node.isTextblock || node.hasMarkup(type, attrsFor(node))) return true;
        const $pos = state.doc.resolve(pos);
        applicable =
          node.type === type || $pos.parent.canReplaceWith($pos.index(), $pos.index() + 1, type);
        return !applicable;
      });
    }
    if (!applicable) return false;

    if (dispatch) {
      const tr = state.tr;
      for (const { $from, $to } of state.selection.ranges) {
        tr.setBlockType($from.pos, $to.pos, type, attrsFor);
      }
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}

/**
 * Command: sets the attribute `name` to `value` on every selected textblock whose type has that
 * attribute (`textAlign`, `lineHeight`). `false` when no selected textblock has it.
 */
export function setTextblockAttr(name: string, value: unknown): Command {
  return (state, dispatch) => {
    const positions = new Set<number>();
    for (const { $from, $to } of state.selection.ranges) {
      state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
        if (!node.isTextblock) return true;
        if (node.type.spec.attrs?.[name] !== undefined) positions.add(pos);
        return false;
      });
    }
    if (positions.size === 0) return false;

    if (dispatch) {
      const tr = state.tr;
      for (const pos of positions) {
        if (tr.doc.nodeAt(pos)?.attrs[name] !== value) tr.setNodeAttribute(pos, name, value);
      }
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}
