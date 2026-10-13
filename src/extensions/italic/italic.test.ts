import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';

describe('Italic: parse and serialize', () => {
  it.each([
    ['<p><em>a</em></p>', '<p><em>a</em></p>'],
    ['<p><i>a</i></p>', '<p><em>a</em></p>'],
    ['<p><span style="font-style: italic">a</span></p>', '<p><em>a</em></p>'],
    ['<p><span style="font-style: oblique">a</span></p>', '<p>a</p>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html: '<p><em>a</em><i>b</i><span style="font-style: italic">c</span></p>',
    });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });

  it('nests with other marks per priority', () => {
    expect(
      createTestEditor({
        html: '<p><s><u><em><strong>a</strong></em></u></s></p>',
      }).getHTML(),
    ).toBe('<p><strong><em><u><s>a</s></u></em></strong></p>');
  });
});

describe('Italic: commands', () => {
  it.each([
    ['setItalic', '<p>a[b]c</p>', '<p>a<em>[b]</em>c</p>'],
    ['setItalic', '<p><em>a[b</em>c]</p>', '<p><em>a[bc]</em></p>'],
    ['unsetItalic', '<p><em>a[b]c</em></p>', '<p><em>a</em>[b]<em>c</em></p>'],
    ['toggleItalic', '<p>a[b]c</p>', '<p>a<em>[b]</em>c</p>'],
    ['toggleItalic', '<p><em>[ab]</em></p>', '<p>[ab]</p>'],
    ['toggleItalic', '<p><em>[a</em>b]</p>', '<p><em>[ab]</em></p>'],
  ] as const)('%s on %j gives %j', (command, html, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('applies to the next typed text with an empty selection', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(editor.commands.toggleItalic()).toBe(true);
    typeText(editor, 'b');
    expect(getHTMLWithSelection(editor)).toBe('<p>a<em>b|</em></p>');
    expect(editor.commands.toggleItalic()).toBe(true);
    typeText(editor, 'c');
    expect(getHTMLWithSelection(editor)).toBe('<p>a<em>b</em>c|</p>');
  });

  it('returns false for unsetItalic where there is no italic, without changes', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(editor.commands.unsetItalic.can()).toBe(false);
    expect(editor.commands.unsetItalic()).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it('reports the active state', () => {
    const editor = createTestEditor({ html: '<p><em>a|b</em>c</p>' });
    expect(editor.isActive('italic')).toBe(true);
    expect(createTestEditor({ html: '<p><em>[a</em>b]</p>' }).isActive('italic')).toBe(false);
  });
});

describe('Italic: shortcut and input rule', () => {
  it('toggles with Mod-i', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(pressKey(editor, 'Mod-i')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><em>[ab]</em></p>');
    pressKey(editor, 'Mod-i');
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it.each([
    ['<p>|</p>', '*ab*', '<p><em>ab</em>|</p>'],
    ['<p>x |</p>', '*ab* c', '<p>x <em>ab</em> c|</p>'],
    ['<p>|</p>', '**ab**', '<p><strong>ab</strong>|</p>'],
    ['<p>|</p>', '_ab_', '<p><em>ab</em>|</p>'],
    ['<p>x |</p>', '_ab_', '<p>x <em>ab</em>|</p>'],
    ['<p>|</p>', 'snake_case_', '<p>snake_case_|</p>'],
  ])('in %j, typing %j gives %j', (html, text, expected) => {
    const editor = createTestEditor({ html });
    typeText(editor, text);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});
