import { Schema } from 'prosemirror-model';
import { describe, expect, it } from 'vitest';
import { createClipboardSerializer, serializeHTML } from './serialize';

// A paragraph with an optional raw `style`, to check style normalization and that paragraphs
// with attributes are never unwrapped.
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'text*',
      attrs: { style: { default: null } },
      toDOM: (node) => (node.attrs.style ? ['p', { style: node.attrs.style }, 0] : ['p', 0]),
    },
    list: { group: 'block', content: 'item+', toDOM: () => ['ul', 0] },
    item: { content: 'paragraph block*', toDOM: () => ['li', 0] },
    blockquote: { group: 'block', content: 'block+', toDOM: () => ['blockquote', 0] },
    text: {},
  },
});

type PMNode = ReturnType<typeof schema.text>;

const p = (text: string, style: string | null = null) =>
  schema.nodes.paragraph!.create({ style }, schema.text(text));
const item = (...content: PMNode[]) => schema.nodes.item!.create(null, content);
const list = (...items: PMNode[]) => schema.nodes.list!.create(null, items);
const html = (node: PMNode, compactParagraphs?: boolean) =>
  serializeHTML(schema, schema.nodes.doc!.create(null, node).content, { compactParagraphs });

describe('serializeHTML: compactParagraphs', () => {
  it.each([
    ['one paragraph per item', list(item(p('a')), item(p('b'))), '<ul><li>a</li><li>b</li></ul>'],
    ['several blocks', list(item(p('a'), p('b'))), '<ul><li><p>a</p><p>b</p></li></ul>'],
    [
      'a paragraph and a nested list',
      list(item(p('a'), list(item(p('b'))))),
      '<ul><li><p>a</p><ul><li>b</li></ul></li></ul>',
    ],
    [
      'a paragraph with attributes',
      list(item(p('a', 'text-align: center'))),
      '<ul><li><p style="text-align: center">a</p></li></ul>',
    ],
    [
      'a blockquote',
      schema.nodes.blockquote!.create(null, p('a')),
      '<blockquote><p>a</p></blockquote>',
    ],
  ])('compacts by default: %s', (_name, node, expected) => {
    expect(html(node)).toBe(expected);
  });

  it('keeps every paragraph with compactParagraphs: false', () => {
    expect(html(list(item(p('a'))), false)).toBe('<ul><li><p>a</p></li></ul>');
  });
});

describe('serializeHTML: styles', () => {
  it.each([
    ['text-align: center', '<p style="text-align: center">a</p>'],
    ['text-align: center; color: #F00', '<p style="color: #ff0000; text-align: center">a</p>'],
    ['color: rgb(255, 0, 0)', '<p style="color: #ff0000">a</p>'],
    ['position: absolute', '<p>a</p>'],
  ])('writes the style %j in canonical form', (style, expected) => {
    expect(html(p('a', style))).toBe(expected);
  });

  it('unwraps a list paragraph whose style was entirely dropped', () => {
    expect(html(list(item(p('a', 'position: absolute'))))).toBe('<ul><li>a</li></ul>');
  });
});

const clipboardCases: Array<[string, PMNode, boolean | undefined, string]> = [
  [
    'one paragraph per item',
    list(item(p('a')), item(p('b'))),
    undefined,
    '<ul><li>a</li><li>b</li></ul>',
  ],
  ['several blocks', list(item(p('a'), p('b'))), undefined, '<ul><li><p>a</p><p>b</p></li></ul>'],
  [
    'a nested list',
    list(item(p('a'), list(item(p('b'))))),
    undefined,
    '<ul><li><p>a</p><ul><li>b</li></ul></li></ul>',
  ],
  ['compactParagraphs: false', list(item(p('a'))), false, '<ul><li><p>a</p></li></ul>'],
  ['a style', p('a', 'color: rgb(255, 0, 0)'), undefined, '<p style="color: #ff0000">a</p>'],
  ['a dropped style', list(item(p('a', 'position: absolute'))), undefined, '<ul><li>a</li></ul>'],
];

describe('createClipboardSerializer', () => {
  it.each(clipboardCases)('canonicalizes: %s', (_name, node, compactParagraphs, expected) => {
    const serializer = createClipboardSerializer(schema, {
      compactParagraphs: compactParagraphs as boolean | undefined,
    });
    const fragment = schema.nodes.doc!.create(null, node).content;
    const doc = document.implementation.createHTMLDocument('');
    const container = doc.createElement('div');
    container.append(serializer.serializeFragment(fragment, { document: doc }));
    expect(container.innerHTML).toBe(expected);
  });
});
