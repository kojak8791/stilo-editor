import type { ResolvedPos } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';

declare module '../../core/types' {
  interface Commands {
    /** Moves the block (or list item) at the selection one place up among its siblings. */
    moveBlockUp: () => Command;
    /** Moves the block (or list item) at the selection one place down among its siblings. */
    moveBlockDown: () => Command;
  }
}

function matchesPredicate(n: {
  type: { isInGroup: (g: string) => boolean; name: string };
}): boolean {
  return (
    n.type.isInGroup('list') ||
    n.type.name === 'doc' ||
    n.type.name === 'blockquote' ||
    n.type.name === 'tableCell' ||
    n.type.name === 'tableHeader'
  );
}

/**
 * Moves the unit(s) at the selection one place up among its siblings.
 * Returns false when the unit is already first or no container is found.
 *
 * @remarks docs/SPEC.md F-309
 */
function moveUp(
  $from: ResolvedPos,
  $to: ResolvedPos,
  state: EditorState,
  dispatch: ((tr: EditorState['tr']) => void) | undefined,
): boolean {
  const range = $from.blockRange($to, matchesPredicate);
  if (!range) return false;
  const { parent, startIndex, start, end } = range;
  if (startIndex === 0) return false;
  const prev = parent.child(startIndex - 1);
  if (!dispatch) return true;
  const prevSize = prev.nodeSize;
  // range.start is the document-relative position of the first child in the range.
  // prevStart = position where the previous sibling starts.
  const prevStart = start - prevSize;
  const tr = state.tr;
  // Delete the previous sibling, insert it after the range.
  tr.delete(prevStart, prevStart + prevSize);
  tr.insert(end - prevSize, prev);
  tr.scrollIntoView();
  dispatch(tr);
  return true;
}

/**
 * Moves the unit(s) at the selection one place down among its siblings.
 * Returns false when the unit is already last or no container is found.
 *
 * @remarks docs/SPEC.md F-309
 */
function moveDown(
  $from: ResolvedPos,
  $to: ResolvedPos,
  state: EditorState,
  dispatch: ((tr: EditorState['tr']) => void) | undefined,
): boolean {
  const range = $from.blockRange($to, matchesPredicate);
  if (!range) return false;
  const { parent, endIndex, start, end } = range;
  if (endIndex >= parent.childCount) return false;
  const next = parent.child(endIndex);
  if (!dispatch) return true;
  const nextSize = next.nodeSize;
  // range.end is the document-relative position after the last child in the range,
  // which is also where the next sibling starts.
  const nextStart = end;
  const nextEnd = nextStart + nextSize;
  const tr = state.tr;
  // Delete the next sibling, insert it at the start of the range.
  tr.delete(nextStart, nextEnd);
  tr.insert(start, next);
  tr.scrollIntoView();
  dispatch(tr);
  return true;
}

/**
 * Move block up / down among siblings (F-309).
 *
 * The movable unit is the innermost ancestor that is a list or container:
 * the children of that ancestor covered by the selection.
 * Uses the "move the neighbor" approach to keep the selection intact.
 */
export const MoveBlock = defineExtension({
  name: 'moveBlock',
  commands: ({ editor: _editor }) => ({
    moveBlockUp: (): Command => (state, dispatch) => {
      const { $from, $to } = state.selection;
      return moveUp($from, $to, state, dispatch);
    },
    moveBlockDown: (): Command => (state, dispatch) => {
      const { $from, $to } = state.selection;
      return moveDown($from, $to, state, dispatch);
    },
  }),
  keymap: ({ editor }) => ({
    'Alt-ArrowUp': () => editor.commands.moveBlockUp(),
    'Alt-ArrowDown': () => editor.commands.moveBlockDown(),
  }),
});
