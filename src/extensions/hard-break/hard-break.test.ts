import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey } from '../../../tests/helpers';

describe('HardBreak: parse and serialize', () => {
  it.each([
    ['<p>a<br>b</p>', '<p>a<br>b</p>'],
    ['<p><strong>a<br>b</strong></p>', '<p><strong>a<br>b</strong></p>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({ html: '<p>a<br>b</p>' });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });

  it('getText returns newlines for breaks', () => {
    const editor = createTestEditor({ html: '<p>a<br>b</p><h1>c</h1>' });
    expect(editor.getText()).toBe('a\nb\n\nc');
  });
});

describe('HardBreak: commands', () => {
  it.each([
    ['setHardBreak', '<p>a|b</p>', '<p>a<br>|b</p>', true],
    ['setHardBreak', '<p>a[b]c</p>', '<p>a<br>|c</p>', true],
  ] as const)('%s on %j gives %j (returns %s)', (command, html, expected, returns) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(returns);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});

describe('HardBreak: keymap', () => {
  it('toggles with Shift-Enter', () => {
    const editor = createTestEditor({
      html: '<p><strong>a|b</strong></p>',
    });
    expect(pressKey(editor, 'Shift-Enter')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><strong>a<br>|b</strong></p>');
  });
});
