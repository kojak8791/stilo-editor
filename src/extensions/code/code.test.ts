import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';

describe('Code: parse and serialize', () => {
  it.each([['<p><code>a</code></p>', '<p><code>a</code></p>']])(
    'parses %j as %j',
    (html, expected) => {
      expect(createTestEditor({ html }).getHTML()).toBe(expected);
    },
  );

  it('is idempotent', () => {
    const editor = createTestEditor({ html: '<p><code>a</code></p>' });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });

  it('excludes formatting marks', () => {
    expect(createTestEditor({ html: '<p><strong><code>a</code></strong></p>' }).getHTML()).toBe(
      '<p><code>a</code></p>',
    );
    expect(createTestEditor({ html: '<p><code><em>a</em></code></p>' }).getHTML()).toBe(
      '<p><code>a</code></p>',
    );
  });
});

describe('Code: commands', () => {
  it.each([
    ['setCode', '<p>a[b]c</p>', '<p>a<code>[b]</code>c</p>'],
    ['setCode', '<p><code>a[b</code>c]</p>', '<p><code>a[bc]</code></p>'],
    ['unsetCode', '<p><code>a[b]c</code></p>', '<p><code>a</code>[b]<code>c</code></p>'],
    ['toggleCode', '<p>a[b]c</p>', '<p>a<code>[b]</code>c</p>'],
    ['toggleCode', '<p><code>[ab]</code></p>', '<p>[ab]</p>'],
    ['toggleCode', '<p><code>[a</code>b]</p>', '<p><code>[ab]</code></p>'],
  ] as const)('%s on %j gives %j', (command, html, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('applies to the next typed text with an empty selection', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(editor.commands.toggleCode()).toBe(true);
    typeText(editor, 'b');
    expect(getHTMLWithSelection(editor)).toBe('<p>a<code>b|</code></p>');
    expect(editor.commands.toggleCode()).toBe(true);
    typeText(editor, 'c');
    expect(getHTMLWithSelection(editor)).toBe('<p>a<code>b</code>c|</p>');
  });

  it('returns false for unsetCode where there is no code, without changes', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(editor.can().unsetCode()).toBe(false);
    expect(editor.commands.unsetCode()).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it('reports the active state', () => {
    const editor = createTestEditor({ html: '<p><code>a|b</code>c</p>' });
    expect(editor.isActive('code')).toBe(true);
    expect(createTestEditor({ html: '<p><code>[a</code>b]</p>' }).isActive('code')).toBe(false);
  });

  it('toggles code inside bold', () => {
    const editor = createTestEditor({ html: '<p><strong>[ab]</strong></p>' });
    expect(editor.commands.toggleCode()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><code>[ab]</code></p>');
  });

  it('blocks formatting marks inside code', () => {
    const editor = createTestEditor({ html: '<p><code>[ab]</code></p>' });
    expect(editor.can().toggleBold()).toBe(false);
    expect(editor.can().setItalic()).toBe(false);
  });
});

describe('Code: shortcut and input rule', () => {
  it('toggles with Mod-e', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(pressKey(editor, 'Mod-e')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><code>[ab]</code></p>');
    pressKey(editor, 'Mod-e');
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });

  it.each([['<p>|</p>', '`ab`', '<p><code>ab</code>|</p>']])(
    'in %j, typing %j gives %j',
    (html, text, expected) => {
      const editor = createTestEditor({ html });
      typeText(editor, text);
      expect(getHTMLWithSelection(editor)).toBe(expected);
    },
  );
});
