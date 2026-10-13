import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';

describe('Bold: parse and serialize', () => {
  it.each([
    ['<p><strong>a</strong></p>', '<p><strong>a</strong></p>'],
    ['<p><b>a</b></p>', '<p><strong>a</strong></p>'],
    ['<p><span style="font-weight: bold">a</span></p>', '<p><strong>a</strong></p>'],
    ['<p><span style="font-weight: 600">a</span></p>', '<p><strong>a</strong></p>'],
    ['<p><span style="font-weight: 900">a</span></p>', '<p><strong>a</strong></p>'],
    ['<p><span style="font-weight: 500">a</span></p>', '<p>a</p>'],
    ['<p><span style="font-weight: normal">a</span></p>', '<p>a</p>'],
    ['<b style="font-weight: normal"><p>a</p></b>', '<p>a</p>'],
    ['<b style="font-weight:normal"><p><b>a</b>b</p></b>', '<p><strong>a</strong>b</p>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({ html: '<p>a <b>b</b> <strong>c</strong></p>' });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });
});

describe('Bold: commands', () => {
  it.each([
    ['setBold', '<p>a[b]c</p>', '<p>a<strong>[b]</strong>c</p>'],
    ['setBold', '<p><strong>a[b</strong>c]</p>', '<p><strong>a[bc]</strong></p>'],
    [
      'unsetBold',
      '<p><strong>a[b]c</strong></p>',
      '<p><strong>a</strong>[b]<strong>c</strong></p>',
    ],
    ['toggleBold', '<p>a[b]c</p>', '<p>a<strong>[b]</strong>c</p>'],
    ['toggleBold', '<p><strong>[ab]</strong></p>', '<p>[ab]</p>'],
    ['toggleBold', '<p><strong>[a</strong>b]</p>', '<p><strong>[ab]</strong></p>'],
  ] as const)('%s on %j gives %j', (command, html, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('applies to the next typed text with an empty selection', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(editor.commands.toggleBold()).toBe(true);
    typeText(editor, 'b');
    expect(getHTMLWithSelection(editor)).toBe('<p>a<strong>b|</strong></p>');
    expect(editor.commands.toggleBold()).toBe(true);
    typeText(editor, 'c');
    expect(getHTMLWithSelection(editor)).toBe('<p>a<strong>b</strong>c|</p>');
  });

  it('returns false for unsetBold where there is no bold, without changes', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(editor.commands.unsetBold.can()).toBe(false);
    expect(editor.commands.unsetBold()).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it('reports the active state', () => {
    const editor = createTestEditor({ html: '<p><strong>a|b</strong>c</p>' });
    expect(editor.isActive('bold')).toBe(true);
    expect(createTestEditor({ html: '<p><strong>[a</strong>b]</p>' }).isActive('bold')).toBe(false);
  });
});

describe('Bold: shortcut and input rule', () => {
  it('toggles with Mod-b', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(pressKey(editor, 'Mod-b')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><strong>[ab]</strong></p>');
    pressKey(editor, 'Mod-b');
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it.each([
    ['<p>|</p>', '**ab**', '<p><strong>ab</strong>|</p>'],
    ['<p>x |</p>', '**ab** c', '<p>x <strong>ab</strong> c|</p>'],
    ['<p>|</p>', '***ab**', '<p>***ab**|</p>'],
  ])('in %j, typing %j gives %j', (html, text, expected) => {
    const editor = createTestEditor({ html });
    typeText(editor, text);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});
