import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';

describe('Blockquote: parse and serialize', () => {
  it.each([
    ['<blockquote><p>a</p><p>b</p></blockquote>', '<blockquote><p>a</p><p>b</p></blockquote>'],
    ['<blockquote>a</blockquote>', '<blockquote><p>a</p></blockquote>'],
    [
      '<blockquote><h1>t</h1><blockquote><p>n</p></blockquote></blockquote>',
      '<blockquote><h1>t</h1><blockquote><p>n</p></blockquote></blockquote>',
    ],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({ html: '<blockquote><p>a</p><p>b</p></blockquote>' });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });
});

describe('Blockquote: commands', () => {
  it.each([
    ['setBlockquote', '<p>a|b</p>', '<blockquote><p>a|b</p></blockquote>', true],
    ['setBlockquote', '<p>[a</p><p>b]</p>', '<blockquote><p>[a</p><p>b]</p></blockquote>', true],
    ['unsetBlockquote', '<blockquote><p>a|b</p></blockquote>', '<p>a|b</p>', true],
    ['unsetBlockquote', '<p>a|b</p>', '<p>a|b</p>', false],
    ['toggleBlockquote', '<blockquote><p>a|b</p></blockquote>', '<p>a|b</p>', true],
  ] as const)('%s on %j gives %j (returns %s)', (command, html, expected, returns) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(returns);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});

describe('Blockquote: keymap', () => {
  it('toggles with Mod-Shift-b', () => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    expect(pressKey(editor, 'Mod-Shift-b')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<blockquote><p>a|b</p></blockquote>');
  });
});

describe('Blockquote: input rule', () => {
  it.each([['<p>|</p>', '> a', '<blockquote><p>a|</p></blockquote>']])(
    'in %j, typing %j gives %j',
    (html, text, expected) => {
      const editor = createTestEditor({ html });
      typeText(editor, text);
      expect(getHTMLWithSelection(editor)).toBe(expected);
    },
  );
});
