import type { Attrs, DOMOutputSpec, Node } from 'prosemirror-model';
import { buildStyle, readStyle } from '../html/css';

/** A text alignment (docs/SPEC.md F-308). `left` is the default and is stored as `null`. */
export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

/** The style attributes of a textblock (`paragraph`, `heading`): alignment and line height. */
export const BLOCK_STYLE_ATTRS = ['textAlign', 'lineHeight'] as const;

/** The `textAlign` and `lineHeight` attributes of a textblock spec, both `null` by default. */
export function blockStyleAttrs(): { textAlign: { default: null }; lineHeight: { default: null } } {
  return { textAlign: { default: null }, lineHeight: { default: null } };
}

/**
 * The style attributes of a parsed block: its `text-align` (`null` for left) and `line-height`.
 * `null` when it has neither, so the block keeps the shared default attributes: one object per
 * paragraph is a lot of memory in a large document.
 */
export function parseBlockStyle(element: HTMLElement): Attrs | null {
  const align = readStyle(element, 'text-align');
  const textAlign = align === 'left' ? null : align;
  const lineHeight = readStyle(element, 'line-height');
  return textAlign || lineHeight ? { textAlign, lineHeight } : null;
}

/** The `toDOM` output of a textblock `tag` with its style attributes, if any. */
export function blockStyleDOM(tag: string, node: Node): DOMOutputSpec {
  const style = buildStyle({
    'text-align': node.attrs.textAlign,
    'line-height': node.attrs.lineHeight,
  });
  return style ? [tag, { style }, 0] : [tag, 0];
}
