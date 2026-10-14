import type { Editor } from '../../core/editor';

/**
 * The unit of a font size control: the number it shows and the unit it writes. `rem` shows px
 * and writes rem, so the text follows the base size of the page that displays it.
 */
export type FontSizeUnit = 'pt' | 'px' | 'rem';

/** The smallest and largest font size a step reaches, in the unit of the control. */
const MIN_SIZE = 1;
const MAX_SIZE = 400;

/** The browsers' default font size, used where nothing can be measured (no layout). */
const DEFAULT_PX = 16;

/** A CSS length in px when it is in px, pt or (with `rootPx`) rem, otherwise `null`. */
function toPx(value: string, rootPx = DEFAULT_PX): number | null {
  const match = /^(\d+(?:\.\d+)?)(px|pt|rem)$/.exec(value);
  if (!match) return null;
  const factor = { px: 1, pt: 4 / 3, rem: rootPx }[match[2] as 'px' | 'pt' | 'rem'];
  return Number(match[1]) * factor;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** `px` in `unit`, rounded to one decimal (`rem` shows px). */
function inUnit(px: number, unit: FontSizeUnit): number {
  return round(unit === 'pt' ? px * 0.75 : px, 1);
}

/** The computed font size of the document root in px: the base of `rem`. */
function rootFontSize(editor: Editor): number {
  const root = editor.view.dom.ownerDocument.documentElement;
  return toPx(getComputedStyle(root).fontSize) ?? DEFAULT_PX;
}

/** The rendered font size in px of the text at `pos`. */
function renderedPx(editor: Editor, pos: number): number {
  const { node, offset } = editor.view.domAtPos(pos, 1);
  const target = node.nodeType === Node.TEXT_NODE ? node : (node.childNodes[offset] ?? node);
  const element = target instanceof Element ? target : target.parentElement;
  return (element && toPx(getComputedStyle(element).fontSize)) || DEFAULT_PX;
}

/**
 * The font size of the text at `pos` in `unit`, rounded to one decimal: the size the browser
 * renders, so it includes headings, `em` and the page's own base size. Without `pos`, the size
 * at the start of the selection; for an empty selection, the size stored for the next typed text
 * when there is one (the page does not show it yet). Where nothing can be measured (no layout, as
 * in jsdom) it counts 16px (12pt).
 */
export function getFontSize(editor: Editor, unit: FontSizeUnit = 'pt', pos?: number): number {
  const { selection, storedMarks } = editor.state;
  const stored =
    pos === undefined && selection.empty
      ? storedMarks?.find((mark) => mark.type.name === 'textStyle')?.attrs.fontSize
      : null;
  const px =
    (typeof stored === 'string' && toPx(stored, rootFontSize(editor))) ||
    renderedPx(editor, pos ?? selection.from);
  return inUnit(px, unit);
}

/** The CSS font size for `value` in `unit`: `12` → `12pt`; for `rem`, px divided by the base. */
export function toFontSize(editor: Editor, value: number, unit: FontSizeUnit = 'pt'): string {
  return unit === 'rem'
    ? `${round(value / rootFontSize(editor), 4)}rem`
    : `${round(value, 2)}${unit}`;
}

/**
 * The size after a step of `delta` from `size`: up to the next whole number, or down to the
 * previous one (`13.5` + 1 → `14`), kept between 1 and 400.
 */
export function stepFontSizeValue(size: number, delta: number): number {
  const next = delta > 0 ? Math.floor(size) + delta : Math.ceil(size) + delta;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, next));
}
