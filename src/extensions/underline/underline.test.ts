import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';

describe('Underline: parse and serialize', () => {
  it.each([
    ['<p><u>a</u></p>', '<p><u>a</u></p>'],
    ['<p><span style="text-decoration: underline">a</span></p>', '<p><u>a</u></p>'],
    ['<p><span style="text-decoration-line: underline">a</span></p>', '<p><u>a</u></p>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html: '<p><u>a</u><span style="text-decoration: underline">b</span><span style="text-decoration-line: underline">c</span></p>',
    });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });

  it('combines with strike', () => {
    expect(
      createTestEditor({
        html: '<p><span style="text-decoration: underline line-through">a</span></p>',
      }).getHTML(),
    ).toBe('<p><u><s>a</s></u></p>');
  });
});

describe('Underline: commands', () => {
  it.each([
    ['setUnderline', '<p>a[b]c</p>', '<p>a<u>[b]</u>c</p>'],
    ['setUnderline', '<p><u>a[b</u>c]</p>', '<p><u>a[bc]</u></p>'],
    ['unsetUnderline', '<p><u>a[b]c</u></p>', '<p><u>a</u>[b]<u>c</u></p>'],
    ['toggleUnderline', '<p>a[b]c</p>', '<p>a<u>[b]</u>c</p>'],
    ['toggleUnderline', '<p><u>[ab]</u></p>', '<p>[ab]</p>'],
    ['toggleUnderline', '<p><u>[a</u>b]</p>', '<p><u>[ab]</u></p>'],
  ] as const)('%s on %j gives %j', (command, html, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('applies to the next typed text with an empty selection', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(editor.commands.toggleUnderline()).toBe(true);
    typeText(editor, 'b');
    expect(getHTMLWithSelection(editor)).toBe('<p>a<u>b|</u></p>');
    expect(editor.commands.toggleUnderline()).toBe(true);
    typeText(editor, 'c');
    expect(getHTMLWithSelection(editor)).toBe('<p>a<u>b</u>c|</p>');
  });

  it('returns false for unsetUnderline where there is no underline, without changes', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(editor.commands.unsetUnderline.can()).toBe(false);
    expect(editor.commands.unsetUnderline()).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it('reports the active state', () => {
    const editor = createTestEditor({ html: '<p><u>a|b</u>c</p>' });
    expect(editor.isActive('underline')).toBe(true);
    expect(createTestEditor({ html: '<p><u>[a</u>b]</p>' }).isActive('underline')).toBe(false);
  });
});

describe('Underline: shortcut', () => {
  it('toggles with Mod-u', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(pressKey(editor, 'Mod-u')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><u>[ab]</u></p>');
    pressKey(editor, 'Mod-u');
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });
});
