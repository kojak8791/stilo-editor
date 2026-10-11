import { describe, expect, it } from 'vitest';
import { createCoreEditor, select, selectNode } from '../../../tests/helpers/core';
import { attrsMatch, isMarkActive, isNodeActive } from './active';

describe('attrsMatch', () => {
  it('matches when every expected key is strictly equal', () => {
    expect(attrsMatch({ level: 2, id: 'x' }, { level: 2 })).toBe(true);
    expect(attrsMatch({ level: 2 }, { level: '2' })).toBe(false);
    expect(attrsMatch({ level: 2 }, { missing: undefined })).toBe(true);
    expect(attrsMatch({ level: 2 }, { missing: null })).toBe(false);
    expect(attrsMatch({ level: 2 })).toBe(true);
  });
});

describe('isMarkActive', () => {
  // <p><strong>ab</strong>cd</p>: "ab" is 1–3, "cd" is 3–5.
  const html = '<p><strong>ab</strong>cd</p>';

  it('uses the marks at the cursor for an empty selection', () => {
    const editor = createCoreEditor(html);
    const strong = editor.schema.marks.strong!;
    select(editor, 2);
    expect(isMarkActive(editor.state, strong)).toBe(true);
    select(editor, 4);
    expect(isMarkActive(editor.state, strong)).toBe(false);
  });

  it('prefers stored marks for an empty selection', () => {
    const editor = createCoreEditor(html);
    const strong = editor.schema.marks.strong!;
    select(editor, 4);
    editor.view.dispatch(editor.state.tr.addStoredMark(strong.create()));
    expect(isMarkActive(editor.state, strong)).toBe(true);
    select(editor, 2);
    editor.view.dispatch(editor.state.tr.setStoredMarks([]));
    expect(isMarkActive(editor.state, strong)).toBe(false);
  });

  it('requires the mark on every text node of a range', () => {
    const editor = createCoreEditor(html);
    const strong = editor.schema.marks.strong!;
    select(editor, 1, 3);
    expect(isMarkActive(editor.state, strong)).toBe(true);
    select(editor, 1, 4);
    expect(isMarkActive(editor.state, strong)).toBe(false);
  });

  it('is false for a range without text', () => {
    const editor = createCoreEditor('<p></p><p></p>');
    select(editor, 1, 3);
    expect(isMarkActive(editor.state, editor.schema.marks.strong!)).toBe(false);
  });
});

describe('isNodeActive', () => {
  it('checks the ancestors of the selection, including the document', () => {
    const editor = createCoreEditor('<h2>ab</h2>');
    const { title, doc, paragraph } = editor.schema.nodes;
    select(editor, 2);
    expect(isNodeActive(editor.state, title!)).toBe(true);
    expect(isNodeActive(editor.state, title!, { level: 2 })).toBe(true);
    expect(isNodeActive(editor.state, title!, { level: 1 })).toBe(false);
    expect(isNodeActive(editor.state, doc!)).toBe(true);
    expect(isNodeActive(editor.state, paragraph!)).toBe(false);
  });

  it('checks the node of a NodeSelection', () => {
    const editor = createCoreEditor('<p>a</p><hr>');
    selectNode(editor, 3);
    expect(isNodeActive(editor.state, editor.schema.nodes.rule!)).toBe(true);
  });
});
