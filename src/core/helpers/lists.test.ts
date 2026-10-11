import { describe, expect, it } from 'vitest';
import { getHTMLWithSelection } from '../../../tests/helpers';
import { createCoreEditor, select } from '../../../tests/helpers/core';
import type { Editor } from '../editor';
import { toggleList } from './lists';

function toggle(editor: Editor, name: 'list' | 'numbered'): boolean {
  const { nodes } = editor.schema;
  return toggleList(nodes[name]!, nodes.item!)(editor.state, (tr) => editor.view.dispatch(tr));
}

describe('toggleList', () => {
  it('wraps the selected blocks in a new list', () => {
    const editor = createCoreEditor('<p>a</p><p>b</p>');
    select(editor, 2, 5);
    expect(toggle(editor, 'list')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<ul><li>a[</li><li>b]</li></ul>');
  });

  it('lifts the items out of a list of the same type', () => {
    const editor = createCoreEditor('<ul><li>a</li><li>b</li></ul>');
    select(editor, 3);
    expect(toggle(editor, 'list')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>|a</p><ul><li>b</li></ul>');
  });

  it('converts a list of another type, keeping its items', () => {
    const editor = createCoreEditor('<ul><li>a</li><li>b</li></ul>');
    select(editor, 3);
    expect(toggle(editor, 'numbered')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<ol><li>|a</li><li>b</li></ol>');
  });

  it('converts only the nearest list', () => {
    const editor = createCoreEditor('<ul><li><p>a</p><ul><li>b</li></ul></li></ul>');
    select(editor, 8);
    expect(toggle(editor, 'numbered')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<ul><li><p>a</p><ol><li>|b</li></ol></li></ul>');
  });

  it('does not dispatch in a dry run', () => {
    const editor = createCoreEditor('<p>a</p>');
    select(editor, 1);
    const { nodes } = editor.schema;
    expect(toggleList(nodes.list!, nodes.item!)(editor.state)).toBe(true);
    expect(editor.getHTML()).toBe('<p>a</p>');
  });
});
