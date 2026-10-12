import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';
import { StarterKit } from '../starter-kit';

describe('History: undo/redo', () => {
  it('returns false when nothing to undo/redo', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(editor.can().undo()).toBe(false);
    expect(editor.can().redo()).toBe(false);
    expect(editor.commands.undo()).toBe(false);
  });

  it('undoes and redoes typeText', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    typeText(editor, 'bc');
    expect(getHTMLWithSelection(editor)).toBe('<p>abc|</p>');
    expect(editor.commands.undo()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|</p>');
    expect(editor.commands.redo()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>abc|</p>');
  });

  it('undoes and redoes pressKey', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    typeText(editor, 'bc');
    expect(pressKey(editor, 'Mod-z')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|</p>');
    expect(pressKey(editor, 'Mod-Shift-z')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>abc|</p>');
    pressKey(editor, 'Mod-z');
    expect(pressKey(editor, 'Mod-y')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>abc|</p>');
  });

  it('undoes and redoes toggleBold', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    editor.commands.toggleBold();
    expect(editor.commands.undo()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
    expect(editor.commands.redo()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><strong>[ab]</strong></p>');
  });

  it('undoes setHTML', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    typeText(editor, 'b');
    editor.setHTML('<p>x</p>');
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getHTML()).toBe('<p>ab</p>');
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getHTML()).toBe('<p>a</p>');
  });

  it('resetHistory clears the history', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    editor.setHTML('<p>y</p>', { resetHistory: true });
    expect(editor.can().undo()).toBe(false);
  });

  it('returns false when history is disabled', () => {
    const editor = createTestEditor({
      html: '<p>a|</p>',
      extensions: [StarterKit({ history: false })],
    });
    expect(pressKey(editor, 'Mod-z')).toBe(false);
  });
});

describe('History: options', () => {
  // Only `Date` is faked: prosemirror-history reads the transaction time from `Date.now()`.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [{}, 400, '<p>a|</p>'],
    [{}, 1000, '<p>ab|</p>'],
    [{ newGroupDelay: 2000 }, 1000, '<p>a|</p>'],
  ])('with %j and %i ms between two characters, undo gives %j', (history, ms, expected) => {
    const editor = createTestEditor({ html: '<p>a|</p>', extensions: [StarterKit({ history })] });
    typeText(editor, 'b');
    vi.advanceTimersByTime(ms);
    typeText(editor, 'c');
    expect(editor.commands.undo()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('keeps about `depth` undo steps', () => {
    const undoSteps = (depth: number) => {
      const editor = createTestEditor({
        html: '<p>|</p>',
        extensions: [StarterKit({ history: { depth } })],
      });
      for (let i = 0; i < 60; i++) {
        typeText(editor, 'a');
        vi.advanceTimersByTime(1000);
      }
      let steps = 0;
      while (editor.commands.undo()) steps++;
      return steps;
    };
    expect(undoSteps(100)).toBe(60);
    expect(undoSteps(3)).toBeLessThan(60);
  });
});
