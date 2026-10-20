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
    [
      '<p><span style="font-family: &quot;Times New Roman&quot; ,serif">a</span></p>',
      '<p><span style="font-family: \'Times New Roman\', serif">a</span></p>',
    ],
    [
      '<p><span style="font-size: 12PT">a</span></p>',
      '<p><span style="font-size: 12pt">a</span></p>',
    ],
    ['<p><span style="font-size: large">a</span></p>', '<p>a</p>'],
    [
      '<p><span style="color: red; font-size: 14px; font-family: Arial">a</span></p>',
      '<p><span style="font-family: Arial; font-size: 14px; color: red">a</span></p>',
    ],
    [
      '<p><font face="Georgia, serif" size="5" color="red">a</font></p>',
      '<p><span style="font-family: Georgia, serif; font-size: 24px; color: red">a</span></p>',
    ],
    ['<p><font size="1">a</font></p>', '<p><span style="font-size: 10px">a</span></p>'],
    ['<p><font size="7">a</font></p>', '<p><span style="font-size: 48px">a</span></p>'],
    ['<p><font size="+1">a</font></p>', '<p>a</p>'],
    ['<p><font size="8">a</font></p>', '<p>a</p>'],
    ['<p><font>a</font></p>', '<p>a</p>'],
    [
      '<p><span style="font-family: Arial">a<span style="color: red">b</span></span></p>',
      '<p><span style="font-family: Arial">a</span>' +
        '<span style="font-family: Arial; color: red">b</span></p>',
    ],
    [
      '<p><font face="Arial"><strong><span style="font-size: 9pt">a</span></strong></font></p>',
      '<p><span style="font-family: Arial; font-size: 9pt"><strong>a</strong></span></p>',
    ],
    [
      '<p><span style="font-family: Arial"><span style="font-family: Georgia">a</span></span></p>',
      '<p><span style="font-family: Georgia">a</span></p>',
    ],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html:
        '<p><span style="color: #F00">a</span> <font color="navy">b</font> ' +
        '<span style="color: rgba(0, 0, 0, 0.5)"><em>c</em></span> ' +
        '<font face="Times New Roman" size="2">d</font> ' +
        '<span style="font-family: Arial">e<span style="font-size: 9pt">f</span></span></p>',
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
    expect(editor.commands.setColor.can('red')).toBe(false);
  });

  it('can be set when only text after code accepts it, without changing the document', () => {
    const editor = createTestEditor({ html: '<p><code>[ab</code></p><p>c]</p>' });
    expect(editor.commands.setColor.can('red')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><code>[ab</code></p><p>c]</p>');
  });

  it('is removed by clearFormatting', () => {
    const editor = createTestEditor({ html: '<p><span style="color: red">[ab]</span></p>' });
    expect(editor.commands.clearFormatting()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it.each([
    ['setFontFamily', 'Georgia, serif', 'font-family: Georgia, serif'],
    ['setFontFamily', '"Times New Roman"', "font-family: 'Times New Roman'"],
    ['setFontSize', '18PX', 'font-size: 18px'],
    ['setFontSize', '1.5em', 'font-size: 1.5em'],
  ] as const)('%s(%j) sets %j', (command, value, style) => {
    const editor = createTestEditor({ html: '<p>a[b]c</p>' });
    expect(editor.commands[command](value)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(`<p>a<span style="${style}">[b]</span>c</p>`);
  });

  it.each([
    ['setFontFamily', ''],
    ['setFontFamily', '"; color: red'],
    ['setFontSize', 'large'],
    ['setFontSize', '12'],
    ['setFontSize', 'calc(1px)'],
  ] as const)('%s rejects %j', (command, value) => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(editor.commands[command](value)).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it('keeps the other attributes when one is set or removed', () => {
    const editor = createTestEditor({ html: '<p><span style="color: red">[ab]</span></p>' });
    expect(editor.commands.setFontFamily('Arial')).toBe(true);
    expect(editor.commands.setFontSize('14px')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(
      '<p><span style="font-family: Arial; font-size: 14px; color: red">[ab]</span></p>',
    );
    expect(editor.commands.unsetColor()).toBe(true);
    expect(editor.commands.unsetFontFamily()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><span style="font-size: 14px">[ab]</span></p>');
    expect(editor.commands.unsetFontSize()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it('sets one attribute over text with different styles, keeping each one', () => {
    const editor = createTestEditor({
      html: '<p>[a<span style="color: red">b</span><span style="font-size: 9pt">c</span>]</p>',
    });
    expect(editor.commands.setFontFamily('Arial')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(
      '<p><span style="font-family: Arial">[a</span>' +
        '<span style="font-family: Arial; color: red">b</span>' +
        '<span style="font-family: Arial; font-size: 9pt">c]</span></p>',
    );
  });

  it.each([
    ['unsetFontFamily', '<p><span style="color: red">[ab]</span></p>'],
    ['unsetFontSize', '<p>[ab]</p>'],
  ] as const)('%s returns false where no text has it', (command, html) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe(html);
  });

  it('removes the attribute only from the selected part', () => {
    const editor = createTestEditor({
      html: '<p><span style="font-family: Arial; color: red">a[b]c</span></p>',
    });
    expect(editor.commands.unsetFontFamily()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(
      '<p><span style="font-family: Arial; color: red">a</span>' +
        '<span style="color: red">[b]</span>' +
        '<span style="font-family: Arial; color: red">c</span></p>',
    );
  });

  it('merges the attributes in the stored marks with an empty selection', () => {
    const editor = createTestEditor({ html: '<p><span style="color: red">a|</span></p>' });
    expect(editor.commands.setFontSize('20px')).toBe(true);
    typeText(editor, 'b');
    expect(getHTMLWithSelection(editor)).toBe(
      '<p><span style="color: red">a</span>' +
        '<span style="font-size: 20px; color: red">b|</span></p>',
    );
    expect(editor.commands.unsetFontSize()).toBe(true);
    expect(editor.commands.unsetColor()).toBe(true);
    typeText(editor, 'c');
    expect(getHTMLWithSelection(editor)).toBe(
      '<p><span style="color: red">a</span>' +
        '<span style="font-size: 20px; color: red">b</span>c|</p>',
    );
  });

  it('cannot set a font inside code', () => {
    const editor = createTestEditor({ html: '<p><code>[ab]</code></p>' });
    expect(editor.commands.setFontFamily.can('Arial')).toBe(false);
    expect(editor.commands.setFontSize.can('12px')).toBe(false);
  });

  it('reports the active state and the color', () => {
    const editor = createTestEditor({ html: '<p><span style="color: red">a|b</span></p>' });
    expect(editor.isActive('textStyle', { color: 'red' })).toBe(true);
    expect(editor.isActive('textStyle', { color: 'blue' })).toBe(false);
    expect(editor.getAttributes('textStyle')).toEqual({
      fontFamily: null,
      fontSize: null,
      color: 'red',
    });
  });
});
