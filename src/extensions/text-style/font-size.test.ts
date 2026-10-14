import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createTestEditor,
  getHTMLWithSelection,
  mockRenderedFontSizes,
  typeText,
} from '../../../tests/helpers';
import { getFontSize, toFontSize } from '../index';

function setup(html: string, rootSize?: string) {
  const editor = createTestEditor({ html });
  document.body.append(editor.view.dom.parentElement!);
  mockRenderedFontSizes(rootSize);
  return editor;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('getFontSize', () => {
  it.each([
    ['<p>a|b</p>', 'pt', 12],
    ['<p>a|b</p>', 'px', 16],
    ['<h1>a|b</h1>', 'pt', 24],
    ['<p><span style="font-size: 11pt">a|b</span></p>', 'pt', 11],
    ['<p><span style="font-size: 11pt">a|b</span></p>', 'px', 14.7],
    ['<p><span style="font-size: 18px">a|b</span></p>', 'pt', 13.5],
    ['<p><span style="font-size: 18px">a|b</span></p>', 'rem', 18],
  ] as const)('in %j measures %s %s', (html, unit, expected) => {
    expect(getFontSize(setup(html), unit)).toBe(expected);
  });

  it('counts 16px where nothing can be measured', () => {
    const editor = setup('<p>a|b</p>');
    vi.mocked(window.getComputedStyle).mockReturnValue({ fontSize: '' } as CSSStyleDeclaration);
    expect(getFontSize(editor)).toBe(12);
  });
});

describe('toFontSize', () => {
  it.each([
    [12, 'pt', '16px', '12pt'],
    [13.5, 'px', '16px', '13.5px'],
    [18, 'rem', '16px', '1.125rem'],
    [18, 'rem', '20px', '0.9rem'],
  ] as const)('writes %s in %s (root %s) as %j', (value, unit, root, expected) => {
    expect(toFontSize(setup('<p>a</p>', root), value, unit)).toBe(expected);
  });
});

describe('stepFontSize', () => {
  it.each([
    ['<p>[ab]</p>', 1, 'pt', '<p><span style="font-size: 13pt">[ab]</span></p>'],
    ['<p>[ab]</p>', -1, 'pt', '<p><span style="font-size: 11pt">[ab]</span></p>'],
    ['<h1>[ab]</h1>', 1, 'pt', '<h1><span style="font-size: 25pt">[ab]</span></h1>'],
    ['<p>[ab]</p>', 1, 'px', '<p><span style="font-size: 17px">[ab]</span></p>'],
    ['<p>[ab]</p>', 2, 'rem', '<p><span style="font-size: 1.125rem">[ab]</span></p>'],
    [
      '<p><span style="font-size: 18px">[ab]</span></p>',
      1,
      'pt',
      '<p><span style="font-size: 14pt">[ab]</span></p>',
    ],
    [
      '<p><span style="font-size: 18px">[ab]</span></p>',
      -1,
      'pt',
      '<p><span style="font-size: 13pt">[ab]</span></p>',
    ],
    [
      '<p><span style="font-size: 1pt">[ab]</span></p>',
      -1,
      'pt',
      '<p><span style="font-size: 1pt">[ab]</span></p>',
    ],
    [
      '<p><span style="font-size: 400pt">[ab]</span></p>',
      1,
      'pt',
      '<p><span style="font-size: 400pt">[ab]</span></p>',
    ],
  ] as const)('on %j by %s in %s gives %j', (html, delta, unit, expected) => {
    const editor = setup(html);
    expect(editor.commands.stepFontSize(delta, unit)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('defaults to pt', () => {
    const editor = setup('<p>[ab]</p>');
    expect(editor.commands.stepFontSize(1)).toBe(true);
    expect(editor.getHTML()).toBe('<p><span style="font-size: 13pt">ab</span></p>');
  });

  it('steps each part from its own size, keeping the other styles', () => {
    const editor = setup(
      '<p>[a<span style="font-size: 14pt; color: red">b</span>' +
        '<span style="font-size: 18pt">c</span>]</p>',
    );
    expect(editor.commands.stepFontSize(1)).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(
      '<p><span style="font-size: 13pt">[a</span>' +
        '<span style="font-size: 15pt; color: red">b</span>' +
        '<span style="font-size: 19pt">c]</span></p>',
    );
  });

  it('steps the next typed text, again and again, with an empty selection', () => {
    const editor = setup('<p>a|</p>');
    expect(editor.commands.stepFontSize(1)).toBe(true);
    expect(editor.commands.stepFontSize(1)).toBe(true);
    typeText(editor, 'b');
    expect(getHTMLWithSelection(editor)).toBe('<p>a<span style="font-size: 14pt">b|</span></p>');
  });

  it('cannot step inside code', () => {
    const editor = setup('<p><code>[ab]</code></p>');
    expect(editor.commands.stepFontSize.can(1)).toBe(false);
  });
});
