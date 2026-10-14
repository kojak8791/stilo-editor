import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey } from '../../../tests/helpers';
import { Document, defaultExtensions, Paragraph, Text, TextAlign } from '../index';

describe('TextAlign: parse and serialize', () => {
  it.each([
    ['<p style="text-align: center">a</p>', '<p style="text-align: center">a</p>'],
    ['<p style="TEXT-ALIGN: Right;">a</p>', '<p style="text-align: right">a</p>'],
    ['<p style="text-align: justify">a</p>', '<p style="text-align: justify">a</p>'],
    ['<p style="text-align: left">a</p>', '<p>a</p>'],
    ['<p style="text-align: start">a</p>', '<p>a</p>'],
    ['<p style="text-align: end">a</p>', '<p>a</p>'],
    ['<p style="text-align: center; color: red">a</p>', '<p style="text-align: center">a</p>'],
    ['<h2 style="text-align: center">a</h2>', '<h2 style="text-align: center">a</h2>'],
    [
      '<ul><li><p style="text-align: right">a</p></li></ul>',
      '<ul><li><p style="text-align: right">a</p></li></ul>',
    ],
    ['<ul><li><p>a</p></li></ul>', '<ul><li>a</li></ul>'],
    [
      '<blockquote><p style="text-align: center">a</p></blockquote>',
      '<blockquote><p style="text-align: center">a</p></blockquote>',
    ],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html:
        '<h1 style="text-align: center">a</h1><p style="text-align: justify">b</p>' +
        '<ul><li><p style="text-align: right">c</p></li></ul><p>d</p>',
    });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });

  it('keeps the alignment of the content without the extension', () => {
    const editor = createTestEditor({
      html: '<p style="text-align: center">a</p>',
      extensions: [defaultExtensions({ textAlign: false })],
    });
    expect(editor.getHTML()).toBe('<p style="text-align: center">a</p>');
    expect('setTextAlign' in editor.commands).toBe(false);
  });
});

describe('TextAlign: commands', () => {
  it.each([
    ['center', '<p>a|b</p>', '<p style="text-align: center">a|b</p>'],
    ['right', '<h1>a|b</h1>', '<h1 style="text-align: right">a|b</h1>'],
    ['justify', '<p style="text-align: center">a|b</p>', '<p style="text-align: justify">a|b</p>'],
    ['left', '<p style="text-align: center">a|b</p>', '<p>a|b</p>'],
    ['left', '<p>a|b</p>', '<p>a|b</p>'],
    [
      'center',
      '<p>a[b</p><h2>c</h2><ul><li>d]e</li></ul><p>f</p>',
      '<p style="text-align: center">a[b</p><h2 style="text-align: center">c</h2>' +
        '<ul><li><p style="text-align: center">d]e</p></li></ul><p>f</p>',
    ],
  ] as const)('setTextAlign(%j) on %j gives %j', (alignment, html, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands.setTextAlign(alignment)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('refuses another value', () => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    expect(editor.commands.setTextAlign('middle' as 'center')).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|b</p>');
  });

  it('cannot align a horizontal rule alone', () => {
    const editor = createTestEditor({ html: '<p>a</p><hr><p>b</p>' });
    editor.commands.selectNode(3);
    expect(editor.commands.setTextAlign.can('center')).toBe(false);
  });

  it('works with only the required extensions', () => {
    const editor = createTestEditor({
      html: '<p>a|b</p>',
      extensions: [Document(), Text(), Paragraph(), TextAlign()],
    });
    expect(editor.commands.setTextAlign('right')).toBe(true);
    expect(editor.getHTML()).toBe('<p style="text-align: right">ab</p>');
  });

  it('reports the alignment through the block attributes', () => {
    const editor = createTestEditor({ html: '<h3 style="text-align: center">a|b</h3>' });
    expect(editor.isActive('heading', { textAlign: 'center' })).toBe(true);
    expect(editor.getAttributes('heading')).toEqual({ level: 3, textAlign: 'center' });
  });
});

describe('TextAlign: shortcuts', () => {
  it.each([
    ['Mod-Shift-e', '<p style="text-align: center">a|b</p>'],
    ['Mod-Shift-r', '<p style="text-align: right">a|b</p>'],
    ['Mod-Shift-j', '<p style="text-align: justify">a|b</p>'],
  ])('%s gives %j', (combo, expected) => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    expect(pressKey(editor, combo)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('Mod-Shift-l aligns left', () => {
    const editor = createTestEditor({ html: '<p style="text-align: right">a|b</p>' });
    expect(pressKey(editor, 'Mod-Shift-l')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|b</p>');
  });
});

describe('TextAlign: block type changes', () => {
  it.each([
    [
      (e: ReturnType<typeof createTestEditor>) => e.commands.setHeading({ level: 1 }),
      '<p style="text-align: center">a|b</p>',
      '<h1 style="text-align: center">a|b</h1>',
    ],
    [
      (e: ReturnType<typeof createTestEditor>) => e.commands.setHeading({ level: 2 }),
      '<h1 style="text-align: right">a|b</h1>',
      '<h2 style="text-align: right">a|b</h2>',
    ],
    [
      (e: ReturnType<typeof createTestEditor>) => e.commands.setParagraph(),
      '<h1 style="text-align: justify">a|b</h1>',
      '<p style="text-align: justify">a|b</p>',
    ],
    [
      (e: ReturnType<typeof createTestEditor>) => e.commands.toggleHeading({ level: 1 }),
      '<h1 style="text-align: center">a|b</h1>',
      '<p style="text-align: center">a|b</p>',
    ],
  ])('keeps the alignment (%#)', (run, html, expected) => {
    const editor = createTestEditor({ html });
    expect(run(editor)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('setHeading and setParagraph still refuse a block that has the type already', () => {
    const editor = createTestEditor({ html: '<h1 style="text-align: center">a|b</h1>' });
    expect(editor.commands.setHeading.can({ level: 1 })).toBe(false);
    editor.setHTML('<p style="text-align: center">ab</p>');
    expect(editor.commands.setParagraph.can()).toBe(false);
  });
});
