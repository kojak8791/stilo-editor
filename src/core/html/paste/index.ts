import { removeBaseStyles } from './base-styles';
import { cleanGoogleDocs, GOOGLE_DOCS_WRAPPER } from './google-docs';
import { readTableWidths } from './table-widths';
import { cleanWord, WORD_HTML } from './word';

/**
 * Cleans pasted HTML before it is sanitized (docs/ARCHITECTURE.md §8). The HTML is parsed with an
 * inert `DOMParser` (no scripts run, no images load), then:
 *
 * - from Microsoft Word or Google Docs: their own cleanup, then {@link removeBaseStyles};
 * - a heading that starts a list item becomes a paragraph (a list item starts with one);
 * - tables keep the column widths they carry ({@link readTableWidths}).
 */
export function cleanPastedHTML(html: string): string {
  const { body } = new DOMParser().parseFromString(html, 'text/html');
  const word = WORD_HTML.test(html);
  const googleDocs = body.querySelector(GOOGLE_DOCS_WRAPPER);
  if (word) cleanWord(body);
  if (googleDocs) cleanGoogleDocs(googleDocs);
  if (word || googleDocs) removeBaseStyles(body);
  for (const heading of body.querySelectorAll('li > :is(h1, h2, h3, h4, h5, h6):first-child')) {
    const paragraph = body.ownerDocument.createElement('p');
    const style = heading.getAttribute('style');
    if (style !== null) paragraph.setAttribute('style', style);
    paragraph.append(...heading.childNodes);
    heading.replaceWith(paragraph);
  }
  readTableWidths(body);
  return body.innerHTML;
}
