import DOMPurify, { type DOMPurify as Purifier } from 'dompurify';
import { sanitizeStyle } from './css';

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

/** Per-window DOMPurify cache, the only module-level mutable value. */
const purifiers = new WeakMap<Window, Purifier>();

/**
 * Extracts the lowercased URL scheme (`"https"` for `https://x`), or `null` for relative URLs
 * and fragments. Whitespace and control characters (U+0000–U+001F) are removed first, because
 * browsers ignore them inside schemes (`java\tscript:` is `javascript:`).
 */
export function urlScheme(url: string): string | null {
  const cleaned = [...url].filter((c) => !/\s/.test(c) && c.charCodeAt(0) >= 0x20).join('');
  const match = cleaned.match(/^([a-z][a-z0-9+.-]*):/i);
  return match ? match[1]!.toLowerCase() : null;
}

/** Whether a URL is allowed in `href`: relative, fragment, or scheme in {@link LINK_PROTOCOLS}. */
export function isAllowedHref(url: string): boolean {
  const scheme = urlScheme(url);
  if (scheme === null) return true;
  return LINK_PROTOCOLS.includes(scheme);
}

/**
 * Whether a URL is allowed in `img src`: non-empty relative URL, scheme in
 * {@link IMAGE_PROTOCOLS}, or a `data:` URL matching {@link IMAGE_DATA_URL}.
 */
export function isAllowedImageSrc(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (IMAGE_DATA_URL.test(trimmed)) return true;
  const scheme = urlScheme(trimmed);
  if (scheme === null) return true;
  return IMAGE_PROTOCOLS.includes(scheme);
}

/** Returns the DOMPurify instance for the global `window`, creating it once with hooks. */
function getPurifier(): Purifier {
  let purifier = purifiers.get(window);
  if (!purifier) {
    purifier = DOMPurify(window);
    purifier.addHook('uponSanitizeAttribute', (_node, data) => {
      const result = filterAttribute(data.attrName, data.attrValue);
      if (result === null) {
        data.keepAttr = false;
      } else {
        data.attrValue = result;
      }
    });
    purifiers.set(window, purifier);
  }
  return purifier;
}

/**
 * Filters an attribute value for sanitization. Returns `null` to remove the attribute,
 * otherwise the (possibly normalized) value to set.
 */
function filterAttribute(name: string, value: string): string | null {
  switch (name) {
    case 'style':
      return sanitizeStyle(value);
    case 'class': {
      const tokens = value.split(/\s+/).filter((t) => /^language-[\w-]+$/.test(t));
      return tokens.length ? tokens.join(' ') : null;
    }
    case 'href':
      return isAllowedHref(value.trim()) ? value.trim() : null;
    case 'src':
      return isAllowedImageSrc(value.trim()) ? value.trim() : null;
    case 'target':
      return value === '_blank' ? '_blank' : null;
    default:
      return value;
  }
}

/** DOMPurify configuration shared between both sanitize functions. */
function getConfig(): {
  ALLOWED_TAGS: string[];
  ALLOWED_ATTR: string[];
  ALLOW_DATA_ATTR: false;
} {
  return {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
    ALLOW_DATA_ATTR: false,
  };
}

/** Sanitizes HTML and returns it as a string. Used for paste (`transformPastedHTML`). */
export function sanitizeToString(html: string): string {
  return getPurifier().sanitize(html, getConfig());
}

/**
 * Sanitizes HTML and returns a detached `<body>` element (DOMPurify `RETURN_DOM: true`), which
 * avoids a serialize/parse round trip. Used by `parseHTML`.
 */
export function sanitizeToDOM(html: string): HTMLElement {
  return getPurifier().sanitize(html, { ...getConfig(), RETURN_DOM: true }) as HTMLElement;
}
