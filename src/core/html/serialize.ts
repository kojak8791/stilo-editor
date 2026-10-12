import { DOMSerializer, type Fragment, type Schema } from 'prosemirror-model';
import { sanitizeStyle } from './css';

/** Options of {@link serializeHTML}. */
export interface SerializeOptions {
  /** Unwrap the single paragraph of list items. Default: `true`. */
  compactParagraphs?: boolean;
}

/** Containers whose single paragraph is unwrapped by `compactParagraphs`. */
const COMPACT_CONTAINERS = ['li'];

/**
 * Canonical post-processing of serialized HTML, in place (docs/ARCHITECTURE.md §8.1): styles
 * rewritten with `sanitizeStyle`, and with `compactParagraphs` (default) the single paragraph of
 * list items unwrapped (docs/decisions/0001).
 */
export function canonicalizeDOM(
  root: Element | DocumentFragment,
  options?: SerializeOptions,
): void {
  for (const element of root.querySelectorAll('[style]')) {
    const style = sanitizeStyle(element.getAttribute('style') ?? '');
    if (style) element.setAttribute('style', style);
    else element.removeAttribute('style');
  }
  if (options?.compactParagraphs ?? true) {
    const selector = COMPACT_CONTAINERS.map((tag) => `${tag} > p:only-child`).join(', ');
    for (const paragraph of root.querySelectorAll(selector)) {
      if (paragraph.attributes.length === 0) paragraph.replaceWith(...paragraph.childNodes);
    }
  }
}

/**
 * Serializes a fragment (usually `doc.content`) to a canonical HTML string
 * (docs/ARCHITECTURE.md §7): `DOMSerializer.fromSchema(schema).serializeFragment()` into a
 * container element of a detached document (`document.implementation.createHTMLDocument('')`),
 * then the container's `innerHTML`. Before that:
 *
 * - every `style` attribute is rewritten with `sanitizeStyle`: ProseMirror sets styles through
 *   `style.cssText`, and the browser re-serializes them (trailing `;`, `rgb()` colors);
 * - with `compactParagraphs` (default), a `<p>` without attributes that is the only child of a
 *   {@link COMPACT_CONTAINERS} element is replaced by its content (docs/decisions/0001).
 *
 * Post-processing is now handled by {@link canonicalizeDOM}.
 */
export function serializeHTML(
  schema: Schema,
  fragment: Fragment,
  options: SerializeOptions = {},
): string {
  const doc = document.implementation.createHTMLDocument('');
  const container = doc.createElement('div');
  container.append(DOMSerializer.fromSchema(schema).serializeFragment(fragment, { document: doc }));
  canonicalizeDOM(container, options);
  return container.innerHTML;
}

/**
 * A `DOMSerializer` for the clipboard (`clipboardSerializer` prop): same output as
 * `DOMSerializer.fromSchema(schema)`, post-processed with `canonicalizeDOM`.
 */
export function createClipboardSerializer(
  schema: Schema,
  options?: SerializeOptions,
): DOMSerializer {
  const base = DOMSerializer.fromSchema(schema);
  return new (class extends DOMSerializer {
    constructor() {
      super(base.nodes, base.marks);
    }
    override serializeFragment(
      fragment: Fragment,
      _options?: Record<string, unknown>,
      target?: DocumentFragment | HTMLElement,
    ): DocumentFragment | HTMLElement {
      const result = super.serializeFragment(fragment, _options, target);
      if (target === undefined) canonicalizeDOM(result, options);
      return result;
    }
  })();
}
