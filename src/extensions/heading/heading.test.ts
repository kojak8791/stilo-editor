import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';

describe('Heading: parse and serialize', () => {
  it.each([
    [
      '<h1>a</h1><h2>b</h2><h3>c</h3><h4>d</h4><h5>e</h5><h6>f</h6>',
      '<h1>a</h1><h2>b</h2><h3>c</h3><h4>d</h4><h5>e</h5><h6>f</h6>',
    ],
    ['<h2>a <strong>b</strong></h2>', '<h2>a <strong>b</strong></h2>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('ignores h4 when levels are [1,2,3]', () => {
    const editor = createTestEditor({
      html: '<h1>a</h1><h4>d</h4>',
      extensions: [defaultExtensions({ heading: { levels: [1, 2, 3] } })],
    });
    expect(editor.getHTML()).toBe('<h1>a</h1><p>d</p>');
  });

  it('is idempotent', () => {
    const editor = createTestEditor({ html: '<h1>a</h1><h2>b</h2>' });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });
});

describe('Heading: commands', () => {
  it.each([
    ['setHeading', '<p>a|b</p>', { level: 2 as HeadingLevel }, '<h2>a|b</h2>', true],
    ['toggleHeading', '<h2>a|b</h2>', { level: 2 as HeadingLevel }, '<p>a|b</p>', true],
    ['toggleHeading', '<h2>a|b</h2>', { level: 3 as HeadingLevel }, '<h3>a|b</h3>', true],
    [
      'setHeading',
      '<p>[a</p><p>b]</p>',
      { level: 1 as HeadingLevel },
      '<h1>[a</h1><h1>b]</h1>',
      true,
    ],
    ['setHeading', '<p>a|b</p>', { level: 1 as HeadingLevel }, '<h1>a|b</h1>', true],
  ] as const)('%s on %j with level returns %s', (command, html, attrs, expected, returns) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command](attrs)).toBe(returns);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('returns false for setHeading with disallowed level', () => {
    const editor = createTestEditor({
      html: '<p>a|b</p>',
      extensions: [defaultExtensions({ heading: { levels: [1, 2, 3] } })],
    });
    expect(editor.commands.setHeading({ level: 4 as HeadingLevel })).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|b</p>');
  });
});

describe('Heading: keymap', () => {
  it.each([
    ['<p>a|b</p>', 'Mod-Alt-1', '<h1>a|b</h1>', true],
    ['<p>a|b</p>', 'Mod-Alt-6', '<h6>a|b</h6>', true],
  ] as const)('pressKey %j on %j gives %j (returns %s)', (html, combo, expected, returns) => {
    const editor = createTestEditor({ html });
    expect(pressKey(editor, combo)).toBe(returns);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('returns false for Mod-Alt-4 when levels are [1,2,3]', () => {
    const editor = createTestEditor({
      html: '<p>a|b</p>',
      extensions: [defaultExtensions({ heading: { levels: [1, 2, 3] } })],
    });
    expect(pressKey(editor, 'Mod-Alt-4')).toBe(false);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|b</p>');
  });

  it('splits a heading with Enter', () => {
    const editor = createTestEditor({ html: '<h1>ab|</h1>' });
    expect(pressKey(editor, 'Enter')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<h1>ab</h1><p>|</p>');
  });
});

describe('Heading: input rule', () => {
  it.each([
    ['<p>|</p>', '# a', '<h1>a|</h1>'],
    ['<p>|</p>', '### a', '<h3>a|</h3>'],
    ['<p>|</p>', '###### a', '<h6>a|</h6>'],
    ['<p>|</p>', '####### a', '<p>####### a|</p>'],
    ['<p>|</p>', '#a', '<p>#a|</p>'],
    ['<p>x|</p>', '# a', '<p>x# a|</p>'],
    ['<p>|x</p>', '## ', '<h2>|x</h2>'],
  ])('in %j, typing %j gives %j', (html, text, expected) => {
    const editor = createTestEditor({ html });
    typeText(editor, text);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it.each([
    ['<p style="text-align: center">|a</p>', '# ', '<h1 style="text-align: center">|a</h1>'],
    [
      '<p style="text-align: right; line-height: 1.5">|a</p>',
      '## ',
      '<h2 style="text-align: right; line-height: 1.5">|a</h2>',
    ],
    ['<h1 style="line-height: 2">|a</h1>', '### ', '<h3 style="line-height: 2">|a</h3>'],
  ])('keeps the block styles: in %j, typing %j gives %j', (html, text, expected) => {
    const editor = createTestEditor({ html });
    typeText(editor, text);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('Backspace right after the rule restores the paragraph with its styles', () => {
    const editor = createTestEditor({ html: '<p style="text-align: center">|a</p>' });
    typeText(editor, '# ');
    expect(pressKey(editor, 'Backspace')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p style="text-align: center"># |a</p>');
  });

  it('ignores #### when levels are [1,2,3]', () => {
    const editor = createTestEditor({
      html: '<p>|</p>',
      extensions: [defaultExtensions({ heading: { levels: [1, 2, 3] } })],
    });
    typeText(editor, '#### a');
    expect(getHTMLWithSelection(editor)).toBe('<p>#### a|</p>');
  });
});

import { defaultExtensions } from '../default-extensions';
import type { HeadingLevel } from './index';
