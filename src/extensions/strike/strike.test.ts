import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';

describe('Strike: parse and serialize', () => {
  it.each([
    ['<p><s>a</s></p>', '<p><s>a</s></p>'],
    ['<p><del>a</del></p>', '<p><s>a</s></p>'],
    ['<p><strike>a</strike></p>', '<p><s>a</s></p>'],
    ['<p><span style="text-decoration: line-through">a</span></p>', '<p><s>a</s></p>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html: '<p><s>a</s><del>b</del><strike>c</strike><span style="text-decoration: line-through">d</span></p>',
    });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });

  it('combines with underline', () => {
    expect(
      createTestEditor({
        html: '<p><span style="text-decoration: underline line-through">a</span></p>',
      }).getHTML(),
    ).toBe('<p><u><s>a</s></u></p>');
  });
});

describe('Strike: commands', () => {
  it.each([
    ['setStrike', '<p>a[b]c</p>', '<p>a<s>[b]</s>c</p>'],
    ['setStrike', '<p><s>a[b</s>c]</p>', '<p><s>a[bc]</s></p>'],
    ['unsetStrike', '<p><s>a[b]c</s></p>', '<p><s>a</s>[b]<s>c</s></p>'],
    ['toggleStrike', '<p>a[b]c</p>', '<p>a<s>[b]</s>c</p>'],
    ['toggleStrike', '<p><s>[ab]</s></p>', '<p>[ab]</p>'],
    ['toggleStrike', '<p><s>[a</s>b]</p>', '<p><s>[ab]</s></p>'],
  ] as const)('%s on %j gives %j', (command, html, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('applies to the next typed text with an empty selection', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(editor.commands.toggleStrike()).toBe(true);
    typeText(editor, 'b');
    expect(getHTMLWithSelection(editor)).toBe('<p>a<s>b|</s></p>');
    expect(editor.commands.toggleStrike()).toBe(true);
    typeText(editor, 'c');
    expect(getHTMLWithSelection(editor)).toBe('<p>a<s>b</s>c|</p>');
  });

  it('returns false for unsetStrike where there is no strike, without changes', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(editor.can().unsetStrike()).toBe(false);
    expect(editor.commands.unsetStrike()).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it('reports the active state', () => {
    const editor = createTestEditor({ html: '<p><s>a|b</s>c</p>' });
    expect(editor.isActive('strike')).toBe(true);
    expect(createTestEditor({ html: '<p><s>[a</s>b]</p>' }).isActive('strike')).toBe(false);
  });
});

describe('Strike: shortcut and input rule', () => {
  it('toggles with Mod-Shift-s', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(pressKey(editor, 'Mod-Shift-s')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><s>[ab]</s></p>');
    pressKey(editor, 'Mod-Shift-s');
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it.each([
    ['<p>|</p>', '~~ab~~', '<p><s>ab</s>|</p>'],
    ['<p>|</p>', '~ab~', '<p>~ab~|</p>'],
  ])('in %j, typing %j gives %j', (html, text, expected) => {
    const editor = createTestEditor({ html });
    typeText(editor, text);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});
