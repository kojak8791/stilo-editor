import type { Attrs, MarkType } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import { notImplemented } from '../errors';

/**
 * Command: adds a mark of `type` with `attrs` to the selection.
 *
 * - Empty selection: adds the mark to the stored marks (applies to the next typed text).
 *   Returns `false` if the parent node does not allow the mark.
 * - Non-empty selection: adds the mark to every selection range. Returns `false` if no text in
 *   the selection allows the mark. The transaction scrolls into view.
 */
export function setMark(type: MarkType, attrs: Attrs | null = null): Command {
  return notImplemented('setMark');
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
  return notImplemented('unsetMark');
}
