import { Plugin, TextSelection } from 'prosemirror-state';
import { Mapping } from 'prosemirror-transform';

/**
 * Removes the textblock a drag-and-drop move leaves empty, with the containers that held only
 * that block (ARCHITECTURE §8.2). ProseMirror moves the text of whole selected blocks but keeps
 * the blocks, so every move left an empty paragraph behind.
 */
export function createDropMovePlugin(): Plugin {
  return new Plugin({
    appendTransaction(transactions, oldState, newState) {
      if (!transactions.some((tr) => tr.getMeta('uiEvent') === 'drop')) return null;
      const { selection } = oldState;
      if (!(selection instanceof TextSelection) || selection.empty) return null;
      const { $from, $to } = selection;
      if (!$from.parent.isTextblock || !$to.parent.isTextblock) return null;
      if ($from.parentOffset !== 0 || $to.parentOffset !== $to.parent.content.size) return null;

      const mapping = new Mapping();
      for (const tr of transactions) mapping.appendMapping(tr.mapping);
      // Bias the start after and the end before the dropped content, which may touch them.
      const start = mapping.map($from.before(), 1);
      const end = mapping.map($to.after(), -1);
      const $start = newState.doc.resolve(start);
      const block = $start.nodeAfter;
      if (!block?.isTextblock || block.content.size !== 0 || end !== start + block.nodeSize) {
        return null;
      }
      // Containers left with only the empty block (list item, blockquote) go with it.
      let depth = $start.depth;
      while (depth > 0 && $start.node(depth).childCount === 1) depth--;
      if (!$start.node(depth).canReplace($start.index(depth), $start.index(depth) + 1)) return null;
      return depth === $start.depth
        ? newState.tr.delete(start, end)
        : newState.tr.delete($start.before(depth + 1), $start.after(depth + 1));
    },
  });
}
