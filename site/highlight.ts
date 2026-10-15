/** Elements that start on their own line in formatted HTML. */
const BLOCKS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'hr',
  'table',
  'colgroup',
  'col',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'figure',
  'figcaption',
]);

const VOID = new Set(['hr', 'col']);

const TOKENS = /<[^>]+>|[^<]+/g;

const TS =
  /(\/\*[\s\S]*?\*\/|\/\/.*)|('(?:[^'\\]|\\.)*')|\b(import|from|const|new|export|function|interface|return|for|of|if)\b/g;

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function span(kind: string, text: string): string {
  return `<span class="tok-${kind}">${escapeText(text)}</span>`;
}

/** Puts each block element of a single-line HTML string on its own indented line. */
export function formatHTML(html: string): string {
  let out = '';
  let depth = 0;
  let inPre = false;
  const hasBlockChild: boolean[] = [];
  const newline = () => {
    if (out) out += `\n${'  '.repeat(depth)}`;
  };
  for (const token of html.match(TOKENS) ?? []) {
    const tag = /^<(\/?)([a-z][a-z0-9]*)/i.exec(token);
    const name = tag?.[2]?.toLowerCase() ?? '';
    if (!tag || !BLOCKS.has(name) || (inPre && name !== 'pre')) {
      out += token;
    } else if (tag[1]) {
      depth--;
      if (hasBlockChild.pop()) newline();
      out += token;
      inPre = false;
    } else {
      if (hasBlockChild.length) hasBlockChild[hasBlockChild.length - 1] = true;
      newline();
      out += token;
      if (!VOID.has(name)) {
        hasBlockChild.push(false);
        depth++;
        inPre = name === 'pre';
      }
    }
  }
  return out;
}

/** HTML source as highlighted markup: tags, attribute names and values get their own class. */
export function highlightHTML(html: string): string {
  return html.replace(TOKENS, (token) => {
    const tag = /^<(\/?)([^\s/>]+)([\s\S]*?)(\/?)>$/.exec(token);
    if (!tag) return escapeText(token);
    const attributes = tag[3]!.replace(
      /([^\s=]+)(="[^"]*")?/g,
      (_, name: string, value: string | undefined) =>
        span('attr', name) + (value ? span('value', value) : ''),
    );
    return `${span('tag', `<${tag[1]}${tag[2]}`)}${attributes}${span('tag', `${tag[4]}>`)}`;
  });
}

/** A TypeScript snippet as highlighted markup: comments, strings and a few keywords. */
export function highlightTS(code: string): string {
  let out = '';
  let last = 0;
  for (const match of code.matchAll(TS)) {
    const kind = match[1] ? 'comment' : match[2] ? 'string' : 'keyword';
    out += escapeText(code.slice(last, match.index)) + span(kind, match[0]);
    last = match.index + match[0].length;
  }
  return out + escapeText(code.slice(last));
}
