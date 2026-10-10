import type { InputRule } from 'prosemirror-inputrules';
import type { Attrs, MarkType } from 'prosemirror-model';
import { notImplemented } from '../errors';

/**
 * Creates an input rule that turns markdown-like syntax into a mark.
 *
 * Contract for `regexp`: it ends with `$`; capture group 1 is the text to mark; the syntax
 * characters immediately around group 1 (e.g. `**`) are part of the match; an optional
 * leading context (e.g. `(?:^|[^*])`) may precede the syntax but must be a **non-capturing**
 * group that consumes at most one character.
 *
 * When the rule fires: the opening syntax, the text and the closing syntax are replaced by the
 * text with the mark added to the marks found at the start of the opening syntax; the leading
 * context character (if any) is left untouched; the mark is removed from the stored marks so
 * that typing continues unmarked. Returns `null` (rule does not apply) if group 1 is empty or
 * the parent node does not allow the mark.
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
  return notImplemented('markInputRule');
}
