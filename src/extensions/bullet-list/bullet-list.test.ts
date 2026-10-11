import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';

describe('BulletList: parse and serialize', () => {
  it.each([
    ['<ul><li>a</li><li>b</li></ul>', '<ul><li>a</li><li>b</li></ul>'],
    ['<ul><li><p>a</p></li></ul>', '<ul><li>a</li></ul>'],
    ['<ul><li><p>a</p><p>b</p></li></ul>', '<ul><li><p>a</p><p>b</p></li></ul>'],
    ['<ul><li>a<ul><li>b</li></ul></li></ul>', '<ul><li><p>a</p><ul><li>b</li></ul></li></ul>'],
    ['<ul><li>a<ol><li>b</li></ol></li></ul>', '<ul><li><p>a</p><ol><li>b</li></ol></li></ul>'],
    ['<ul><li><strong>a</strong> b</li></ul>', '<ul><li><strong>a</strong> b</li></ul>'],
    ['<li>orphan</li>', '<ul><li>orphan</li></ul>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({ html: '<ul><li>a</li><li>b</li></ul>' });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });
});

describe('BulletList: toggleBulletList command', () => {
  it.each([
    ['<p>a|</p>', '<ul><li>a|</li></ul>', true],
    ['<p>[a</p><p>b]</p>', '<ul><li>[a</li><li>b]</li></ul>', true],
    ['<ul><li>a|</li></ul>', '<p>a|</p>', true],
  ] as const)('%s on %j gives %j (returns %s)', (html, expected, returns) => {
    const editor = createTestEditor({ html });
    expect(editor.commands.toggleBulletList()).toBe(returns);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});

describe('BulletList: keymap', () => {
  it('toggles with Mod-Shift-8', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(pressKey(editor, 'Mod-Shift-8')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<ul><li>a|</li></ul>');
  });
});

describe('BulletList: input rules', () => {
  it.each([
    ['<p>|</p>', '- a', '<ul><li>a|</li></ul>'],
    ['<p>|</p>', '* a', '<ul><li>a|</li></ul>'],
    ['<p>|</p>', '+ a', '<ul><li>a|</li></ul>'],
    ['<p>|</p>', '-a', '<p>-a|</p>'],
    ['<p>|</p>', '- ', '<ul><li>|</li></ul>'],
    ['<ul><li>a</li></ul><p>|</p>', '- ', '<ul><li>a</li><li>|</li></ul>'],
  ])('in %j, typing %j gives %j', (html, text, expected) => {
    const editor = createTestEditor({ html });
    typeText(editor, text);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});
