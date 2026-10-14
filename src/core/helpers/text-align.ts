import type { DOMOutputSpec, Node } from 'prosemirror-model';
import { buildStyle, readStyle } from '../html/css';

/** A text alignment (docs/SPEC.md F-308). `left` is the default and is stored as `null`. */
export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

/** The `textAlign` attribute of a textblock spec (`paragraph`, `heading`). */
export function textAlignAttr(): { textAlign: { default: null } } {
  return { textAlign: { default: null } };
}

/** The `textAlign` of a parsed block: its `text-align` style, `null` for left or none. */
export function parseTextAlign(element: HTMLElement): string | null {
  const value = readStyle(element, 'text-align');
  return value === 'left' ? null : value;
}

/** The `toDOM` output of a textblock `tag` with `textAlign`: `style="text-align: x"` if set. */
export function textAlignDOM(tag: string, node: Node): DOMOutputSpec {
  const style = buildStyle({ 'text-align': node.attrs.textAlign });
  return style ? [tag, { style }, 0] : [tag, 0];
}
