import { Fragment, type Node, type ResolvedPos, Slice } from 'prosemirror-model';
import { type EditorState, Plugin, type Selection, TextSelection } from 'prosemirror-state';
import { Mapping } from 'prosemirror-transform';
import type { EditorView } from 'prosemirror-view';

/** The ends of a selection that covers whole textblocks, or `null`. */
function wholeTextblocks(selection: Selection): { $from: ResolvedPos; $to: ResolvedPos } | null {
  if (!(selection instanceof TextSelection) || selection.empty) return null;
  const { $from, $to } = selection;
  if (!$from.parent.isTextblock || !$to.parent.isTextblock) return null;
  if ($from.parentOffset !== 0 || $to.parentOffset !== $to.parent.content.size) return null;
  return { $from, $to };
}

/**
 * Drops whole blocks inside the text of a textblock as blocks: the target is split and the
 * blocks go between the halves, or before/after it at the ends of its text. In a list item the
 * item is split too and each block gets its own item; blocks that cannot start an item
 * (headings) split the list instead. Dropped on themselves, they do not move.
 */
function dropBlocks(view: EditorView, event: DragEvent): boolean {
  const { state } = view;
  const blocks = wholeTextblocks(state.selection);
  if (!blocks || blocks.$from.node(-1) !== blocks.$to.node(-1)) return false;
  const from = blocks.$from.before();
  const to = blocks.$to.after();
  const target = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!target) return false;
  // Dropped on themselves: nothing moves.
  if (target.pos >= from && target.pos <= to) return true;
  if (!state.doc.resolve(target.pos).parent.isTextblock) return false;

  const tr = state.tr.deleteSelection();
  const pos = tr.mapping.map(target.pos);
  const $pos = tr.doc.resolve(pos);
  const { listItem } = state.schema.nodes;
  let nodes: Node[] = [];
  state.doc.slice(from, to).content.forEach((node) => {
    nodes.push(node);
  });
  let levels = 1;
  if ($pos.depth > 2 && $pos.node(-1).type === listItem) {
    const wrap = nodes.every((node) => listItem.contentMatch.matchType(node.type));
    levels = wrap ? 2 : 3;
    if (wrap) nodes = nodes.map((node) => listItem.create(null, node));
  }
  // Leave the levels whose edge the drop is at, then split the rest: no empty halves.
  const atStart = $pos.parentOffset === 0;
  const atEnd = $pos.parentOffset === $pos.parent.content.size;
  let at = pos;
  for (let depth = $pos.depth; levels > 0 && (atStart || atEnd); depth--) {
    const edge = atStart ? 0 : $pos.node(depth).childCount - 1;
    if (depth < $pos.depth && $pos.index(depth) !== edge) break;
    at = atStart ? $pos.before(depth) : $pos.after(depth);
    levels--;
  }
  if (levels > 0) {
    tr.split(at, levels);
    at += levels;
  }
  tr.replaceRange(at, at, new Slice(Fragment.from(nodes), 0, 0));
  let end = at;
  tr.mapping.maps[tr.mapping.maps.length - 1]?.forEach((_from, _to, _newFrom, newTo) => {
    end = newTo;
  });
  tr.setSelection(TextSelection.between(tr.doc.resolve(at), tr.doc.resolve(end)));
  view.focus();
  view.dispatch(tr.setMeta('uiEvent', 'drop'));
  return true;
}

/** Removes the block a move of whole blocks left empty, with the containers holding only it. */
function removeEmptiedBlock(oldState: EditorState, newState: EditorState, mapping: Mapping) {
  const blocks = wholeTextblocks(oldState.selection);
  if (!blocks) return null;
  // Bias the start after and the end before the dropped content, which may touch them.
  const start = mapping.map(blocks.$from.before(), 1);
  const end = mapping.map(blocks.$to.after(), -1);
  const $start = newState.doc.resolve(start);
  const block = $start.nodeAfter;
  if (!block?.isTextblock || block.content.size !== 0 || end !== start + block.nodeSize) {
    return null;
  }
  let depth = $start.depth;
  while (depth > 0 && $start.node(depth).childCount === 1) depth--;
  if (!$start.node(depth).canReplace($start.index(depth), $start.index(depth) + 1)) return null;
  return depth === $start.depth
    ? newState.tr.delete(start, end)
    : newState.tr.delete($start.before(depth + 1), $start.after(depth + 1));
}

/**
 * Makes a drag-and-drop move of whole textblocks behave as a move of blocks (ARCHITECTURE §8.2):
 * dropped inside text they stay blocks, and the blocks they came from do not stay behind empty.
 */
export function createDropMovePlugin(): Plugin {
  return new Plugin({
    props: {
      handleDrop: (view, event, _slice, moved) => moved && dropBlocks(view, event),
    },
    appendTransaction(transactions, oldState, newState) {
      if (!transactions.some((tr) => tr.getMeta('uiEvent') === 'drop')) return null;
      const mapping = new Mapping();
      for (const tr of transactions) mapping.appendMapping(tr.mapping);
      return removeEmptiedBlock(oldState, newState, mapping);
    },
  });
}
