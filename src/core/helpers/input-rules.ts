import { InputRule } from 'prosemirror-inputrules';
import type { Attrs, MarkType, NodeType } from 'prosemirror-model';
import { keptBlockStyles } from './block-style';

/**
 * Creates an input rule that turns markdown-like syntax into a mark.
 *
 * Contract for `regexp`: it ends with `$`; capture group 1 is the text to mark; the syntax
 * characters immediately around group 1 (e.g. `**`) are part of the match, and the opening and
 * closing syntax have the same length; an optional leading context (e.g. `(?:^|[^*])`) may
 * precede the syntax but must be a **non-capturing** group that consumes at most one character.
 *
 * When the rule fires: the opening and closing syntax are deleted and the mark is added to the
 * text (its other marks are kept); the leading context character (if any) is left untouched;
 * the mark is removed from the stored marks so that typing continues unmarked. Returns `null`
 * (rule does not apply) if group 1 is empty or the parent node does not allow the mark.
 *
 * ```ts
 * markInputRule(/(?:^|[^*])(\*\*([^*]+)\*\*)$/, schema.marks.bold!) // NOT this: group 1 = text
 * markInputRule(/(?:^|[^*])\*\*([^*]+)\*\*$/, schema.marks.bold!)   // correct
 * ```
 */
export function markInputRule(
  regexp: RegExp,
  type: MarkType,
  attrs: Attrs | null = null,
): InputRule {
  // The `d` flag provides the position of group 1 inside the match.
  const withIndices = regexp.hasIndices ? regexp : new RegExp(regexp.source, `${regexp.flags}d`);
  return new InputRule(withIndices, (state, match, start, end) => {
    const matchRange = match.indices?.[0];
    const textRange = match.indices?.[1];
    const text = match[1];
    if (!matchRange || !textRange || !text) return null;

    const textStart = start + textRange[0] - matchRange[0];
    const textEnd = textStart + text.length;
    // The last closing character is the one being typed: it is not in the document yet.
    const syntaxLength = matchRange[1] - textRange[1];
    const openStart = textStart - syntaxLength;
    if (!state.doc.resolve(openStart).parent.type.allowsMarkType(type)) return null;

    return state.tr
      .delete(textEnd, end)
      .addMark(textStart, textEnd, type.create(attrs))
      .delete(openStart, textStart)
      .removeStoredMark(type);
  });
}

/**
 * Like `textblockTypeInputRule` from prosemirror-inputrules (turns the textblock where `regexp`
 * matches at its start into `type` with `attrs`, or with the attributes `attrs` returns for the
 * match), but the block keeps the style attributes (`textAlign`, `lineHeight`) that `type` also
 * has, as `setTextblockType` does.
 */
export function textblockTypeInputRule(
  regexp: RegExp,
  type: NodeType,
  attrs: Attrs | null | ((match: RegExpMatchArray) => Attrs | null) = null,
): InputRule {
  return new InputRule(regexp, (state, match, start, end) => {
    const $start = state.doc.resolve(start);
    if (!$start.node(-1).canReplaceWith($start.index(-1), $start.indexAfter(-1), type)) {
      return null;
    }
    const styles = keptBlockStyles(type, $start.parent);
    const typeAttrs = typeof attrs === 'function' ? attrs(match) : attrs;
    return state.tr
      .delete(start, end)
      .setBlockType(start, start, type, { ...typeAttrs, ...styles });
  });
}
