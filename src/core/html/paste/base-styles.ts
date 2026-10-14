import { formatStyle, normalizeStyleValue, parseStyle, type StyleProperty } from '../css';

/** Properties that word processors write on every run of text. */
const BASE_PROPERTIES: readonly StyleProperty[] = [
  'font-family',
  'font-size',
  'color',
  'line-height',
];

const HEADINGS = 'h1, h2, h3, h4, h5, h6';

/**
 * Removes the base style of a document pasted from a word processor: for each of
 * {@link BASE_PROPERTIES}, the value that covers most of the pasted text (Arial, 11pt, black)
 * is removed everywhere, so only the text that differs keeps its value. `font-size` is also
 * removed inside headings, whose level gives the size.
 */
export function removeBaseStyles(body: HTMLElement): void {
  const styled = new Map<Element, Map<string, string>>();
  for (const element of body.querySelectorAll('[style]')) {
    styled.set(element, parseStyle(element.getAttribute('style') ?? ''));
  }
  for (const property of BASE_PROPERTIES) {
    const base = dominantValue(body, property, styled);
    for (const [element, declarations] of styled) {
      const value = declarations.get(property);
      if (value === undefined) continue;
      const inHeading = property === 'font-size' && element.closest(HEADINGS) !== null;
      if (inHeading || (base !== null && normalizeStyleValue(property, value) === base)) {
        declarations.delete(property);
      }
    }
  }
  for (const [element, declarations] of styled) {
    const style = formatStyle(declarations);
    if (style === null) element.removeAttribute('style');
    else element.setAttribute('style', style);
  }
}

/** The normalized value of `property` that applies to most characters, `null` for none. */
function dominantValue(
  body: HTMLElement,
  property: StyleProperty,
  styled: ReadonlyMap<Element, ReadonlyMap<string, string>>,
): string | null {
  const values = new Map<Element, string | null>();
  const inherited = (element: Element | null): string | null => {
    if (element === null || element === body) return null;
    const known = values.get(element);
    if (known !== undefined) return known;
    const own = styled.get(element)?.get(property);
    const normalized = own === undefined ? null : normalizeStyleValue(property, own);
    const value = normalized ?? inherited(element.parentElement);
    values.set(element, value);
    return value;
  };

  const weights = new Map<string | null, number>();
  const walker = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const length = (node.nodeValue ?? '').replace(/\s/g, '').length;
    if (length === 0) continue;
    const value = inherited(node.parentElement);
    weights.set(value, (weights.get(value) ?? 0) + length);
  }

  let dominant: string | null = null;
  let max = 0;
  for (const [value, weight] of weights) {
    if (weight > max) {
      dominant = value;
      max = weight;
    }
  }
  return dominant;
}
