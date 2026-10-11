import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, typeText } from '../../../tests/helpers';

describe('HorizontalRule: parse and serialize', () => {
  it.each([['<p>a</p><hr><p>b</p>', '<p>a</p><hr><p>b</p>']])(
    'parses %j as %j',
    (html, expected) => {
      expect(createTestEditor({ html }).getHTML()).toBe(expected);
    },
  );

  it('is idempotent', () => {
    const editor = createTestEditor({ html: '<p>a</p><hr><p>b</p>' });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });
});

describe('HorizontalRule: commands', () => {
  it.each([
    ['setHorizontalRule', '<p>ab|</p>', '<p>ab</p><hr><p>|</p>', true],
    ['setHorizontalRule', '<p>a|b</p>', '<p>a</p><hr><p>|b</p>', true],
    ['setHorizontalRule', '<p>|</p><p>x</p>', '<hr><p>|x</p>', true],
    ['setHorizontalRule', '<p>a[b]c</p>', '<p>a</p><hr><p>|c</p>', true],
    [
      'setHorizontalRule',
      '<blockquote><p>a|</p></blockquote>',
      '<blockquote><p>a</p><hr><p>|</p></blockquote>',
      true,
    ],
  ] as const)('%s on %j gives %j (returns %s)', (command, html, expected, returns) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(returns);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});

describe('HorizontalRule: input rule', () => {
  it.each([
    ['<p>|</p>', '---', '<hr><p>|</p>'],
    ['<p>|</p><p>y</p>', '---', '<hr><p>|y</p>'],
  ])('in %j, typing %j gives %j', (html, text, expected) => {
    const editor = createTestEditor({ html });
    typeText(editor, text);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});
