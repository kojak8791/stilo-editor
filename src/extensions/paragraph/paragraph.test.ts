import { describe, expect, it } from 'vitest';
import { pressKey } from '../../../tests/helpers';
import { createCoreEditor, select } from '../../../tests/helpers/core';

// The core test editor has a `title` node (`<h1>`/`<h2>`) to convert from.
describe('Paragraph', () => {
  it('turns the selected textblocks into paragraphs with setParagraph', () => {
    const editor = createCoreEditor('<h1>a</h1><h2>b</h2>');
    select(editor, 1, 5);
    expect(editor.commands.setParagraph()).toBe(true);
    expect(editor.getHTML()).toBe('<p>a</p><p>b</p>');
  });

  it('returns false when the textblock is already a paragraph', () => {
    const editor = createCoreEditor('<p>a</p>');
    select(editor, 1);
    expect(editor.can().setParagraph()).toBe(false);
  });

  it('runs setParagraph with Mod-Alt-0', () => {
    const editor = createCoreEditor('<h1>a</h1>');
    select(editor, 1);
    expect(pressKey(editor, 'Mod-Alt-0')).toBe(true);
    expect(editor.getHTML()).toBe('<p>a</p>');
  });
});
