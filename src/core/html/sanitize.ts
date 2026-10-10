import { notImplemented } from '../errors';

/**
 * HTML sanitization with DOMPurify. See docs/ARCHITECTURE.md §8 and docs/SPEC.md NFR-2.
 *
 * Implementation requirements:
 *
 * - Use a **Stilo-owned DOMPurify instance**, created lazily with `DOMPurify(window)` and cached
 *   per `window` (WeakMap). Never add hooks to the default DOMPurify export: it may be shared
 *   with the host application. No DOM access at module top level.
 * - Config: `ALLOWED_TAGS`, `ALLOWED_ATTR` below, `ALLOW_DATA_ATTR: false`. Unknown tags are
 *   unwrapped with their content kept (DOMPurify default).
 * - One `uponSanitizeAttribute` hook filters attribute values; when the filter returns `null`
 *   the attribute is removed (`keepAttr = false`), otherwise `attrValue` is replaced:
 *   - `style` → `sanitizeStyle(value)` from `./css`;
 *   - `class` → only tokens matching `^language-[\w-]+$`, joined with a space;
 *   - `href` → kept (trimmed) if {@link isAllowedHref};
 *   - `src` → kept (trimmed) if {@link isAllowedImageSrc};
 *   - `target` → kept only if exactly `_blank`;
 *   - any other allowed attribute → unchanged.
 */

/** Tags kept by the sanitizer. */
export const ALLOWED_TAGS: readonly string[] = [
  'p',
  'div',
  'span',
  'br',
  'hr',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'code',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'colgroup',
  'col',
  'img',
  'figure',
  'figcaption',
  'a',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'strike',
  'sub',
  'sup',
  'mark',
  'font',
];

/** Attributes kept by the sanitizer (values further filtered by the hook). */
export const ALLOWED_ATTR: readonly string[] = [
  'href',
  'target',
  'rel',
  'title',
  'src',
  'alt',
  'width',
  'height',
  'start',
  'colspan',
  'rowspan',
  'style',
  'class',
  'data-type',
  'data-checked',
  'data-colwidth',
  'face',
  'size',
  'color',
];

/** Schemes allowed in `href`. */
export const LINK_PROTOCOLS: readonly string[] = ['http', 'https', 'mailto', 'tel'];

/** Schemes allowed in `img src` (besides the data URLs matched by {@link IMAGE_DATA_URL}). */
export const IMAGE_PROTOCOLS: readonly string[] = ['http', 'https'];

/** Image data URLs allowed in `img src`. No SVG. */
export const IMAGE_DATA_URL = /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i;

/**
 * Extracts the lowercased URL scheme (`"https"` for `https://x`), or `null` for relative URLs
 * and fragments. Whitespace and control characters (U+0000–U+001F) are removed first, because
 * browsers ignore them inside schemes (`java\tscript:` is `javascript:`).
 */
export function urlScheme(url: string): string | null {
  return notImplemented('urlScheme');
}

/** Whether a URL is allowed in `href`: relative, fragment, or scheme in {@link LINK_PROTOCOLS}. */
export function isAllowedHref(url: string): boolean {
  return notImplemented('isAllowedHref');
}

/**
 * Whether a URL is allowed in `img src`: non-empty relative URL, scheme in
 * {@link IMAGE_PROTOCOLS}, or a `data:` URL matching {@link IMAGE_DATA_URL}.
 */
export function isAllowedImageSrc(url: string): boolean {
  return notImplemented('isAllowedImageSrc');
}

/** Sanitizes HTML and returns it as a string. Used for paste (`transformPastedHTML`). */
export function sanitizeToString(html: string): string {
  return notImplemented('sanitizeToString');
}

/**
 * Sanitizes HTML and returns a detached `<body>` element (DOMPurify `RETURN_DOM: true`), which
 * avoids a serialize/parse round trip. Used by `parseHTML`.
 */
export function sanitizeToDOM(html: string): HTMLElement {
  return notImplemented('sanitizeToDOM');
}
