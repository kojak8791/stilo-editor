import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey } from '../../../tests/helpers';
import { Document, Paragraph, Superscript, Text } from '../index';

describe('Superscript: parse and serialize', () => {
  it.each([
    ['<p>x<sup>2</sup></p>', '<p>x<sup>2</sup></p>'],
    ['<p>x<span style="vertical-align: super">2</span></p>', '<p>x<sup>2</sup></p>'],
    ['<p><sub><sup>a</sup></sub></p>', '<p><sup>a</sup></p>'],
    ['<p><s><sup>a</sup></s></p>', '<p><s><sup>a</sup></s></p>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html: '<p>x<sup>2</sup> <span style="vertical-align: super">y</span> <u><sup>z</sup></u></p>',
    });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });

  it('works without Subscript in the schema', () => {
    const editor = createTestEditor({
      html: '<p>[a]</p>',
      extensions: [Document(), Text(), Paragraph(), Superscript()],
    });
    expect(editor.commands.toggleSuperscript()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><sup>[a]</sup></p>');
  });
});

describe('Superscript: commands', () => {
  it.each([
    ['setSuperscript', '<p>a[b]c</p>', '<p>a<sup>[b]</sup>c</p>'],
    ['setSuperscript', '<p>a<sub>[b]</sub>c</p>', '<p>a<sup>[b]</sup>c</p>'],
    ['unsetSuperscript', '<p><sup>a[b]c</sup></p>', '<p><sup>a</sup>[b]<sup>c</sup></p>'],
    ['toggleSuperscript', '<p>a[b]c</p>', '<p>a<sup>[b]</sup>c</p>'],
    ['toggleSuperscript', '<p><sup>[ab]</sup></p>', '<p>[ab]</p>'],
    ['toggleSuperscript', '<p><sub>[ab]</sub></p>', '<p><sup>[ab]</sup></p>'],
  ] as const)('%s on %j gives %j', (command, html, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('cannot be set inside code', () => {
    const editor = createTestEditor({ html: '<p><code>[ab]</code></p>' });
    expect(editor.can().toggleSuperscript()).toBe(false);
  });

  it('reports the active state', () => {
    expect(createTestEditor({ html: '<p><sup>a|b</sup></p>' }).isActive('superscript')).toBe(true);
    expect(createTestEditor({ html: '<p><sub>a|b</sub></p>' }).isActive('superscript')).toBe(false);
  });
});

describe('Superscript: shortcut', () => {
  it('toggles with Mod-.', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    expect(pressKey(editor, 'Mod-.')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><sup>[ab]</sup></p>');
    pressKey(editor, 'Mod-.');
    expect(getHTMLWithSelection(editor)).toBe('<p>[ab]</p>');
  });
});
