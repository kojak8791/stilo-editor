import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';

describe('clearFormatting()', () => {
  it.each([
    ['<p><strong><em>[ab]</em></strong></p>', true, '<p>[ab]</p>'],
    ['<p>a<strong>[b<em>c</em></strong>d]</p>', true, '<p>a[bcd]</p>'],
    ['<p><strong>a[b]c</strong></p>', true, '<p><strong>a</strong>[b]<strong>c</strong></p>'],
    ['<p><u><s>[a</s></u><code>b]</code></p>', true, '<p>[ab]</p>'],
    ['<p><a href="x"><strong>[ab]</strong></a></p>', true, '<p><a href="x">[ab]</a></p>'],
    ['<h1><strong>[a</strong></h1><p><em>b]</em></p>', true, '<h1>[a</h1><p>b]</p>'],
    [
      '<ul><li><strong>[a</strong></li><li><em>b]</em></li></ul>',
      true,
      '<ul><li>[a</li><li>b]</li></ul>',
    ],
    ['<p><strong>a|b</strong></p>', true, '<p><strong>a</strong>|<strong>b</strong></p>'],
    [
      '<p><a href="x"><strong>a|b</strong></a></p>',
      true,
      '<p><a href="x"><strong>a</strong>|<strong>b</strong></a></p>',
    ],
    ['<p><a href="x">[ab]</a></p>', false, '<p><a href="x">[ab]</a></p>'],
    ['<p>[ab]</p>', false, '<p>[ab]</p>'],
    ['<p>a|b</p>', false, '<p>a|b</p>'],
    ['<p><a href="x">a|b</a></p>', false, '<p><a href="x">a|b</a></p>'],
  ])('on %j returns %s and gives %j', (html, expectedReturn, expectedHtml) => {
    const editor = createTestEditor({ html });
    expect(editor.commands.clearFormatting()).toBe(expectedReturn);
    expect(getHTMLWithSelection(editor)).toBe(expectedHtml);
  });
});

describe('clearFormatting: multi-step', () => {
  it('clears with Mod-\\', () => {
    const editor = createTestEditor({ html: '<p><strong>[ab]</strong></p>' });
    expect(pressKey(editor, 'Mod-\\')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it('clearFormatting.can() is true/false as expected', () => {
    const editor1 = createTestEditor({ html: '<p><strong>[ab]</strong></p>' });
    expect(editor1.commands.clearFormatting.can()).toBe(true);
    const editor2 = createTestEditor({ html: '<p>[ab]</p>' });
    expect(editor2.commands.clearFormatting.can()).toBe(false);
  });

  it('applies stored marks after clearFormatting', () => {
    const editor = createTestEditor({ html: '<p><strong>a|b</strong></p>' });
    editor.commands.clearFormatting();
    typeText(editor, 'c');
    expect(getHTMLWithSelection(editor)).toBe('<p><strong>a</strong>c|<strong>b</strong></p>');
  });

  it('undoes clearFormatting', () => {
    const editor = createTestEditor({ html: '<p><strong>[ab]</strong></p>' });
    editor.commands.clearFormatting();
    expect(editor.commands.undo()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><strong>[ab]</strong></p>');
  });
});
