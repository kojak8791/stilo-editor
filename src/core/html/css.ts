import { notImplemented } from '../errors';

/**
 * Inline style handling: allowlist, parsing, normalization and building of `style` strings.
 * See docs/ARCHITECTURE.md §7.3. Extensions never handle raw style strings themselves.
 */

/** CSS properties allowed in the HTML output, in output order. */
export const STYLE_PROPERTIES = [
  'font-family',
  'font-size',
  'color',
  'background-color',
  'text-align',
] as const;

/** A property allowed in the HTML output. */
export type StyleProperty = (typeof STYLE_PROPERTIES)[number];

/**
 * Properties accepted on input only: parse rules read them (e.g. `font-weight` → bold), but they
 * never appear in the output.
 */
export const INPUT_ONLY_STYLE_PROPERTIES = [
  'font-weight',
  'font-style',
  'text-decoration',
  'text-decoration-line',
  'vertical-align',
] as const;

/** CSS-wide keywords rejected as color values. */
export const CSS_WIDE_KEYWORDS: readonly string[] = [
  'inherit',
  'initial',
  'unset',
  'revert',
  'currentcolor',
];

/**
 * Values containing any of these are always rejected: `url(`, `expression(` (case-insensitive,
 * optional spaces before `(`), `javascript:`, and the characters `<`, `>`, `{`, `}`, `\`.
 */
export const UNSAFE_VALUE = /url\s*\(|expression\s*\(|javascript:|[<>{}\\]/i;

/**
 * Parses a `style` attribute into a map of property → value.
 *
 * - Declarations are separated by `;`; property and value by the first `:`.
 * - Properties are trimmed and lowercased; values are trimmed and `!important` is removed.
 * - Declarations without `:` or with an empty property/value are skipped.
 * - When a property appears twice, the last one wins.
 */
export function parseStyle(style: string): Map<string, string> {
  return notImplemented('parseStyle');
}

/**
 * Normalizes a color value (input is trimmed and lowercased first):
 *
 * - `#rgb` → `#rrggbb`; `#rrggbb` kept (lowercase).
 * - `rgb(r, g, b)` (channels 0–255, any spacing) → `#rrggbb`.
 * - `rgba(r, g, b, a)` with `a` = 1 (or 100%) → `#rrggbb`; with 0 ≤ `a` < 1 →
 *   `rgba(r, g, b, a)` with `, ` separators and `a` rounded to 3 decimals.
 * - A keyword matching `^[a-z]{3,20}$` is kept, unless it is in {@link CSS_WIDE_KEYWORDS}.
 * - Anything else (channel > 255, alpha out of range, other formats) → `null`.
 */
export function normalizeColor(value: string): string | null {
  return notImplemented('normalizeColor');
}

/**
 * Normalizes a font size: trimmed and lowercased, it must match
 * `^\d+(\.\d+)?(px|pt|em|rem|%)$`, otherwise `null`.
 */
export function normalizeFontSize(value: string): string | null {
  return notImplemented('normalizeFontSize');
}

/**
 * Normalizes a font family list:
 *
 * - split by `,`; each name trimmed, surrounding `"` or `'` removed, inner whitespace collapsed;
 * - empty names and names containing `"`, `'`, `<`, `>`, `;` are dropped;
 * - names made only of letters, digits and `-` stay unquoted, others are wrapped in `'`;
 * - joined with `, `. Returns `null` if no name remains.
 *
 * Example: `"Times New Roman" ,serif` → `'Times New Roman', serif`.
 */
export function normalizeFontFamily(value: string): string | null {
  return notImplemented('normalizeFontFamily');
}

/**
 * Normalizes `text-align` (trimmed, lowercased): `left`, `center`, `right`, `justify` kept;
 * `start` → `left`; anything else → `null`.
 */
export function normalizeTextAlign(value: string): string | null {
  return notImplemented('normalizeTextAlign');
}

/**
 * Normalizes the value of an output property with the matching normalizer above.
 * Returns `null` if the value matches {@link UNSAFE_VALUE} or the normalizer returns `null`.
 */
export function normalizeStyleValue(property: StyleProperty, value: string): string | null {
  return notImplemented('normalizeStyleValue');
}

/**
 * Builds a canonical `style` string: only {@link STYLE_PROPERTIES}, in that order, values
 * normalized with {@link normalizeStyleValue} (invalid ones skipped), formatted as
 * `prop: value` joined with `; ` and no trailing `;`. `null`/`undefined` values are skipped.
 * Returns `null` if nothing remains.
 *
 * Example: `{ color: 'RGB(255,0,0)', 'font-size': '12PT' }` → `font-size: 12pt; color: #ff0000`.
 */
export function buildStyle(
  values: Partial<Record<StyleProperty, string | null | undefined>>,
): string | null {
  return notImplemented('buildStyle');
}

/**
 * Reads one output property from an element's `style` attribute (via {@link parseStyle}) and
 * normalizes it (via {@link normalizeStyleValue}). Returns `null` if absent or invalid.
 * Use this in parse rules (`getAttrs`).
 */
export function readStyle(element: HTMLElement, property: StyleProperty): string | null {
  return notImplemented('readStyle');
}

/**
 * Filters a `style` attribute for sanitization:
 *
 * 1. the output properties, normalized, in {@link STYLE_PROPERTIES} order (invalid dropped);
 * 2. then the {@link INPUT_ONLY_STYLE_PROPERTIES}, in that order, kept only if the value matches
 *    `^[a-z0-9 .,%#()-]+$` (case-insensitive) and not {@link UNSAFE_VALUE}; value lowercased.
 *
 * Formatted like {@link buildStyle}. Returns `null` if nothing remains.
 */
export function sanitizeStyle(style: string): string | null {
  return notImplemented('sanitizeStyle');
}
