import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';
import { Document, Paragraph, Subscript, Text } from '../index';

describe('Subscript: parse and serialize', () => {
  it.each([
    ['<p>H<sub>2</sub>O</p>', '<p>H<sub>2</sub>O</p>'],
    ['<p>H<span style="vertical-align: sub">2</span>O</p>', '<p>H<sub>2</sub>O</p>'],
    ['<p><span style="vertical-align: middle">a</span></p>', '<p>a</p>'],
    ['<p><sup><sub>a</sub></sup></p>', '<p><sub>a</sub></p>'],
    ['<p><strong><sub>a</sub></strong></p>', '<p><strong><sub>a</sub></strong></p>'],
    ['<p><code><sub>a</sub></code></p>', '<p><code>a</code></p>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html: '<p>H<sub>2</sub>O <span style="vertical-align: sub">x</span> <em><sub>y</sub></em></p>',
    });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });

  it('works without Superscript in the schema', () => {
    const editor = createTestEditor({
      html: '<p>[a]</p>',
      extensions: [Document(), Text(), Paragraph(), Subscript()],
    });
    expect(editor.commands.toggleSubscript()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><sub>[a]</sub></p>');
  });
});

describe('Subscript: commands', () => {
  it.each([
    ['setSubscript', '<p>a[b]c</p>', '<p>a<sub>[b]</sub>c</p>'],
    ['setSubscript', '<p>a<sup>[b]</sup>c</p>', '<p>a<sub>[b]</sub>c</p>'],
    ['setSubscript', '<p><sup>a[b]c</sup></p>', '<p><sup>a</sup><sub>[b]</sub><sup>c</sup></p>'],
    ['unsetSubscript', '<p><sub>a[b]c</sub></p>', '<p><sub>a</sub>[b]<sub>c</sub></p>'],
    ['toggleSubscript', '<p>a[b]c</p>', '<p>a<sub>[b]</sub>c</p>'],
    ['toggleSubscript', '<p><sub>[ab]</sub></p>', '<p>[ab]</p>'],
    ['toggleSubscript', '<p><sup>[ab]</sup></p>', '<p><sub>[ab]</sub></p>'],
  ] as const)('%s on %j gives %j', (command, html, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('replaces superscript in the next typed text with an empty selection', () => {
    const editor = createTestEditor({ html: '<p><sup>a|</sup></p>' });
    expect(editor.commands.toggleSubscript()).toBe(true);
    typeText(editor, 'b');
    expect(getHTMLWithSelection(editor)).toBe('<p><sup>a</sup><sub>b|</sub></p>');
  });

  it('cannot be set inside code', () => {
    const editor = createTestEditor({ html: '<p><code>[ab]</code></p>' });
    expect(editor.can().toggleSubscript()).toBe(false);
  });

  it('reports the active state', () => {
    expect(createTestEditor({ html: '<p><sub>a|b</sub></p>' }).isActive('subscript')).toBe(true);
    expect(createTestEditor({ html: '<p><sup>a|b</sup></p>' }).isActive('subscript')).toBe(false);
  });
});

describe('Subscript: shortcut', () => {
  it('toggles with Mod-,', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(pressKey(editor, 'Mod-,')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><sub>[ab]</sub></p>');
    pressKey(editor, 'Mod-,');
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });
});
