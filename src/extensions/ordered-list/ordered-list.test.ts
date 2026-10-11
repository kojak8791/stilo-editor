import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';

describe('OrderedList: parse and serialize', () => {
  it.each([
    ['<ol><li>a</li></ol>', '<ol><li>a</li></ol>'],
    ['<ol start="1"><li>a</li></ol>', '<ol><li>a</li></ol>'],
    ['<ol start="3"><li>a</li></ol>', '<ol start="3"><li>a</li></ol>'],
    ['<ol start="0"><li>a</li></ol>', '<ol start="0"><li>a</li></ol>'],
    ['<ol start="x"><li>a</li></ol>', '<ol><li>a</li></ol>'],
    ['<ol start=""><li>a</li></ol>', '<ol><li>a</li></ol>'],
    ['<ol start="-2"><li>a</li></ol>', '<ol><li>a</li></ol>'],
    ['<ol start="2.5"><li>a</li></ol>', '<ol><li>a</li></ol>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({ html: '<ol start="3"><li>a</li></ol>' });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });
});

describe('OrderedList: toggleOrderedList command', () => {
  it.each([
    ['<p>a|</p>', '<ol><li>a|</li></ol>', true],
    ['<ul><li>a|</li><li>b</li></ul>', '<ol><li>a|</li><li>b</li></ol>', true],
  ] as const)('%s on %j gives %j (returns %s)', (html, expected, returns) => {
    const editor = createTestEditor({ html });
    expect(editor.commands.toggleOrderedList()).toBe(returns);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});

describe('OrderedList: keymap', () => {
  it('toggles with Mod-Shift-7', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(pressKey(editor, 'Mod-Shift-7')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<ol><li>a|</li></ol>');
  });
});

describe('OrderedList: input rules', () => {
  it.each([
    ['<p>|</p>', '1. a', '<ol><li>a|</li></ol>'],
    ['<p>|</p>', '3. a', '<ol start="3"><li>a|</li></ol>'],
    ['<p>|</p>', '1.a', '<p>1.a|</p>'],
    ['<p>|</p>', '- ', '<ul><li>|</li></ul>'],
    ['<ol><li>a</li></ol><p>|</p>', '2. ', '<ol><li>a</li><li>|</li></ol>'],
  ])('in %j, typing %j gives %j', (html, text, expected) => {
    const editor = createTestEditor({ html });
    typeText(editor, text);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});
