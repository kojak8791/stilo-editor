import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, typeText } from '../../../tests/helpers';
import { Document, Paragraph, Text, TextStyle } from '../index';

describe('TextStyle: parse and serialize', () => {
  it.each([
    ['<p><span style="color: #F00">a</span></p>', '<p><span style="color: #ff0000">a</span></p>'],
    [
      '<p><span style="color: rgb(0, 128, 0)">a</span></p>',
      '<p><span style="color: #008000">a</span></p>',
    ],
    ['<p><span style="color: navy">a</span></p>', '<p><span style="color: navy">a</span></p>'],
    [
      '<p><span style="color: rgba(0, 0, 0, 0.5); font-weight: 700">a</span></p>',
      '<p><span style="color: rgba(0, 0, 0, 0.5)"><strong>a</strong></span></p>',
    ],
    ['<p><font color="#00F">a</font></p>', '<p><span style="color: #0000ff">a</span></p>'],
    ['<p><span style="color: currentcolor">a</span></p>', '<p>a</p>'],
    ['<p><span style="color: url(x)">a</span></p>', '<p>a</p>'],
    ['<p><font color="inherit">a</font></p>', '<p>a</p>'],
    ['<p><span style="font-style: italic">a</span></p>', '<p><em>a</em></p>'],
    [
      '<p><span style="color: red"><span style="color: blue">a</span></span></p>',
      '<p><span style="color: blue">a</span></p>',
    ],
    [
      '<p><mark><strong><span style="color: red">a</span></strong></mark></p>',
      '<p><mark><span style="color: red"><strong>a</strong></span></mark></p>',
    ],
    [
      '<p><span style="color: #fff"><mark style="background-color: #3b82f6">a</mark></span></p>',
      '<p><mark style="background-color: #3b82f6"><span style="color: #ffffff">a</span></mark></p>',
    ],
    [
      '<p><span style="color: red"><a href="x">a</a></span></p>',
      '<p><a href="x"><span style="color: red">a</span></a></p>',
    ],
    ['<p><code><span style="color: red">a</span></code></p>', '<p><code>a</code></p>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html:
        '<p><span style="color: #F00">a</span> <font color="navy">b</font> ' +
        '<span style="color: rgba(0, 0, 0, 0.5)"><em>c</em></span></p>',
    });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });

  it('works without the other marks in the schema', () => {
    const editor = createTestEditor({
      html: '<p>[a]</p>',
      extensions: [Document(), Text(), Paragraph(), TextStyle()],
    });
    expect(editor.commands.setColor('red')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><span style="color: red">[a]</span></p>');
  });
});

describe('TextStyle: commands', () => {
  it.each([
    ['red', '<p>a[b]c</p>', '<p>a<span style="color: red">[b]</span>c</p>'],
    ['#ABC', '<p>a[b]c</p>', '<p>a<span style="color: #aabbcc">[b]</span>c</p>'],
    [
      'rgb(1, 2, 3)',
      '<p><span style="color: red">a[b]c</span></p>',
      '<p><span style="color: red">a</span><span style="color: #010203">[b]</span>' +
        '<span style="color: red">c</span></p>',
    ],
  ])('setColor(%j) on %j gives %j', (color, html, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands.setColor(color)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('colors highlighted text inside the <mark>, so that the browser color of <mark> does not hide it', () => {
    const expected =
      '<p>a<mark style="background-color: #3b82f6"><span style="color: #ffffff">[b]</span></mark>c</p>';
    const first = createTestEditor({ html: '<p>a[b]c</p>' });
    expect(first.commands.setHighlight({ color: '#3b82f6' })).toBe(true);
    expect(first.commands.setColor('#ffffff')).toBe(true);
    expect(getHTMLWithSelection(first)).toBe(expected);
    const second = createTestEditor({ html: '<p>a[b]c</p>' });
    expect(second.commands.setColor('#ffffff')).toBe(true);
    expect(second.commands.setHighlight({ color: '#3b82f6' })).toBe(true);
    expect(getHTMLWithSelection(second)).toBe(expected);
  });

  it.each(['url(x)', 'inherit', 'not a color', ''])('setColor rejects %j', (color) => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(editor.commands.setColor(color)).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it.each([
    [
      '<p><span style="color: red">a[b]c</span></p>',
      true,
      '<p><span style="color: red">a</span>[b]<span style="color: red">c</span></p>',
    ],
    ['<p>a[b]c</p>', false, '<p>a[b]c</p>'],
  ])('unsetColor on %j returns %s and gives %j', (html, expectedReturn, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands.unsetColor()).toBe(expectedReturn);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('colors the next typed text with an empty selection', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(editor.commands.setColor('red')).toBe(true);
    typeText(editor, 'b');
    expect(getHTMLWithSelection(editor)).toBe('<p>a<span style="color: red">b|</span></p>');
  });

  it('cannot be set inside code', () => {
    const editor = createTestEditor({ html: '<p><code>[ab]</code></p>' });
    expect(editor.can().setColor('red')).toBe(false);
  });

  it('is removed by clearFormatting', () => {
    const editor = createTestEditor({ html: '<p><span style="color: red">[ab]</span></p>' });
    expect(editor.commands.clearFormatting()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it('reports the active state and the color', () => {
    const editor = createTestEditor({ html: '<p><span style="color: red">a|b</span></p>' });
    expect(editor.isActive('textStyle', { color: 'red' })).toBe(true);
    expect(editor.isActive('textStyle', { color: 'blue' })).toBe(false);
    expect(editor.getAttributes('textStyle')).toEqual({ color: 'red' });
  });
});
