import { Slice } from 'prosemirror-model';
import { dropPoint } from 'prosemirror-transform';
import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey } from '../../tests/helpers';
import type { Editor } from './editor';

/** Drops the selection at `target` like ProseMirror's drop handler (`move`: not a copy). */
function drop(editor: Editor, target: number | 'end', move = true): void {
  const { state } = editor;
  const at = target === 'end' ? state.doc.content.size : target;
  const slice = state.selection.content();
  const tr = state.tr;
  if (move) tr.deleteSelection();
  const pos = tr.mapping.map(dropPoint(state.doc, at, slice) ?? at);
  tr.replaceRange(pos, pos, slice);
  editor.view.dispatch(tr.setMeta('uiEvent', 'drop'));
}

describe('drop move', () => {
  it.each([
    ['a paragraph above itself', '<p>[Test]</p>', 0, '<p>Test</p>'],
    ['a paragraph above a heading', '<h2>Title</h2><p>[Text]</p>', 0, '<p>Text</p><h2>Title</h2>'],
    ['a heading to the end', '<h2>[Title]</h2><p>Text</p>', 'end', '<p>Text</p><h2>Title</h2>'],
    ['two blocks', '<p>[a</p><p>b]</p><p>c</p>', 'end', '<p>c</p><p>a</p><p>b</p>'],
    [
      'a list item',
      '<ul><li>a</li><li>[b]</li></ul><p>c</p>',
      'end',
      '<ul><li>a</li></ul><p>c</p><ul><li>b</li></ul>',
    ],
    ['a whole list', '<ul><li>[a]</li></ul><p>c</p>', 'end', '<p>c</p><ul><li>a</li></ul>'],
    [
      'a quote',
      '<blockquote><p>[q]</p></blockquote><p>c</p>',
      'end',
      '<p>c</p><blockquote><p>q</p></blockquote>',
    ],
  ] as const)('removes the block left empty: %s', (_name, html, target, expected) => {
    const editor = createTestEditor({ html });
    drop(editor, target);
    expect(editor.getHTML()).toBe(expected);
  });

  it.each([
    ['part of a paragraph', '<p>a[b]c</p><p>d</p>', true, '<p>ac</p><p>d</p><p>b</p>'],
    ['a copy', '<p>[a]</p><p>b</p>', false, '<p>a</p><p>b</p><p>a</p>'],
    [
      'the first paragraph of an item',
      '<ul><li><p>[a]</p><ul><li>b</li></ul></li></ul>',
      true,
      '<ul><li><p></p><ul><li>b</li></ul></li></ul><ul><li>a</li></ul>',
    ],
  ] as const)('keeps the source block: %s', (_name, html, move, expected) => {
    const editor = createTestEditor({ html });
    drop(editor, 'end', move);
    expect(editor.getHTML()).toBe(expected);
  });

  it('undoes the move in one step', () => {
    const editor = createTestEditor({ html: '<h2>Title</h2><p>[Text]</p>' });
    drop(editor, 0);
    expect(editor.getHTML()).toBe('<p>Text</p><h2>Title</h2>');
    pressKey(editor, 'Mod-z');
    expect(editor.getHTML()).toBe('<h2>Title</h2><p>Text</p>');
  });

  it('ignores other transactions', () => {
    const editor = createTestEditor({ html: '<p>[Text]</p><p>b</p>' });
    pressKey(editor, 'Backspace');
    expect(editor.getHTML()).toBe('<p></p><p>b</p>');
  });
});

/** Drops the selection with the mouse at `pos`, through the `handleDrop` props (no layout). */
function dropAt(editor: Editor, pos: number, move = true): boolean {
  const { view } = editor;
  view.posAtCoords = () => ({ pos, inside: -1 });
  const event = new MouseEvent('drop') as DragEvent;
  return view.someProp('handleDrop', (f) => f(view, event, Slice.empty, move)) ?? false;
}

describe('drop of whole blocks inside text', () => {
  it.each([
    ['in the middle of a paragraph', '<p>[x]</p><p>abcd</p>', 6, '<p>ab</p><p>[x]</p><p>cd</p>'],
    ['at the start of a paragraph', '<p>[x]</p><p>abcd</p>', 4, '<p>[x]</p><p>abcd</p>'],
    ['at the end of a paragraph', '<p>[x]</p><p>abcd</p>', 8, '<p>abcd</p><p>[x]</p>'],
    ['in a heading', '<h2>abcd</h2><p>[x]</p>', 3, '<h2>ab</h2><p>[x]</p><h2>cd</h2>'],
    ['two blocks', '<p>abcd</p><p>[x</p><p>y]</p>', 3, '<p>ab</p><p>[x</p><p>y]</p><p>cd</p>'],
    [
      'in a list item',
      '<ul><li>abcd</li></ul><p>[x]</p>',
      5,
      '<ul><li>ab</li><li>[x]</li><li>cd</li></ul>',
    ],
    [
      'at the end of a list item',
      '<ul><li>ab</li><li>cd</li></ul><p>[x]</p>',
      5,
      '<ul><li>ab</li><li>[x]</li><li>cd</li></ul>',
    ],
    [
      'in a task item',
      '<ul data-type="taskList"><li data-checked="true">abcd</li></ul><p>[x]</p>',
      5,
      '<ul data-type="taskList"><li data-checked="true">ab</li><li data-checked="false">[x]</li>' +
        '<li data-checked="true">cd</li></ul>',
    ],
    [
      'a heading in a list item',
      '<ul><li>abcd</li></ul><h2>[x]</h2>',
      5,
      '<ul><li>ab</li></ul><h2>[x]</h2><ul><li>cd</li></ul>',
    ],
    [
      'at the start of the second paragraph of an item',
      '<ul><li><p>ab</p><p>cd</p></li></ul><p>[x]</p>',
      7,
      '<ul><li>ab</li><li>[x]</li><li>cd</li></ul>',
    ],
    [
      'in a quote',
      '<blockquote><p>abcd</p></blockquote><p>[x]</p>',
      4,
      '<blockquote><p>ab</p><p>[x]</p><p>cd</p></blockquote>',
    ],
  ] as const)('splits the target: %s', (_name, html, pos, expected) => {
    const editor = createTestEditor({ html });
    expect(dropAt(editor, pos)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it.each([
    ['part of a paragraph', '<p>a[b]c</p><p>abcd</p>', 7, true],
    ['a copy', '<p>[x]</p><p>abcd</p>', 5, false],
    ['blocks of different parents', '<ul><li>[a</li></ul><p>b]</p><p>abcd</p>', 12, true],
  ] as const)('leaves the drop to ProseMirror: %s', (_name, html, pos, move) => {
    const editor = createTestEditor({ html });
    expect(dropAt(editor, pos, move)).toBe(false);
  });

  it.each([
    ['inside', 2],
    ['before', 0],
    ['after', 6],
  ])('does nothing for a drop on the dragged blocks: %s', (_name, pos) => {
    const editor = createTestEditor({ html: '<p>[abcd]</p><p>x</p>' });
    expect(dropAt(editor, pos)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>[abcd]</p><p>x</p>');
  });

  it('undoes the move in one step', () => {
    const editor = createTestEditor({ html: '<p>[x]</p><p>abcd</p>' });
    dropAt(editor, 6);
    pressKey(editor, 'Mod-z');
    expect(editor.getHTML()).toBe('<p>x</p><p>abcd</p>');
  });
});
