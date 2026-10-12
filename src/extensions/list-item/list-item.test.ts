import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';

describe('ListItem: parse and serialize', () => {
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

describe('ListItem: getText', () => {
  it('returns text with block separators', () => {
    const editor = createTestEditor({ html: '<ul><li>a</li><li>b</li></ul>' });
    expect(editor.getText()).toBe('a\n\nb');
  });
});

describe('ListItem: commands', () => {
  it.each([
    ['toggleBulletList', '<p>a|</p>', '<ul><li>a|</li></ul>', true],
    ['toggleBulletList', '<p>[a</p><p>b]</p>', '<ul><li>[a</li><li>b]</li></ul>', true],
    ['toggleBulletList', '<ul><li>a|</li></ul>', '<p>a|</p>', true],
    ['toggleOrderedList', '<ul><li>a|</li><li>b</li></ul>', '<ol><li>a|</li><li>b</li></ol>', true],
    ['toggleBulletList', '<ol start="3"><li>a|</li></ol>', '<ul><li>a|</li></ul>', true],
    ['toggleOrderedList', '<p>a|</p>', '<ol><li>a|</li></ol>', true],
    [
      'toggleBulletList',
      '<blockquote><p>a|</p></blockquote>',
      '<blockquote><ul><li>a|</li></ul></blockquote>',
      true,
    ],
    ['liftListItem', '<p>a|</p>', '<p>a|</p>', false],
  ] as const)('%s on %j gives %j (returns %s)', (command, html, expected, returns) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(returns);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});

describe('ListItem: keymap', () => {
  it.each([
    ['<p>a|</p>', 'Mod-Shift-8', '<ul><li>a|</li></ul>'],
    ['<p>a|</p>', 'Mod-Shift-7', '<ol><li>a|</li></ol>'],
  ])('toggle list with %s on %j gives %j', (html, combo, expected) => {
    const editor = createTestEditor({ html });
    expect(pressKey(editor, combo)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('splits list item with Enter', () => {
    const editor = createTestEditor({ html: '<ul><li>ab|</li></ul>' });
    expect(pressKey(editor, 'Enter')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<ul><li>ab</li><li>|</li></ul>');
  });

  it('splits list item with cursor in middle', () => {
    const editor = createTestEditor({ html: '<ul><li>a|b</li></ul>' });
    expect(pressKey(editor, 'Enter')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<ul><li>a</li><li>|b</li></ul>');
  });

  it('lifts empty item at end out of list', () => {
    const editor = createTestEditor({ html: '<ul><li>a</li><li>|</li></ul>' });
    expect(pressKey(editor, 'Enter')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<ul><li>a</li></ul><p>|</p>');
  });

  it('splits at end of list with following content', () => {
    const editor = createTestEditor({
      html: '<ul><li>a</li><li>|</li><li>b</li></ul>',
    });
    expect(pressKey(editor, 'Enter')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<ul><li>a</li></ul><p>|</p><ul><li>b</li></ul>');
  });

  it('splits nested list item', () => {
    const editor = createTestEditor({
      html: '<ul><li><p>a</p><ul><li>|</li></ul></li></ul>',
    });
    expect(pressKey(editor, 'Enter')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<ul><li>a</li><li>|</li></ul>');
  });

  it('nests with Tab', () => {
    const editor = createTestEditor({ html: '<ul><li>a</li><li>b|</li></ul>' });
    expect(pressKey(editor, 'Tab')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<ul><li><p>a</p><ul><li>b|</li></ul></li></ul>');
  });

  it('returns false when Tab cannot sink', () => {
    const editor = createTestEditor({ html: '<ul><li>a|</li></ul>' });
    expect(pressKey(editor, 'Tab')).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<ul><li>a|</li></ul>');
  });

  it('returns false when Tab on paragraph', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(pressKey(editor, 'Tab')).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|</p>');
  });

  it('lifts with Shift-Tab', () => {
    const editor = createTestEditor({
      html: '<ul><li><p>a</p><ul><li>b|</li></ul></li></ul>',
    });
    expect(pressKey(editor, 'Shift-Tab')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<ul><li>a</li><li>b|</li></ul>');
  });

  it('lifts top-level item out', () => {
    const editor = createTestEditor({ html: '<ul><li>a|</li></ul>' });
    expect(pressKey(editor, 'Shift-Tab')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|</p>');
  });

  it('lifts with Backspace at item start', () => {
    const editor = createTestEditor({ html: '<ul><li>a</li><li>|b</li></ul>' });
    expect(pressKey(editor, 'Backspace')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<ul><li>a</li></ul><p>|b</p>');
  });

  it('returns false with Backspace in middle of item', () => {
    const editor = createTestEditor({ html: '<ul><li>a|b</li></ul>' });
    expect(pressKey(editor, 'Backspace')).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<ul><li>a|b</li></ul>');
  });

  it.each([
    ['<ul><li>a</li></ul><p>|</p>', '<ul><li>a|</li></ul>'],
    ['<ol><li>a</li></ol><p>|</p><p>b</p>', '<ol><li>a|</li></ol><p>b</p>'],
    ['<ul><li>a</li></ul><p>|b</p>', '<ul><li>a|b</li></ul>'],
    ['<ul><li>a</li></ul><h2>|b</h2>', '<ul><li>a|b</li></ul>'],
    [
      '<ul><li><strong>a</strong></li></ul><p>|<em>b</em></p>',
      '<ul><li><strong>a|</strong><em>b</em></li></ul>',
    ],
    [
      '<ul><li><p>a</p><ul><li>b</li></ul></li></ul><p>|</p>',
      '<ul><li><p>a</p><ul><li>b|</li></ul></li></ul>',
    ],
    [
      '<ul><li><p>a</p><ul><li>b</li></ul></li></ul><p>|c</p>',
      '<ul><li><p>a</p><ul><li>b|c</li></ul></li></ul>',
    ],
  ])('Backspace after a list joins %j into its last item: %j', (html, expected) => {
    const editor = createTestEditor({ html });
    expect(pressKey(editor, 'Backspace')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('undoes the join after a list in one step', () => {
    const editor = createTestEditor({ html: '<ul><li>a</li></ul><p>|b</p>' });
    pressKey(editor, 'Backspace');
    expect(pressKey(editor, 'Mod-z')).toBe(true);
    expect(editor.getHTML()).toBe('<ul><li>a</li></ul><p>b</p>');
  });

  it('unwraps single paragraph with Backspace', () => {
    const editor = createTestEditor({
      html: '<ul><li><p>a</p><p>|b</p></li></ul>',
    });
    expect(pressKey(editor, 'Backspace')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<ul><li>a|b</li></ul>');
  });
});

describe('ListItem: input rules', () => {
  it.each([
    ['<p>|</p>', '- a', '<ul><li>a|</li></ul>'],
    ['<p>|</p>', '* a', '<ul><li>a|</li></ul>'],
    ['<p>|</p>', '+ a', '<ul><li>a|</li></ul>'],
    ['<p>|</p>', '1. a', '<ol><li>a|</li></ol>'],
    ['<p>|</p>', '3. a', '<ol start="3"><li>a|</li></ol>'],
    ['<p>|</p>', '-a', '<p>-a|</p>'],
    ['<p>|</p>', '1.a', '<p>1.a|</p>'],
    ['<p>x|</p>', '- ', '<p>x- |</p>'],
    ['<p>|</p>', '- ', '<ul><li>|</li></ul>'],
    ['<ul><li>a</li></ul><p>|</p>', '- ', '<ul><li>a</li><li>|</li></ul>'],
    ['<ol><li>a</li></ol><p>|</p>', '2. ', '<ol><li>a</li><li>|</li></ol>'],
  ])('in %j, typing %j gives %j', (html, text, expected) => {
    const editor = createTestEditor({ html });
    typeText(editor, text);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('undoes the input rule with Backspace right after it', () => {
    const editor = createTestEditor({ html: '<p>|</p>' });
    typeText(editor, '- ');
    expect(pressKey(editor, 'Backspace')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>- |</p>');
  });
});
