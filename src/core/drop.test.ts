import { dropPoint } from 'prosemirror-transform';
import { describe, expect, it } from 'vitest';
import { createTestEditor, pressKey } from '../../tests/helpers';
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
