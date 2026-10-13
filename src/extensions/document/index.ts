import { selectAll } from 'prosemirror-commands';
import { type Command, NodeSelection, TextSelection } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';

declare module '../../core/types' {
  interface Commands {
    /**
     * Selects the text from `from` to `to` (document positions; `to` defaults to `from`, a
     * cursor). A position outside text moves to the nearest text position. Returns `false` when
     * a position is outside the document.
     */
    select: (from: number, to?: number) => Command;
    /** Selects the node that starts at `pos`. Returns `false` when there is no selectable node. */
    selectNode: (pos: number) => Command;
    /** Selects the whole document. */
    selectAll: () => Command;
  }
}

/** The top-level `doc` node: one or more blocks. Provides the selection commands. */
export const Document = defineExtension({
  name: 'doc',
  nodes: () => ({
    doc: { content: 'block+' },
  }),
  commands: () => ({
    select:
      (from: number, to = from) =>
      (state, dispatch) => {
        const { doc } = state;
        if (Math.min(from, to) < 0 || Math.max(from, to) > doc.content.size) return false;
        dispatch?.(
          state.tr.setSelection(TextSelection.between(doc.resolve(from), doc.resolve(to))),
        );
        return true;
      },
    selectNode: (pos: number) => (state, dispatch) => {
      const { doc } = state;
      const node = pos >= 0 && pos < doc.content.size ? doc.nodeAt(pos) : null;
      if (!node || !NodeSelection.isSelectable(node)) return false;
      dispatch?.(state.tr.setSelection(NodeSelection.create(doc, pos)));
      return true;
    },
    selectAll: () => selectAll,
  }),
});
