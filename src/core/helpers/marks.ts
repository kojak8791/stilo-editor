import type { Attrs, MarkType } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import { isMarkActive } from './active';

/**
 * Command: adds a mark of `type` with `attrs` to the selection.
 *
 * - Empty selection: adds the mark to the stored marks (applies to the next typed text).
 *   Returns `false` if the parent node does not allow the mark.
 * - Non-empty selection: adds the mark to every selection range. Returns `false` if no text in
 *   the selection allows the mark. The transaction scrolls into view.
 */
export function setMark(type: MarkType, attrs: Attrs | null = null): Command {
  return (state, dispatch) => {
    const { empty, $from, ranges } = state.selection;
    if (empty) {
      if (!$from.parent.type.allowsMarkType(type)) return false;
      dispatch?.(state.tr.addStoredMark(type.create(attrs)));
      return true;
    }

    let applies = false;
    for (const range of ranges) {
      state.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, _pos, parent) => {
        applies ||= node.isText && parent?.type.allowsMarkType(type) === true;
        return !applies;
      });
    }
    if (!applies) return false;

    if (dispatch) {
      const tr = state.tr;
      for (const range of ranges) tr.addMark(range.$from.pos, range.$to.pos, type.create(attrs));
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}

/**
 * Command: removes marks of `type` from the selection.
 *
 * - Empty selection: removes the mark from the stored marks. Returns `false` if the mark is
 *   not in the stored marks / cursor marks.
 * - Non-empty selection: removes the mark from every range. Returns `false` if no range has the
 *   mark. The transaction scrolls into view.
 */
export function unsetMark(type: MarkType): Command {
  return (state, dispatch) => {
    const { empty, $from, ranges } = state.selection;
    if (empty) {
      if (!type.isInSet(state.storedMarks ?? $from.marks())) return false;
      dispatch?.(state.tr.removeStoredMark(type));
      return true;
    }

    const hasMark = ranges.some((range) =>
      state.doc.rangeHasMark(range.$from.pos, range.$to.pos, type),
    );
    if (!hasMark) return false;

    if (dispatch) {
      const tr = state.tr;
      for (const range of ranges) tr.removeMark(range.$from.pos, range.$to.pos, type);
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}

/**
 * Command: {@link unsetMark} when the mark is active (see `isMarkActive`), otherwise
 * {@link setMark}. Unlike `toggleMark` from prosemirror-commands, a partially marked selection
 * gets the mark added, consistently with `isActive`.
 */
export function toggleMark(type: MarkType, attrs: Attrs | null = null): Command {
  return (state, dispatch) =>
    isMarkActive(state, type, attrs ?? undefined)
      ? unsetMark(type)(state, dispatch)
      : setMark(type, attrs)(state, dispatch);
}
