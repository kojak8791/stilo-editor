import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey } from '../../../tests/helpers';
import type { Editor } from '../../core/editor';

const ul = (items: string) => `<ul data-type="taskList">${items}</ul>`;
const li = (checked: boolean, content: string) => `<li data-checked="${checked}">${content}</li>`;

/** jsdom fires `change` only for a checkbox in the document. */
function createMountedEditor(html: string): Editor {
  const editor = createTestEditor({ html });
  document.body.append(editor.view.dom);
  return editor;
}

function checkboxes(editor: Editor): HTMLInputElement[] {
  return [...editor.view.dom.querySelectorAll<HTMLInputElement>('input.stilo-task-item__checkbox')];
}

describe('TaskItem: keymap', () => {
  it.each([
    ['at the end', ul(li(true, 'ab|')), ul(li(true, 'ab') + li(false, '|'))],
    ['in the middle', ul(li(true, 'a|b')), ul(li(true, 'a') + li(true, '|b'))],
    ['at the start, checked', ul(li(true, '|ab')), ul(li(false, '') + li(true, '|ab'))],
    ['at the start, unchecked', ul(li(false, '|ab')), ul(li(false, '') + li(false, '|ab'))],
    ['in an empty last item', ul(li(true, 'a') + li(true, '|')), `${ul(li(true, 'a'))}<p>|</p>`],
    [
      'in an empty nested item',
      ul(li(true, `<p>a</p>${ul(li(true, '|'))}`)),
      ul(li(true, 'a') + li(false, '|')),
    ],
  ])('splits with Enter %s', (_name, html, expected) => {
    const editor = createTestEditor({ html });
    expect(pressKey(editor, 'Enter')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('nests with Tab and lifts with Shift-Tab', () => {
    const editor = createTestEditor({ html: ul(li(false, 'a') + li(true, 'b|')) });
    expect(pressKey(editor, 'Tab')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(ul(li(false, `<p>a</p>${ul(li(true, 'b|'))}`)));
    expect(pressKey(editor, 'Shift-Tab')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(ul(li(false, 'a') + li(true, 'b|')));
  });

  it('lifts out of the list with Shift-Tab at the top level', () => {
    const editor = createTestEditor({ html: ul(li(true, 'a|')) });
    expect(pressKey(editor, 'Shift-Tab')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|</p>');
  });

  it.each([
    [
      'at the start of an item',
      ul(li(false, 'a') + li(true, '|b')),
      `${ul(li(false, 'a'))}<p>|b</p>`,
    ],
    ['right after a task list', `${ul(li(true, 'a'))}<p>|b</p>`, ul(li(true, 'a|b'))],
    [
      'right after a nested task list',
      `${ul(li(true, `<p>a</p>${ul(li(false, 'b'))}`))}<p>|</p>`,
      ul(li(true, `<p>a</p>${ul(li(false, 'b|'))}`)),
    ],
  ])('handles Backspace %s', (_name, html, expected) => {
    const editor = createTestEditor({ html });
    expect(pressKey(editor, 'Backspace')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it.each([
    ['an unchecked item', ul(li(false, 'a|')), ul(li(true, 'a|'))],
    ['a checked item', ul(li(true, 'a|')), ul(li(false, 'a|'))],
    ['mixed items', ul(li(true, '[a') + li(false, 'b]')), ul(li(true, '[a') + li(true, 'b]'))],
    ['checked items', ul(li(true, '[a') + li(true, 'b]')), ul(li(false, '[a') + li(false, 'b]'))],
    [
      'the innermost item only',
      ul(li(false, `<p>a</p>${ul(li(false, 'b|'))}`)),
      ul(li(false, `<p>a</p>${ul(li(true, 'b|'))}`)),
    ],
    [
      'the second paragraph of an item',
      ul(li(false, '<p>a</p><p>b|</p>')),
      ul(li(true, '<p>a</p><p>b|</p>')),
    ],
    [
      'a task list in a list item',
      `<ul><li><p>a</p>${ul(li(false, 'b|'))}</li></ul>`,
      `<ul><li><p>a</p>${ul(li(true, 'b|'))}</li></ul>`,
    ],
  ])('toggles %s with Mod-Enter', (_name, html, expected) => {
    const editor = createTestEditor({ html });
    expect(pressKey(editor, 'Mod-Enter')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it.each([
    ['outside a task item', '<ul><li>a|</li></ul>'],
    ['in a code block', ul(li(false, '<p>a</p><pre><code>b|</code></pre>'))],
  ])('leaves Mod-Enter alone %s', (_name, html) => {
    const editor = createTestEditor({ html });
    expect(editor.commands.toggleTaskChecked.can()).toBe(false);
    expect(editor.commands.toggleTaskChecked()).toBe(false);
  });
});

describe('TaskItem: checkbox', () => {
  it('shows the checked state', () => {
    const editor = createTestEditor({ html: ul(li(true, 'a') + li(false, 'b')) });
    expect(checkboxes(editor).map((box) => box.checked)).toEqual([true, false]);
    editor.commands.toggleTaskChecked();
    expect(checkboxes(editor).map((box) => box.checked)).toEqual([false, false]);
  });

  it('sets checked on click, in one undo step', () => {
    const editor = createMountedEditor(ul(li(false, 'a|') + li(false, 'b')));
    checkboxes(editor)[1]!.click();
    expect(getHTMLWithSelection(editor)).toBe(ul(li(false, 'a|') + li(true, 'b')));
    expect(pressKey(editor, 'Mod-z')).toBe(true);
    expect(editor.getHTML()).toBe(ul(li(false, 'a') + li(false, 'b')));
    expect(checkboxes(editor)[1]!.checked).toBe(false);
  });

  it('does nothing on click when the editor is not editable', () => {
    const editor = createMountedEditor(ul(li(false, 'a')));
    editor.setEditable(false);
    checkboxes(editor)[0]!.click();
    expect(checkboxes(editor)[0]!.checked).toBe(false);
    expect(editor.getHTML()).toBe(ul(li(false, 'a')));
  });

  it('keeps the checkbox out of the HTML output and the text', () => {
    const editor = createTestEditor({ html: ul(li(true, 'a')) });
    expect(editor.getHTML()).toBe(ul(li(true, 'a')));
    expect(editor.getText()).toBe('a');
  });
});
