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
  const result = new Map<string, string>();
  const declarations = style.split(';');
  for (const decl of declarations) {
    const colonIndex = decl.indexOf(':');
    if (colonIndex <= 0) continue;
    const prop = decl.slice(0, colonIndex).trim().toLowerCase();
    if (!prop) continue;
    let value = decl.slice(colonIndex + 1).trim();
    if (!value) continue;
    value = value.replace(/!important/g, '').trim();
    if (!value) continue;
    result.set(prop, value);
  }
  return result;
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
  const v = value.trim().toLowerCase();
  // Short hex: #rgb → #rrggbb
  const hex3 = v.match(/^#([0-9a-f]{3})$/);
  if (hex3) {
    const d = hex3[1]!;
    return `#${d[0]!}${d[0]!}${d[1]!}${d[1]!}${d[2]!}${d[2]!}`;
  }

  // Long hex: #rrggbb → unchanged
  const hex6 = v.match(/^#([0-9a-f]{6})$/);
  if (hex6) {
    return hex6[0]!;
  }

  // rgb(r, g, b) → #rrggbb
  const rgb = v.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (rgb) {
    const r = Number(rgb[1]!);
    const g = Number(rgb[2]!);
    const b = Number(rgb[3]!);
    if (r > 255 || g > 255 || b > 255) return null;
    return (
      `#${r.toString(16).padStart(2, '0')}` +
      `${g.toString(16).padStart(2, '0')}` +
      `${b.toString(16).padStart(2, '0')}`
    );
  }

  // rgba(r, g, b, a)
  const rgba = v.match(
    /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d+(?:\.\d+)?%|\d+(?:\.\d+)?)\s*\)$/,
  );
  if (rgba) {
    const r = Number(rgba[1]!);
    const g = Number(rgba[2]!);
    const b = Number(rgba[3]!);
    if (r > 255 || g > 255 || b > 255) return null;

    const aStr = rgba[4]!;
    let a: number;
    if (aStr.endsWith('%')) {
      a = Number(aStr.slice(0, -1)) / 100;
    } else {
      a = Number(aStr);
    }

    if (a > 1) return null;
    if (a === 1) {
      return (
        `#${r.toString(16).padStart(2, '0')}` +
        `${g.toString(16).padStart(2, '0')}` +
        `${b.toString(16).padStart(2, '0')}`
      );
    }

    const A = String(Math.round(a * 1000) / 1000);
    return `rgba(${r}, ${g}, ${b}, ${A})`;
  }

  // Keyword: ^[a-z]{3,20}$ not in CSS_WIDE_KEYWORDS
  if (/^[a-z]{3,20}$/.test(v)) {
    if (CSS_WIDE_KEYWORDS.includes(v)) return null;
    return v;
  }

  return null;
}

/**
 * Normalizes a font size: trimmed and lowercased, it must match
 * `^\d+(\.\d+)?(px|pt|em|rem|%)$`, otherwise `null`.
 */
export function normalizeFontSize(value: string): string | null {
  const v = value.trim().toLowerCase();
  const match = v.match(/^(\d+(\.\d+)?)(px|pt|em|rem|%)$/);
  if (!match) return null;
  return match[1]! + match[3]!;
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
  const names = value.split(',');
  const result: string[] = [];

  for (const raw of names) {
    let name = raw.trim();
    // Remove surrounding quotes if the name starts and ends with the same quote char
    if (name.length >= 2) {
      const first = name[0];
      const last = name[name.length - 1];
      if ((first === '"' || first === "'") && first === last) {
        name = name.slice(1, -1).trim();
      }
    }
    // Collapse inner whitespace runs to a single space
    name = name.replace(/\s+/g, ' ');
    // Drop empty names
    if (!name) continue;
    // Drop names with forbidden characters
    if (/[<>"';]/.test(name)) continue;
    // Unquoted if only letters, digits, hyphens; otherwise wrap in single quotes
    if (/^[A-Za-z0-9-]+$/.test(name)) {
      result.push(name);
    } else {
      result.push(`'${name}'`);
    }
  }

  if (result.length === 0) return null;
  return result.join(', ');
}

/**
 * Normalizes `text-align` (trimmed, lowercased): `left`, `center`, `right`, `justify` kept;
 * `start` → `left`; anything else → `null`.
 */
export function normalizeTextAlign(value: string): string | null {
  const v = value.trim().toLowerCase();
  switch (v) {
    case 'left':
      return 'left';
    case 'center':
      return 'center';
    case 'right':
      return 'right';
    case 'justify':
      return 'justify';
    case 'start':
      return 'left';
    default:
      return null;
  }
}

/**
 * Normalizes the value of an output property with the matching normalizer above.
 * Returns `null` if the value matches {@link UNSAFE_VALUE} or the normalizer returns `null`.
 */
export function normalizeStyleValue(property: StyleProperty, value: string): string | null {
  // Test UNSAFE_VALUE against the raw value first
  if (UNSAFE_VALUE.test(value)) return null;

  switch (property) {
    case 'color':
    case 'background-color':
      return normalizeColor(value);
    case 'font-size':
      return normalizeFontSize(value);
    case 'font-family':
      return normalizeFontFamily(value);
    case 'text-align':
      return normalizeTextAlign(value);
  }

  return null;
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
  const parts: string[] = [];

  for (const prop of STYLE_PROPERTIES) {
    const raw = values[prop];
    if (raw == null) continue;
    const normalized = normalizeStyleValue(prop, raw);
    if (normalized == null) continue;
    parts.push(`${prop}: ${normalized}`);
  }

  return parts.length === 0 ? null : parts.join('; ');
}

/**
 * Reads one output property from an element's `style` attribute (via {@link parseStyle}) and
 * normalizes it (via {@link normalizeStyleValue}). Returns `null` if absent or invalid.
 * Use this in parse rules (`getAttrs`).
 */
export function readStyle(element: HTMLElement, property: StyleProperty): string | null {
  const raw = element.getAttribute('style');
  if (!raw) return null;
  const parsed = parseStyle(raw);
  const value = parsed.get(property);
  if (value == null) return null;
  return normalizeStyleValue(property, value);
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
  const parsed = parseStyle(style);
  const parts: string[] = [];

  // Output properties first, in STYLE_PROPERTIES order
  for (const prop of STYLE_PROPERTIES) {
    const value = parsed.get(prop);
    if (value == null) continue;
    const normalized = normalizeStyleValue(prop, value);
    if (normalized == null) continue;
    parts.push(`${prop}: ${normalized}`);
  }

  // Input-only properties, in INPUT_ONLY_STYLE_PROPERTIES order
  for (const prop of INPUT_ONLY_STYLE_PROPERTIES) {
    const value = parsed.get(prop);
    if (value == null) continue;
    const lowerValue = value.toLowerCase();
    if (/^[a-z0-9 .,%#()-]+$/.test(lowerValue) && !UNSAFE_VALUE.test(lowerValue)) {
      parts.push(`${prop}: ${lowerValue}`);
    }
  }

  return parts.length === 0 ? null : parts.join('; ');
}
