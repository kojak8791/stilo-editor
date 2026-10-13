import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection } from '../../../tests/helpers';

describe('Text: insertText', () => {
  it.each([
    ['<p>a|b</p>', '€', '<p>a€|b</p>'],
    ['<p>a[bc]d</p>', '→', '<p>a→|d</p>'],
    ['<p><strong>a|</strong></p>', '©', '<p><strong>a©|</strong></p>'],
    ['<p>a|</p>', '👍', '<p>a👍|</p>'],
    ['<p>[a</p><p>b]</p>', 'x', '<p>x|</p>'],
  ])('in %j, inserting %j gives %j', (html, text, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands.insertText(text)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('returns false for an empty string, without changes', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(editor.commands.insertText.can('')).toBe(false);
    expect(editor.commands.insertText('')).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|</p>');
  });

  it('applies the stored marks', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    editor.commands.toggleItalic();
    editor.commands.insertText('½');
    expect(getHTMLWithSelection(editor)).toBe('<p>a<em>½|</em></p>');
  });
});
