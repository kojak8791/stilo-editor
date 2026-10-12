/** Deterministic benchmark documents (SPEC NFR-1.2): the same seed always gives the same HTML. */

/** Pseudo-random numbers in [0, 1) from a 32-bit seed (mulberry32). */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = (
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut ' +
  'labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris ' +
  'nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse'
).split(' ');

/** Inline wrappers with their probability per word: mixed marks and links. */
const MARKS: ReadonlyArray<readonly [number, (text: string) => string]> = [
  [0.06, (text) => `<strong>${text}</strong>`],
  [0.05, (text) => `<em>${text}</em>`],
  [0.02, (text) => `<u>${text}</u>`],
  [0.02, (text) => `<s>${text}</s>`],
  [0.02, (text) => `<code>${text}</code>`],
  [0.03, (text) => `<a href="https://example.com/${text}">${text}</a>`],
];

function word(random: () => number): string {
  return WORDS[Math.floor(random() * WORDS.length)]!;
}

function words(random: () => number, min: number, max: number): string[] {
  const count = min + Math.floor(random() * (max - min + 1));
  return Array.from({ length: count }, () => word(random));
}

/** A paragraph-sized run of text where single words carry marks or links. */
function inlineText(random: () => number, min: number, max: number): string {
  return words(random, min, max)
    .map((text) => {
      let roll = random();
      for (const [probability, wrap] of MARKS) {
        if (roll < probability) return wrap(text);
        roll -= probability;
      }
      return text;
    })
    .join(' ');
}

/** `count` paragraphs of 20–60 words with mixed marks and links, an `<h2>` every 20. */
export function paragraphs(count: number, seed = 1): string {
  const random = createRandom(seed);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 20 === 0) parts.push(`<h2>${words(random, 2, 6).join(' ')}</h2>`);
    parts.push(`<p>${inlineText(random, 20, 60)}</p>`);
  }
  return parts.join('');
}

/**
 * A list of `count` items nested up to depth 8, every nested list randomly bulleted or ordered.
 * The depth follows a random walk: deeper, same level, or one or two levels up.
 */
export function nestedList(count: number, seed = 1, maxDepth = 8): string {
  const random = createRandom(seed);
  const open: string[] = [];
  let html = '';
  for (let i = 0; i < count; i++) {
    const roll = random();
    const current = open.length;
    let depth = current;
    if (current === 0 || (roll < 0.35 && current < maxDepth)) depth = current + 1;
    else if (roll >= 0.7) depth = Math.max(1, current - 1 - Math.floor(random() * 2));

    while (open.length > depth) html += `</li></${open.pop()}>`;
    if (open.length === depth) html += '</li>';
    while (open.length < depth) {
      const tag = random() < 0.5 ? 'ul' : 'ol';
      open.push(tag);
      html += `<${tag}>`;
    }
    html += `<li><p>${inlineText(random, 3, 12)}</p>`;
  }
  while (open.length > 0) html += `</li></${open.pop()}>`;
  return html;
}
