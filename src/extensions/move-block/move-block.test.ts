import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey } from '../../../tests/helpers';
import { selectNode } from '../../../tests/helpers/core';
import { defaultExtensions } from '../default-extensions';

describe('MoveBlock: commands', () => {
  it.each([
    ['moveBlockUp', '<p>a</p><p>b|</p><p>c</p>', '<p>b|</p><p>a</p><p>c</p>', true],
    ['moveBlockDown', '<p>a</p><p>b|</p><p>c</p>', '<p>a</p><p>c</p><p>b|</p>', true],
    ['moveBlockUp', '<p>a|</p><p>b</p>', 'unchanged', false],
    ['moveBlockDown', '<p>a</p><p>b|</p>', 'unchanged', false],
    ['moveBlockUp', '<p>a|</p>', 'unchanged', false],
    ['moveBlockDown', '<p>a|</p>', 'unchanged', false],
    [
      'moveBlockUp',
      '<p>a</p><p>[b</p><p>c]</p><p>d</p>',
      '<p>[b</p><p>c]</p><p>a</p><p>d</p>',
      true,
    ],
    [
      'moveBlockDown',
      '<p>a</p><p>[b</p><p>c]</p><p>d</p>',
      '<p>a</p><p>d</p><p>[b</p><p>c]</p>',
      true,
    ],
    ['moveBlockUp', '<p>a</p><p>b[c</p><p>d]e</p>', '<p>b[c</p><p>d]e</p><p>a</p>', true],
    ['moveBlockUp', '<h1>a</h1><p>b|</p>', '<p>b|</p><h1>a</h1>', true],
    ['moveBlockUp', '<p>a</p><hr><p>b|</p>', '<p>a</p><p>b|</p><hr>', true],
    [
      'moveBlockUp',
      '<p><strong>a</strong></p><p>b|c</p>',
      '<p>b|c</p><p><strong>a</strong></p>',
      true,
    ],
    [
      'moveBlockUp',
      '<p>a</p><blockquote><p>b</p><p>c|</p></blockquote>',
      '<p>a</p><blockquote><p>c|</p><p>b</p></blockquote>',
      true,
    ],
    ['moveBlockUp', '<p>a</p><blockquote><p>b|</p><p>c</p></blockquote>', 'unchanged', false],
    ['moveBlockDown', '<blockquote><p>b</p><p>c|</p></blockquote><p>d</p>', 'unchanged', false],
    [
      'moveBlockUp',
      '<ul><li>a</li><li>b|</li><li>c</li></ul>',
      '<ul><li>b|</li><li>a</li><li>c</li></ul>',
      true,
    ],
    [
      'moveBlockDown',
      '<ul><li>a</li><li>b|</li><li>c</li></ul>',
      '<ul><li>a</li><li>c</li><li>b|</li></ul>',
      true,
    ],
    ['moveBlockUp', '<p>x</p><ul><li>a|</li><li>b</li></ul>', 'unchanged', false],
    ['moveBlockDown', '<ul><li>a</li><li>b|</li></ul><p>x</p>', 'unchanged', false],
    [
      'moveBlockUp',
      '<ul><li>a</li><li><p>b</p><p>c|</p></li></ul>',
      '<ul><li><p>b</p><p>c|</p></li><li>a</li></ul>',
      true,
    ],
    [
      'moveBlockUp',
      '<ul><li><p>a</p><ul><li>b</li><li>c|</li></ul></li></ul>',
      '<ul><li><p>a</p><ul><li>c|</li><li>b</li></ul></li></ul>',
      true,
    ],
    ['moveBlockUp', '<ul><li><p>a</p><ul><li>b|</li><li>c</li></ul></li></ul>', 'unchanged', false],
    [
      'moveBlockDown',
      '<ul><li><p>a|</p><ul><li>b</li></ul></li><li>c</li></ul>',
      '<ul><li>c</li><li><p>a|</p><ul><li>b</li></ul></li></ul>',
      true,
    ],
    [
      'moveBlockDown',
      '<ol><li>[a</li><li>b]</li><li>c</li></ol>',
      '<ol><li>c</li><li>[a</li><li>b]</li></ol>',
      true,
    ],
    [
      'moveBlockDown',
      '<ul><li>a</li><li>[b</li></ul><p>c]</p><p>d</p>',
      '<p>d</p><ul><li>a</li><li>[b</li></ul><p>c]</p>',
      true,
    ],
    ['moveBlockUp', '<ul><li>a</li><li>[b</li></ul><p>c]</p><p>d</p>', 'unchanged', false],
    [
      'moveBlockUp',
      '<ul><li><p>x</p><blockquote><p>b</p><p>c|</p></blockquote></li><li>y</li></ul>',
      '<ul><li><p>x</p><blockquote><p>c|</p><p>b</p></blockquote></li><li>y</li></ul>',
      true,
    ],
    [
      'moveBlockDown',
      '<ul><li><p>x</p><blockquote><p>b|</p></blockquote></li><li>y</li></ul>',
      'unchanged',
      false,
    ],
    [
      'moveBlockUp',
      '<blockquote><ul><li>a</li><li>b|</li></ul></blockquote>',
      '<blockquote><ul><li>b|</li><li>a</li></ul></blockquote>',
      true,
    ],
  ])('%s on %j returns %s gives %j', (command, html, expectedHtml, expectedReturn) => {
    const editor = createTestEditor({ html });
    const result = editor.commands[command as 'moveBlockUp' | 'moveBlockDown']();
    expect(result).toBe(expectedReturn);
    if (expectedHtml === 'unchanged') {
      expect(getHTMLWithSelection(editor)).toBe(html);
    } else {
      expect(getHTMLWithSelection(editor)).toBe(expectedHtml);
    }
  });
});

describe('MoveBlock: keys', () => {
  it('Alt-ArrowUp moves up', () => {
    const editor = createTestEditor({ html: '<p>a</p><p>b|</p><p>c</p>' });
    expect(pressKey(editor, 'Alt-ArrowUp')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>b|</p><p>a</p><p>c</p>');
  });

  it('Alt-ArrowDown moves down', () => {
    const editor = createTestEditor({ html: '<p>a</p><p>b|</p><p>c</p>' });
    expect(pressKey(editor, 'Alt-ArrowDown')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>a</p><p>c</p><p>b|</p>');
  });

  it('Alt-ArrowUp returns false at first block', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(pressKey(editor, 'Alt-ArrowUp')).toBe(false);
  });
});

describe('MoveBlock: repeated moves', () => {
  it('moveBlockUp twice from third block', () => {
    const editor = createTestEditor({ html: '<p>a</p><p>b</p><p>c|</p>' });
    expect(editor.commands.moveBlockUp()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>a</p><p>c|</p><p>b</p>');
    expect(editor.commands.moveBlockUp()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>c|</p><p>a</p><p>b</p>');
    expect(editor.commands.moveBlockUp()).toBe(false);
  });
});

describe('MoveBlock: undo', () => {
  it('one undo step restores original', () => {
    const editor = createTestEditor({ html: '<p>a</p><p>b|</p><p>c</p>' });
    editor.commands.moveBlockUp();
    expect(getHTMLWithSelection(editor)).toBe('<p>b|</p><p>a</p><p>c</p>');
    editor.commands.undo();
    expect(getHTMLWithSelection(editor)).toBe('<p>a</p><p>b|</p><p>c</p>');
  });
});

describe('MoveBlock: .can()', () => {
  it('reports correct state', () => {
    const editor = createTestEditor({ html: '<p>a|</p><p>b</p>' });
    expect(editor.commands.moveBlockUp.can()).toBe(false);
    expect(editor.commands.moveBlockDown.can()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|</p><p>b</p>');
  });
});

describe('MoveBlock: node selection', () => {
  it('moves a node-selected hr', () => {
    const editor = createTestEditor({
      html: '<p>a</p><p>b</p><hr><p>c</p>',
      extensions: [defaultExtensions()],
    });
    selectNode(editor, 6);
    expect(editor.commands.moveBlockUp()).toBe(true);
    expect(editor.getHTML()).toBe('<p>a</p><hr><p>b</p><p>c</p>');
  });
});
