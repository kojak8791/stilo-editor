import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection } from '../../../tests/helpers';
import { Document, defaultExtensions, LineHeight, Paragraph, Text } from '../index';

describe('LineHeight: parse and serialize', () => {
  it.each([
    ['<p style="line-height: 1.5">a</p>', '<p style="line-height: 1.5">a</p>'],
    ['<p style="LINE-HEIGHT: 2.0;">a</p>', '<p style="line-height: 2">a</p>'],
    ['<p style="line-height: 115%">a</p>', '<p style="line-height: 1.15">a</p>'],
    ['<p style="line-height: normal">a</p>', '<p>a</p>'],
    ['<p style="line-height: 24px">a</p>', '<p>a</p>'],
    ['<h2 style="line-height: 1">a</h2>', '<h2 style="line-height: 1">a</h2>'],
    [
      '<p style="line-height: 2; text-align: center">a</p>',
      '<p style="text-align: center; line-height: 2">a</p>',
    ],
    [
      '<ul><li><p style="line-height: 1.5">a</p></li></ul>',
      '<ul><li><p style="line-height: 1.5">a</p></li></ul>',
    ],
    [
      '<blockquote><p style="line-height: 1.5">a</p></blockquote>',
      '<blockquote><p style="line-height: 1.5">a</p></blockquote>',
    ],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html:
        '<h1 style="text-align: center; line-height: 1">a</h1><p style="line-height: 1.15">b</p>' +
        '<ul><li><p style="line-height: 2">c</p></li></ul><p>d</p>',
    });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });

  it('keeps the line height of the content without the extension', () => {
    const editor = createTestEditor({
      html: '<p style="line-height: 1.5">a</p>',
      extensions: [defaultExtensions({ lineHeight: false })],
    });
    expect(editor.getHTML()).toBe('<p style="line-height: 1.5">a</p>');
    expect('setLineHeight' in editor.commands).toBe(false);
  });
});

describe('LineHeight: commands', () => {
  it.each([
    [1.5, '<p>a|b</p>', '<p style="line-height: 1.5">a|b</p>'],
    ['115%', '<h1>a|b</h1>', '<h1 style="line-height: 1.15">a|b</h1>'],
    [2, '<p style="line-height: 1">a|b</p>', '<p style="line-height: 2">a|b</p>'],
    [
      1,
      '<p style="text-align: right">a|b</p>',
      '<p style="text-align: right; line-height: 1">a|b</p>',
    ],
    [
      1.15,
      '<p>a[b</p><h2>c</h2><ul><li>d]e</li></ul><p>f</p>',
      '<p style="line-height: 1.15">a[b</p><h2 style="line-height: 1.15">c</h2>' +
        '<ul><li><p style="line-height: 1.15">d]e</p></li></ul><p>f</p>',
    ],
  ])('setLineHeight(%j) on %j gives %j', (lineHeight, html, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands.setLineHeight(lineHeight)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it.each([0, 'normal', '24px', 'url(x)'])('setLineHeight refuses %j', (lineHeight) => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    expect(editor.commands.setLineHeight(lineHeight)).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|b</p>');
  });

  it('unsetLineHeight removes the line height and keeps the alignment', () => {
    const editor = createTestEditor({
      html: '<p style="text-align: center; line-height: 2">a[b</p><p style="line-height: 1">c]d</p>',
    });
    expect(editor.commands.unsetLineHeight()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p style="text-align: center">a[b</p><p>c]d</p>');
  });

  it('cannot change a horizontal rule alone', () => {
    const editor = createTestEditor({ html: '<p>a</p><hr><p>b</p>' });
    editor.commands.selectNode(3);
    expect(editor.commands.setLineHeight.can(2)).toBe(false);
    expect(editor.commands.unsetLineHeight.can()).toBe(false);
  });

  it('works with only the required extensions', () => {
    const editor = createTestEditor({
      html: '<p>a|b</p>',
      extensions: [Document(), Text(), Paragraph(), LineHeight()],
    });
    expect(editor.commands.setLineHeight(2)).toBe(true);
    expect(editor.getHTML()).toBe('<p style="line-height: 2">ab</p>');
  });

  it('reports the line height through the block attributes', () => {
    const editor = createTestEditor({ html: '<h3 style="line-height: 1.5">a|b</h3>' });
    expect(editor.isActive('heading', { lineHeight: '1.5' })).toBe(true);
    expect(editor.getAttributes('heading')).toEqual({
      level: 3,
      textAlign: null,
      lineHeight: '1.5',
    });
  });
});

describe('LineHeight: block type changes', () => {
  it('keeps the line height and the alignment', () => {
    const editor = createTestEditor({
      html: '<p style="text-align: center; line-height: 1.5">a|b</p>',
    });
    expect(editor.commands.setHeading({ level: 2 })).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(
      '<h2 style="text-align: center; line-height: 1.5">a|b</h2>',
    );
    expect(editor.commands.setParagraph()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(
      '<p style="text-align: center; line-height: 1.5">a|b</p>',
    );
  });
});
