import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';
import { defaultExtensions } from '../default-extensions';

function assertPlaceholder(editor: ReturnType<typeof createTestEditor>, shown: boolean): void {
  const placeholderElements = editor.view.dom.querySelectorAll('.stilo-placeholder');
  const dataPlaceholderElements = editor.view.dom.querySelectorAll('[data-placeholder]');
  if (shown) {
    expect(placeholderElements.length).toBe(1);
    expect(placeholderElements[0]!.tagName).toBe('P');
    expect(placeholderElements[0]!.getAttribute('data-placeholder')).toBe('Write here');
    expect(dataPlaceholderElements.length).toBe(1);
  } else {
    expect(placeholderElements.length).toBe(0);
    expect(dataPlaceholderElements.length).toBe(0);
  }
}

describe('Placeholder: shown / hidden', () => {
  const base = { extensions: [defaultExtensions({ placeholder: { placeholder: 'Write here' } })] };

  it.each([
    ['', true, '<p></p>'],
    ['<p></p>', true, '<p></p>'],
    ['<p>a</p>', false, '<p>a</p>'],
    ['<p></p><p></p>', false, '<p></p><p></p>'],
    ['<h1></h1>', false, '<h1></h1>'],
    ['<blockquote><p></p></blockquote>', false, '<blockquote><p></p></blockquote>'],
    ['<hr>', false, '<hr>'],
  ])('html: %j → placeholder %s, getHTML: %j', (html, shown, expected) => {
    const editor = createTestEditor({ html, ...base });
    assertPlaceholder(editor, shown);
    expect(editor.getHTML()).toBe(expected);
  });
});

describe('Placeholder: multi-step', () => {
  it('typeText then undo', () => {
    const editor = createTestEditor({
      html: '',
      extensions: [defaultExtensions({ placeholder: { placeholder: 'Write here' } })],
    });
    assertPlaceholder(editor, true);
    typeText(editor, 'a');
    assertPlaceholder(editor, false);
    expect(editor.getHTML()).toBe('<p>a</p>');
    expect(editor.commands.undo()).toBe(true);
    assertPlaceholder(editor, true);
    expect(editor.getHTML()).toBe('<p></p>');
  });

  it('pressKey Backspace', () => {
    const editor = createTestEditor({
      html: '<p>[a]</p>',
      extensions: [defaultExtensions({ placeholder: { placeholder: 'Write here' } })],
    });
    assertPlaceholder(editor, false);
    expect(pressKey(editor, 'Backspace')).toBe(true);
    assertPlaceholder(editor, true);
    expect(getHTMLWithSelection(editor)).toBe('<p>|</p>');
  });

  it('setHTML', () => {
    const editor = createTestEditor({
      html: '<p>a</p>',
      extensions: [defaultExtensions({ placeholder: { placeholder: 'Write here' } })],
    });
    assertPlaceholder(editor, false);
    editor.setHTML('');
    assertPlaceholder(editor, true);
    editor.setHTML('<p>b</p>', { resetHistory: true });
    assertPlaceholder(editor, false);
    editor.setHTML('', { resetHistory: true });
    assertPlaceholder(editor, true);
  });

  it('setEditable(false) → still shown', () => {
    const editor = createTestEditor({
      html: '',
      extensions: [defaultExtensions({ placeholder: { placeholder: 'Write here' } })],
    });
    assertPlaceholder(editor, true);
    editor.setEditable(false);
    assertPlaceholder(editor, true);
  });

  it('default options → hidden', () => {
    const editor = createTestEditor({ html: '' });
    const placeholderElements = editor.view.dom.querySelectorAll('.stilo-placeholder');
    expect(placeholderElements.length).toBe(0);
  });
});
