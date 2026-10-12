import { AllSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';
import { createCoreEditor, select, selectNode } from '../../../tests/helpers/core';
import type { Editor } from '../editor';
import { insertBlock } from './nodes';

function insertRule(editor: Editor): boolean {
  return insertBlock(editor.schema.nodes.rule!)(editor.state, (tr) => editor.view.dispatch(tr));
}

describe('insertBlock', () => {
  it.each([
    ['<p>ab</p>', 3, '<p>ab</p><hr><p></p>', 6],
    ['<p>ab</p>', 2, '<p>a</p><hr><p>b</p>', 5],
    ['<p>ab</p>', 1, '<hr><p>ab</p>', 2],
    ['<p></p>', 1, '<hr><p></p>', 2],
    ['<p></p><p>x</p>', 1, '<hr><p>x</p>', 2],
    ['<h1>ab</h1>', 3, '<h1>ab</h1><hr><p></p>', 6],
  ])('in %j at %i gives %j with the cursor at %i', (html, pos, expected, cursor) => {
    const editor = createCoreEditor(html);
    select(editor, pos);
    expect(insertRule(editor)).toBe(true);
    expect(editor.getHTML()).toBe(expected);
    expect(editor.state.selection.empty).toBe(true);
    expect(editor.state.selection.from).toBe(cursor);
  });

  it('replaces a selected range', () => {
    const editor = createCoreEditor('<p>abc</p>');
    select(editor, 2, 3);
    expect(insertRule(editor)).toBe(true);
    expect(editor.getHTML()).toBe('<p>a</p><hr><p>c</p>');
  });

  it('replaces a selected block node at the document level', () => {
    const editor = createCoreEditor('<p>a</p><hr><p>b</p>');
    selectNode(editor, 3);
    expect(insertRule(editor)).toBe(true);
    expect(editor.getHTML()).toBe('<p>a</p><hr><p>b</p>');
    expect(editor.state.selection.from).toBe(5);
  });

  it('replaces the whole document when everything is selected', () => {
    const editor = createCoreEditor('<p>a</p><p>b</p>');
    editor.view.dispatch(editor.state.tr.setSelection(new AllSelection(editor.state.doc)));
    expect(insertRule(editor)).toBe(true);
    expect(editor.getHTML()).toBe('<hr><p></p>');
  });

  it('does not dispatch in a dry run', () => {
    const editor = createCoreEditor('<p>ab</p>');
    select(editor, 2);
    expect(insertBlock(editor.schema.nodes.rule!)(editor.state)).toBe(true);
    expect(editor.getHTML()).toBe('<p>ab</p>');
  });
});
