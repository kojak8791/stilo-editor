import { describe, expect, it } from 'vitest';
import { createCoreEditor, select } from '../../../tests/helpers/core';
import type { Editor } from '../editor';
import { setMark, unsetMark } from './marks';

function run(editor: Editor, command: ReturnType<typeof setMark>): boolean {
  return command(editor.state, (tr) => editor.view.dispatch(tr));
}

describe('setMark', () => {
  it('adds the mark to the stored marks for an empty selection', () => {
    const editor = createCoreEditor('<p>ab</p>');
    const strong = editor.schema.marks.strong!;
    select(editor, 2);
    expect(run(editor, setMark(strong))).toBe(true);
    expect(strong.isInSet(editor.state.storedMarks ?? [])).toBeTruthy();
    expect(editor.getHTML()).toBe('<p>ab</p>');
  });

  it('adds the mark to a range', () => {
    const editor = createCoreEditor('<p>abc</p>');
    select(editor, 2, 3);
    expect(run(editor, setMark(editor.schema.marks.strong!))).toBe(true);
    expect(editor.getHTML()).toBe('<p>a<strong>b</strong>c</p>');
  });

  it('returns false where the parent does not allow the mark, without dispatching', () => {
    const editor = createCoreEditor('<h1>ab</h1>');
    const strong = editor.schema.marks.strong!;
    select(editor, 2);
    expect(run(editor, setMark(strong))).toBe(false);
    select(editor, 1, 3);
    expect(run(editor, setMark(strong))).toBe(false);
    expect(editor.state.storedMarks).toBeNull();
    expect(editor.getHTML()).toBe('<h1>ab</h1>');
  });

  it('marks only the text that allows the mark in a mixed range', () => {
    const editor = createCoreEditor('<h1>ab</h1><p>cd</p>');
    select(editor, 2, 6);
    expect(run(editor, setMark(editor.schema.marks.strong!))).toBe(true);
    expect(editor.getHTML()).toBe('<h1>ab</h1><p><strong>c</strong>d</p>');
  });

  it('returns false where an existing mark excludes the mark', () => {
    const editor = createCoreEditor('<p><code>ab</code></p>');
    const strong = editor.schema.marks.strong!;
    select(editor, 2);
    expect(run(editor, setMark(strong))).toBe(false);
    select(editor, 1, 3);
    expect(run(editor, setMark(strong))).toBe(false);
    expect(editor.getHTML()).toBe('<p><code>ab</code></p>');
  });

  it('marks only the text without excluding marks in a mixed range', () => {
    const editor = createCoreEditor('<p><code>a</code>b</p>');
    select(editor, 1, 3);
    expect(run(editor, setMark(editor.schema.marks.strong!))).toBe(true);
    expect(editor.getHTML()).toBe('<p><code>a</code><strong>b</strong></p>');
  });

  it('does not dispatch in a dry run', () => {
    const editor = createCoreEditor('<p>abc</p>');
    select(editor, 2, 3);
    expect(setMark(editor.schema.marks.strong!)(editor.state)).toBe(true);
    expect(editor.getHTML()).toBe('<p>abc</p>');
  });
});

describe('unsetMark', () => {
  it('removes the mark from the stored marks for an empty selection', () => {
    const editor = createCoreEditor('<p><strong>ab</strong></p>');
    const strong = editor.schema.marks.strong!;
    select(editor, 2);
    expect(run(editor, unsetMark(strong))).toBe(true);
    expect(strong.isInSet(editor.state.storedMarks ?? [])).toBeUndefined();
    expect(editor.state.storedMarks).toEqual([]);
  });

  it('returns false when the cursor has no such mark', () => {
    const editor = createCoreEditor('<p>ab</p>');
    select(editor, 2);
    expect(run(editor, unsetMark(editor.schema.marks.strong!))).toBe(false);
  });

  it('removes the mark from a range', () => {
    const editor = createCoreEditor('<p><strong>abc</strong></p>');
    select(editor, 2, 3);
    expect(run(editor, unsetMark(editor.schema.marks.strong!))).toBe(true);
    expect(editor.getHTML()).toBe('<p><strong>a</strong>b<strong>c</strong></p>');
  });

  it('returns false when the range has no such mark', () => {
    const editor = createCoreEditor('<p>abc</p>');
    select(editor, 1, 3);
    expect(run(editor, unsetMark(editor.schema.marks.strong!))).toBe(false);
  });
});
