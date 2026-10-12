import type { IconNode } from 'lucide';

/** An SVG element for a lucide icon, with class `stilo-icon` and `aria-hidden="true"`. */
export function createIcon(icon: IconNode): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'stilo-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');

  for (const [tag, attrs] of icon) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value !== undefined) {
        el.setAttribute(key, String(value));
      }
    }
    svg.appendChild(el);
  }

  return svg;
}
