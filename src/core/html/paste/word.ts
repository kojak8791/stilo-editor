import { parseStyle } from '../css';

/** Markers of the HTML that Microsoft Word puts on the clipboard. */
export const WORD_HTML = /urn:schemas-microsoft-com:office:word|<meta[^>]+Word\.Document/i;

/** Numbered markers: `1.`, `a)`, `iv.`. Anything else (`·`, `o`, `§`) is a bullet. */
const ORDERED_MARKER = /^[0-9a-z]+[.)]$/i;

interface OpenList {
  list: HTMLElement;
  level: number;
}

/**
 * Cleans the HTML of Microsoft Word: removes the `<o:p>` paragraph ends and turns its list
 * paragraphs (`style="mso-list: l0 level1 lfo1"`, the marker in a `mso-list: Ignore` span) into
 * nested `<ul>` / `<ol>`.
 */
export function cleanWord(body: HTMLElement): void {
  for (const end of [...body.getElementsByTagName('o:p')]) end.remove();

  const open: OpenList[] = [];
  for (const paragraph of [...body.querySelectorAll<HTMLElement>('p[style]')]) {
    const level = listLevel(paragraph);
    if (level === null) continue;
    if (paragraph.previousElementSibling !== open[0]?.list) open.length = 0;
    const marker = removeMarker(paragraph);
    while ((open.at(-1)?.level ?? 0) > level) open.pop();
    let parent = open.at(-1);
    if (parent?.level !== level) {
      const list = body.ownerDocument.createElement(ORDERED_MARKER.test(marker) ? 'ol' : 'ul');
      const start = Number.parseInt(marker, 10);
      if (list.tagName === 'OL' && start > 1) list.setAttribute('start', String(start));
      if (parent) parent.list.lastElementChild?.append(list);
      else paragraph.before(list);
      parent = { list, level };
      open.push(parent);
    }
    const item = body.ownerDocument.createElement('li');
    parent.list.append(item);
    item.append(paragraph);
  }
}

/** The level of a Word list paragraph (`level1` → 1), `null` for other paragraphs. */
function listLevel(paragraph: HTMLElement): number | null {
  const msoList = parseStyle(paragraph.getAttribute('style') ?? '').get('mso-list');
  const match = msoList?.match(/level(\d+)/i);
  return match ? Number(match[1]!) : null;
}

/** Removes the marker spans of a list paragraph and returns their text (`1.`, `·`). */
function removeMarker(paragraph: HTMLElement): string {
  let marker = '';
  for (const span of [...paragraph.querySelectorAll('span[style]')]) {
    const msoList = parseStyle(span.getAttribute('style') ?? '').get('mso-list');
    if (msoList?.toLowerCase() !== 'ignore') continue;
    marker += span.textContent ?? '';
    span.remove();
  }
  return marker.trim();
}
