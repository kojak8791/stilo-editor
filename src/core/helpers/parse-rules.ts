import type { StyleParseRule } from 'prosemirror-model';

/**
 * Parse rules that match a `text-decoration` / `text-decoration-line` style containing
 * `keyword` (e.g. `underline`). Both properties are listed because ProseMirror reads only the
 * properties named in rules. The rules are not consuming, so several marks can match one
 * declaration (`text-decoration: underline line-through`).
 */
export function textDecorationRules(keyword: string): StyleParseRule[] {
  return ['text-decoration', 'text-decoration-line'].map((style) => ({
    style,
    consuming: false,
    getAttrs: (value: string) => value.split(/\s+/).includes(keyword) && null,
  }));
}
