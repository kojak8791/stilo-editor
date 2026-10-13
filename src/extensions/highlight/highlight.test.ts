import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';
import type { Editor } from '../../core/editor';
import { Document, Highlight, Paragraph, Text } from '../index';

describe('Highlight: parse and serialize', () => {
  it.each([
    ['<p><mark>a</mark></p>', '<p><mark>a</mark></p>'],
    [
      '<p><mark style="background-color: #FF0">a</mark></p>',
      '<p><mark style="background-color: #ffff00">a</mark></p>',
    ],
    [
      '<p><mark style="background-color: rgb(255, 0, 0); font-weight: bold">a</mark></p>',
      '<p><mark style="background-color: #ff0000"><strong>a</strong></mark></p>',
    ],
    ['<p><mark style="background-color: transparent">a</mark></p>', '<p><mark>a</mark></p>'],
    ['<p><mark style="background-color: url(x)">a</mark></p>', '<p><mark>a</mark></p>'],
    [
      '<p><span style="background-color: lightblue">a</span></p>',
      '<p><mark style="background-color: lightblue">a</mark></p>',
    ],
    [
      '<p><span style="background-color: rgba(0, 0, 255, 0.5)">a</span></p>',
      '<p><mark style="background-color: rgba(0, 0, 255, 0.5)">a</mark></p>',
    ],
    ['<p><span style="background-color: transparent">a</span></p>', '<p>a</p>'],
    ['<p><span style="background-color: inherit">a</span></p>', '<p>a</p>'],
    [
      '<p><mark><mark style="background-color: red">a</mark></mark></p>',
      '<p><mark style="background-color: red">a</mark></p>',
    ],
    [
      '<p><a href="x"><strong><mark>a</mark></strong></a></p>',
      '<p><a href="x"><mark><strong>a</strong></mark></a></p>',
    ],
    ['<p><code><mark>a</mark></code></p>', '<p><code>a</code></p>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html:
        '<p><mark>a</mark> <mark style="background-color: #FF0">b</mark> ' +
        '<span style="background-color: rgba(0, 0, 255, 0.5)">c</span> <em><mark>d</mark></em></p>',
    });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });

  it('works without the other marks in the schema', () => {
    const editor = createTestEditor({
      html: '<p>[a]</p>',
      extensions: [Document(), Text(), Paragraph(), Highlight()],
    });
    expect(editor.commands.toggleHighlight()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><mark>[a]</mark></p>');
  });
});

describe('Highlight: commands', () => {
  const red = '<mark style="background-color: red">';
  it.each([
    [
      'setHighlight()',
      (e: Editor) => e.commands.setHighlight(),
      '<p>a[b]c</p>',
      '<p>a<mark>[b]</mark>c</p>',
    ],
    [
      "setHighlight({ color: 'RED' })",
      (e: Editor) => e.commands.setHighlight({ color: 'RED' }),
      '<p>a[b]c</p>',
      `<p>a${red}[b]</mark>c</p>`,
    ],
    [
      "setHighlight({ color: '#0f0' })",
      (e: Editor) => e.commands.setHighlight({ color: '#0f0' }),
      '<p><mark>a[b]c</mark></p>',
      '<p><mark>a</mark><mark style="background-color: #00ff00">[b]</mark><mark>c</mark></p>',
    ],
    [
      'setHighlight({ color: null })',
      (e: Editor) => e.commands.setHighlight({ color: null }),
      `<p>${red}[ab]</mark></p>`,
      '<p><mark>[ab]</mark></p>',
    ],
    [
      'unsetHighlight()',
      (e: Editor) => e.commands.unsetHighlight(),
      `<p>${red}a[b]c</mark></p>`,
      `<p>${red}a</mark>[b]${red}c</mark></p>`,
    ],
    [
      'toggleHighlight()',
      (e: Editor) => e.commands.toggleHighlight(),
      '<p>[ab]</p>',
      '<p><mark>[ab]</mark></p>',
    ],
    [
      'toggleHighlight()',
      (e: Editor) => e.commands.toggleHighlight(),
      `<p>${red}[ab]</mark></p>`,
      '<p>[ab]</p>',
    ],
    [
      "toggleHighlight({ color: 'red' })",
      (e: Editor) => e.commands.toggleHighlight({ color: 'red' }),
      `<p>${red}[ab]</mark></p>`,
      '<p>[ab]</p>',
    ],
    [
      "toggleHighlight({ color: 'red' })",
      (e: Editor) => e.commands.toggleHighlight({ color: 'red' }),
      '<p><mark>[ab]</mark></p>',
      `<p>${red}[ab]</mark></p>`,
    ],
    [
      'toggleHighlight({})',
      (e: Editor) => e.commands.toggleHighlight({}),
      `<p>${red}[ab]</mark></p>`,
      '<p><mark>[ab]</mark></p>',
    ],
  ])('%s on %j gives %j', (_name, run, html, expected) => {
    const editor = createTestEditor({ html });
    expect(run(editor)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it.each(['url(x)', 'transparent', 'not a color', ''])('rejects the color %j', (color) => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(editor.commands.setHighlight({ color })).toBe(false);
    expect(editor.commands.toggleHighlight({ color })).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it('highlights the next typed text with an empty selection', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(editor.commands.setHighlight({ color: 'red' })).toBe(true);
    typeText(editor, 'b');
    expect(getHTMLWithSelection(editor)).toBe(
      '<p>a<mark style="background-color: red">b|</mark></p>',
    );
  });

  it('cannot be set inside code', () => {
    const editor = createTestEditor({ html: '<p><code>[ab]</code></p>' });
    expect(editor.can().toggleHighlight()).toBe(false);
  });

  it('is removed by clearFormatting', () => {
    const editor = createTestEditor({
      html: '<p><mark style="background-color: red">[ab]</mark></p>',
    });
    expect(editor.commands.clearFormatting()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it('reports the active state and the color', () => {
    const editor = createTestEditor({
      html: '<p><mark style="background-color: red">a|b</mark></p>',
    });
    expect(editor.isActive('highlight')).toBe(true);
    expect(editor.isActive('highlight', { color: 'red' })).toBe(true);
    expect(editor.isActive('highlight', { color: null })).toBe(false);
    expect(editor.getAttributes('highlight')).toEqual({ color: 'red' });
  });
});

describe('Highlight: shortcut and input rule', () => {
  it('toggles with Mod-Shift-h', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(pressKey(editor, 'Mod-Shift-h')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><mark>[ab]</mark></p>');
    pressKey(editor, 'Mod-Shift-h');
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it.each([
    ['<p>|</p>', '==ab==', '<p><mark>ab</mark>|</p>'],
    ['<p>x |</p>', '==ab== c', '<p>x <mark>ab</mark> c|</p>'],
    ['<p>|</p>', '===ab==', '<p>===ab==|</p>'],
    ['<p>|</p>', '====', '<p>====|</p>'],
    ['<p>|</p>', 'a == b', '<p>a == b|</p>'],
  ])('in %j typing %j gives %j', (html, text, expected) => {
    const editor = createTestEditor({ html });
    typeText(editor, text);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});
