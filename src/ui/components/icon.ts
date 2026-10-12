import type { IconNode } from 'lucide';
import { createElement } from 'lucide';

/** An SVG element for a lucide icon, with class `stilo-icon` and `aria-hidden="true"`. */
export function createIcon(icon: IconNode): SVGElement {
  const svg = createElement(icon, {
    class: 'stilo-icon',
    'aria-hidden': 'true',
  });
  return svg;
}
