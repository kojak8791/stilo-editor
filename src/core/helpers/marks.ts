import type { Attrs, Mark, MarkType, ResolvedPos } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import { isMarkActive } from './active';

/**
 * Whether one of `marks` (other than `type` itself) excludes marks of `type` one way. Marks that
 * exclude each other (subscript and superscript) replace each other instead.
 */
function isExcluded(marks: readonly Mark[], type: MarkType): boolean {
  return marks.some(
    (mark) => mark.type !== type && mark.type.excludes(type) && !type.excludes(mark.type),
  );
}

/**
 * Command: adds a mark of `type` with `attrs` to the selection. A mark that `type` excludes
 * and that excludes `type` is replaced (superscript becomes subscript).
 *
 * - Empty selection: adds the mark to the stored marks (applies to the next typed text).
 *   Returns `false` if the parent node does not allow the mark, or a mark at the cursor
 *   excludes it (e.g. bold inside code).
 * - Non-empty selection: adds the mark to every selection range. Returns `false` if no text in
 *   the selection accepts the mark (parent allows it, no existing mark excludes it). The
 *   transaction scrolls into view.
 */
export function setMark(type: MarkType, attrs: Attrs | null = null): Command {
  return (state, dispatch) => {
    const { empty, $from, ranges } = state.selection;
    if (empty) {
      const marks = state.storedMarks ?? $from.marks();
      if (!$from.parent.type.allowsMarkType(type) || isExcluded(marks, type)) return false;
      dispatch?.(state.tr.addStoredMark(type.create(attrs)));
      return true;
    }

    let applies = false;
    for (const range of ranges) {
      state.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, _pos, parent) => {
        applies ||=
          node.isText &&
          parent?.type.allowsMarkType(type) === true &&
          !isExcluded(node.marks, type);
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
 * Command: merges `attrs` into the mark of `type` on the selection, keeping its other
 * attributes; a mark whose attributes all become `null` is removed. Lets one mark carry several
 * independent attributes (`textStyle`: font family, size, color).
 *
 * - Setting (some value in `attrs` is not `null`): like {@link setMark}, applies to the stored
 *   marks or to every selected text that accepts the mark; `false` when none does.
 * - Clearing (every value is `null`): applies where the mark has one of these attributes;
 *   `false` when none has.
 *
 * `attrs` can be a function of the position of each selected text (the cursor for an empty
 * selection), for values that differ along the selection; `null` leaves that text alone.
 */
export function updateMarkAttrs(
  type: MarkType,
  attrs: Attrs | ((pos: number) => Attrs | null),
): Command {
  // The new mark for text at `pos` that carries `marks`, `null` to remove it, `undefined` to
  // leave the text alone.
  const next = (marks: readonly Mark[], pos: number): Mark | null | undefined => {
    const values = typeof attrs === 'function' ? attrs(pos) : attrs;
    if (!values || isExcluded(marks, type)) return undefined;
    const current = type.isInSet(marks);
    const setting = Object.values(values).some((value) => value !== null);
    if (!setting && !Object.keys(values).some((key) => current?.attrs[key] != null)) {
      return undefined;
    }
    const merged = { ...current?.attrs, ...values };
    return Object.values(merged).some((value) => value != null) ? type.create(merged) : null;
  };

  return (state, dispatch) => {
    const { empty, $from, ranges } = state.selection;
    if (empty) {
      const mark = $from.parent.type.allowsMarkType(type)
        ? next(state.storedMarks ?? $from.marks(), $from.pos)
        : undefined;
      if (mark === undefined) return false;
      dispatch?.(mark ? state.tr.addStoredMark(mark) : state.tr.removeStoredMark(type));
      return true;
    }

    const changes: Array<{ from: number; to: number; mark: Mark | null }> = [];
    for (const range of ranges) {
      const from = range.$from.pos;
      const to = range.$to.pos;
      state.doc.nodesBetween(from, to, (node, pos, parent) => {
        // Without dispatch, the first change answers: the toolbar asks on every selection.
        if (!dispatch && changes.length > 0) return false;
        if (!node.isText || !parent?.type.allowsMarkType(type)) return;
        const start = Math.max(pos, from);
        const mark = next(node.marks, start);
        if (mark === undefined) return;
        const end = Math.min(pos + node.nodeSize, to);
        // Adjacent text getting the same mark becomes one step.
        const last = changes[changes.length - 1];
        if (last?.to === start && (last.mark === mark || (last.mark && mark?.eq(last.mark)))) {
          last.to = end;
        } else {
          changes.push({ from: start, to: end, mark });
        }
      });
    }
    if (changes.length === 0) return false;

    if (dispatch) {
      const tr = state.tr;
      for (const { from, to, mark } of changes) {
        if (mark) tr.addMark(from, to, mark);
        else tr.removeMark(from, to, type);
      }
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

/**
 * The range of the mark of `type` at `$pos` (the one in `$pos.marks()`), extended over the
 * adjacent inline nodes that carry the same mark with the same attributes. `null` if there is no
 * such mark at `$pos`. Lets a command edit or remove a whole link with the cursor inside it.
 */
export function markRangeAt(
  $pos: ResolvedPos,
  type: MarkType,
): { from: number; to: number } | null {
  const mark = type.isInSet($pos.marks());
  if (!mark) return null;
  const { parent } = $pos;
  // Between two nodes, `marks()` reads the node before the position (if any).
  let start = $pos.textOffset === 0 && $pos.index() > 0 ? $pos.index() - 1 : $pos.index();
  let end = start + 1;
  while (start > 0 && mark.isInSet(parent.child(start - 1).marks)) start--;
  while (end < parent.childCount && mark.isInSet(parent.child(end).marks)) end++;
  let from = $pos.start();
  for (let i = 0; i < start; i++) from += parent.child(i).nodeSize;
  let to = from;
  for (let i = start; i < end; i++) to += parent.child(i).nodeSize;
  return { from, to };
}
