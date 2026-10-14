import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { updateMarkAttrs } from '../../core/helpers/marks';
import { buildStyle, normalizeStyleValue, readStyle } from '../../core/html/css';
import { type FontSizeUnit, getFontSize, stepFontSizeValue, toFontSize } from './font-size';

declare module '../../core/types' {
  interface Commands {
    /** Colors the selection. Returns `false` when `color` is not a valid CSS color. */
    setColor: (color: string) => Command;
    /** Removes the text color from the selection. */
    unsetColor: () => Command;
    /** Sets the font family list of the selection. Returns `false` when no name is valid. */
    setFontFamily: (fontFamily: string) => Command;
    /** Removes the font family from the selection. */
    unsetFontFamily: () => Command;
    /** Sets the font size of the selection (`px`, `pt`, `em`, `rem`, `%`); `false` if invalid. */
    setFontSize: (fontSize: string) => Command;
    /** Removes the font size from the selection. */
    unsetFontSize: () => Command;
    /**
     * Changes the font size of each selected part (or of the next typed text) from the size it
     * has on the page to the next whole number in `unit` (`delta` 1) or the previous one (`-1`),
     * between 1 and 400. Default unit `pt`.
     */
    stepFontSize: (delta: number, unit?: FontSizeUnit) => Command;
  }
}

type TextStyleAttr = 'fontFamily' | 'fontSize' | 'color';

/** The CSS property and the `<font>` attribute of each `textStyle` attribute. */
const SOURCES = {
  fontFamily: { property: 'font-family', font: 'face' },
  fontSize: { property: 'font-size', font: 'size' },
  color: { property: 'color', font: 'color' },
} as const;

/** `<font size="1…7">` as CSS sizes (the browsers' `x-small` … `xxx-large`). */
const FONT_SIZES = ['10px', '13px', '16px', '18px', '24px', '32px', '48px'];

/** The value of `attr` written on `element` itself: its style, then the `<font>` attribute. */
function ownValue(element: HTMLElement, attr: TextStyleAttr): string | null {
  const { property, font } = SOURCES[attr];
  const value = readStyle(element, property);
  if (value || element.tagName !== 'FONT') return value;
  const raw = element.getAttribute(font)?.trim();
  if (!raw) return null;
  if (attr !== 'fontSize') return normalizeStyleValue(property, raw);
  return /^[1-7]$/.test(raw) ? FONT_SIZES[Number(raw) - 1]! : null;
}

/**
 * The `textStyle` attributes of a `<span>` or `<font>`, `false` (no mark) when none is valid.
 * The mark excludes itself, so the innermost element wins: it also takes the values of the
 * enclosing ones, as CSS inheritance does (`<span style="font-family: x"><span style="color:
 * red">` keeps the font).
 */
function textStyleAttrs(element: HTMLElement): Record<TextStyleAttr, string | null> | false {
  const attrs: Record<TextStyleAttr, string | null> = {
    fontFamily: null,
    fontSize: null,
    color: null,
  };
  for (let el: HTMLElement | null = element; el; el = el.parentElement) {
    if (el.tagName !== 'SPAN' && el.tagName !== 'FONT') continue;
    for (const attr of Object.keys(SOURCES) as TextStyleAttr[]) {
      attrs[attr] ??= ownValue(el, attr);
    }
  }
  return Object.values(attrs).some((value) => value !== null) && attrs;
}

/**
 * The `textStyle` mark (`<span style="font-family: x; font-size: y; color: z">`), docs/SPEC.md
 * F-208, F-210, F-211. Also parsed from `<font face size color>`.
 */
export const TextStyle = defineExtension({
  name: 'textStyle',
  priority: 101,
  marks: () => ({
    textStyle: {
      attrs: {
        fontFamily: { default: null },
        fontSize: { default: null },
        color: { default: null },
      },
      parseDOM: [
        { tag: 'span[style]', getAttrs: textStyleAttrs },
        { tag: 'font', getAttrs: textStyleAttrs },
      ],
      group: 'formatting',
      toDOM: (mark) => [
        'span',
        {
          style: buildStyle({
            'font-family': mark.attrs.fontFamily,
            'font-size': mark.attrs.fontSize,
            color: mark.attrs.color,
          }),
        },
        0,
      ],
    },
  }),
  commands: ({ schema, editor }) => {
    const type = schema.marks.textStyle!;
    const set =
      (attr: TextStyleAttr) =>
      (value: string): Command => {
        const normalized = normalizeStyleValue(SOURCES[attr].property, value);
        return normalized ? updateMarkAttrs(type, { [attr]: normalized }) : () => false;
      };
    const unset = (attr: TextStyleAttr) => (): Command => updateMarkAttrs(type, { [attr]: null });
    return {
      setColor: set('color'),
      unsetColor: unset('color'),
      setFontFamily: set('fontFamily'),
      unsetFontFamily: unset('fontFamily'),
      setFontSize: set('fontSize'),
      unsetFontSize: unset('fontSize'),
      stepFontSize:
        (delta, unit = 'pt') =>
        (state, dispatch) =>
          updateMarkAttrs(type, (pos) => {
            // An empty selection starts from the size stored for the next typed text, if any.
            const start = getFontSize(editor, unit, state.selection.empty ? undefined : pos);
            return { fontSize: toFontSize(editor, stepFontSizeValue(start, delta), unit) };
          })(state, dispatch),
    };
  },
});

export { type FontSizeUnit, getFontSize, toFontSize } from './font-size';
