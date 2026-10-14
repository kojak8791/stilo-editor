/** The element that wraps the HTML Google Docs puts on the clipboard. */
export const GOOGLE_DOCS_WRAPPER = '[id^="docs-internal-guid-"]';

/**
 * Cleans the HTML of Google Docs: an empty paragraph arrives as a `<br>` between the blocks of the
 * wrapper and becomes an empty `<p>`.
 */
export function cleanGoogleDocs(wrapper: Element): void {
  for (const lineBreak of wrapper.querySelectorAll(':scope > br')) {
    lineBreak.replaceWith(wrapper.ownerDocument.createElement('p'));
  }
}
