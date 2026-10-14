import { AllSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';
import { defaultExtensions } from '../../src/extensions';
import { XSS_VECTORS } from '../../tests/fixtures/xss/vectors';
import {
  copySelection,
  createTestEditor,
  getHTMLWithSelection,
  pasteHTML,
  pasteText,
} from '../../tests/helpers';
import { Editor } from './editor';
import { isAllowedHref } from './html/sanitize';

describe('copy', () => {
  it.each([
    ['<p>a[bc</p><p>de]f</p>', '<p data-pm-slice="1 1 []">bc</p><p>de</p>', 'bc\n\nde'],
    [
      '<ul><li>[one</li><li>two]</li></ul>',
      '<ul data-pm-slice="3 3 []"><li>one</li><li>two</li></ul>',
      'one\n\ntwo',
    ],
    [
      '<ol start="3"><li>[x</li><li>y]</li></ol>',
      '<ol start="3" data-pm-slice="3 3 []"><li>x</li><li>y</li></ol>',
      'x\n\ny',
    ],
    [
      '<ul><li><p>[a</p><ul><li>b]</li></ul></li></ul>',
      '<li data-pm-slice="2 4 [&quot;bulletList&quot;,null]"><p>a</p><ul><li>b</li></ul></li>',
      'a\n\nb',
    ],
    [
      '<ul><li><p>[a</p><p>b]</p></li></ul>',
      '<li data-pm-slice="2 2 [&quot;bulletList&quot;,null]"><p>a</p><p>b</p></li>',
      'a\n\nb',
    ],
    [
      '<p>[a</p><ul><li>b</li></ul><p>c]</p>',
      '<p data-pm-slice="1 1 []">a</p><ul><li>b</li></ul><p>c</p>',
      'a\n\nb\n\nc',
    ],
    [
      '<ul><li>[one]</li></ul>',
      '<p data-pm-slice="1 1 [&quot;bulletList&quot;,null,&quot;listItem&quot;,null]">one</p>',
      'one',
    ],
    ['<p>a[b<br>c</p><p>d]e</p>', '<p data-pm-slice="1 1 []">b<br>c</p><p>d</p>', 'b\nc\n\nd'],
    ['<p>[a</p><hr><p>b]</p>', '<p data-pm-slice="1 1 []">a</p><hr><p>b</p>', 'a\n\nb'],
  ])('copySelection: %s', (html, expectedHTML, expectedText) => {
    const editor = createTestEditor({ html });
    const result = copySelection(editor);
    expect(result.html).toBe(expectedHTML);
    expect(result.text).toBe(expectedText);
  });
});

// Helper for multi-step cases that need compactParagraphs: false
function makeEditor(content: string, compactParagraphs?: boolean) {
  return new Editor({
    element: document.createElement('div'),
    extensions: [defaultExtensions()],
    content,
    compactParagraphs,
  });
}

describe('multi-step copy', () => {
  it('copy from complex doc with compactParagraphs: true', () => {
    const editor = makeEditor('<h1>T</h1><ul><li>a</li><li>b</li></ul><p>c<br>d</p>');
    editor.view.dispatch(editor.state.tr.setSelection(new AllSelection(editor.state.doc)));
    const result = copySelection(editor);
    expect(result.html).toBe(
      '<h1 data-pm-slice="0 0 []">T</h1><ul><li>a</li><li>b</li></ul><p>c<br>d</p>',
    );
    expect(result.text).toBe('T\n\na\n\nb\n\nc\nd');
    expect(result.text).toBe(editor.getText());
  });

  it('copy from complex doc with compactParagraphs: false', () => {
    const editor = makeEditor('<h1>T</h1><ul><li>a</li><li>b</li></ul><p>c<br>d</p>', false);
    editor.view.dispatch(editor.state.tr.setSelection(new AllSelection(editor.state.doc)));
    expect(copySelection(editor).html).toBe(
      '<h1 data-pm-slice="0 0 []">T</h1><ul><li><p>a</p></li><li><p>b</p></li></ul><p>c<br>d</p>',
    );
  });

  it('round trip: copy and paste the same HTML', () => {
    const src = createTestEditor({ html: '<ul><li>[one</li><li>two]</li></ul>' });
    const { html } = copySelection(src);
    const target = createTestEditor({ html: '<p>|</p>' });
    expect(pasteHTML(target, html)).toBe(true);
    expect(getHTMLWithSelection(target)).toBe('<ul><li>one</li><li>two|</li></ul>');
  });
});

describe('paste HTML', () => {
  it.each([
    ['<p>x|y</p>', '<b>a</b><i>b</i>', true, '<p>x<strong>a</strong><em>b|</em>y</p>'],
    ['<p>x|y</p>', '<div>a</div><div>b</div>', true, '<p>xa</p><p>b|y</p>'],
    [
      '<p>x|y</p>',
      '<span style="color:red">r</span>',
      true,
      '<p>x<span style="color: red">r|</span>y</p>',
    ],
    ['<p>x|y</p>', '<span style="letter-spacing:2px">r</span>', true, '<p>xr|y</p>'],
    ['<p>x|y</p>', '<p>a<script>alert(1)</script></p>', true, '<p>xa|y</p>'],
    ['<p>x|y</p>', '<script>alert(1)</script>', true, '<p>x|y</p>'],
    ['<p>x|y</p>', '<img src=x onerror=alert(1)>', true, '<p>x<img src="x">|y</p>'],
    ['<p>x|y</p>', '<a href="javascript:alert(1)">l</a>', true, '<p>xl|y</p>'],
    ['<p>x|y</p>', '', false, '<p>x|y</p>'],
    ['<p>|</p>', '<h1>T</h1><p>p</p>', true, '<h1>T</h1><p>p|</p>'],
    ['<p>|</p>', '<ul><li>a</li><li>b</li></ul>', true, '<ul><li>a</li><li>b|</li></ul>'],
    ['<p>|</p>', '<ul><li><p>a</p></li></ul>', true, '<ul><li>a|</li></ul>'],
    [
      '<p>|</p>',
      '<p data-pm-slice="1 1 [&quot;bulletList&quot;,null,&quot;listItem&quot;,null]">one</p>',
      true,
      '<p>one|</p>',
    ],
  ])('pasteHTML: %s', (start, html, returns, expected) => {
    const editor = createTestEditor({ html: start });
    expect(pasteHTML(editor, html)).toBe(returns);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});

describe('paste plain text', () => {
  it.each([
    ['<p>x|y</p>', 'a\nb', true, '<p>xa</p><p>b|y</p>'],
    ['<p>x|y</p>', 'a\n\nb', true, '<p>xa</p><p>b|y</p>'],
    ['<p>x|y</p>', 'a\n\n\nb\r\nc', true, '<p>xa</p><p>b</p><p>c|y</p>'],
    ['<p>x|y</p>', 'a\n', true, '<p>xa</p><p>|y</p>'],
    ['<p>x|y</p>', '\na', true, '<p>x</p><p>a|y</p>'],
    ['<p>x|y</p>', '  two  spaces', true, '<p>x  two  spaces|y</p>'],
    ['<p>x|y</p>', 'a<b>&amp;', true, '<p>xa&lt;b&gt;&amp;amp;|y</p>'],
    ['<p>x|y</p>', '', false, '<p>x|y</p>'],
    [
      '<p><strong>x|y</strong></p>',
      'a\nb',
      true,
      '<p><strong>xa</strong></p><p><strong>b|y</strong></p>',
    ],
    ['<h2>x|y</h2>', 'a\nb', true, '<h2>xa</h2><p>b|y</p>'],
    ['<p>[xy]</p>', 'a\nb', true, '<p>a</p><p>b|</p>'],
    ['<ul><li>x|y</li></ul>', 'a\nb', true, '<ul><li><p>xa</p><p>b|y</p></li></ul>'],
  ])('pasteText: %s', (start, text, returns, expected) => {
    const editor = createTestEditor({ html: start });
    expect(pasteText(editor, text)).toBe(returns);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});

describe('security: XSS vectors', () => {
  it.each(XSS_VECTORS)('pasteHTML sanitizes: %s', (vector) => {
    const editor = createTestEditor({ html: '<p>x|y</p>' });
    pasteHTML(editor, vector);
    const dom = editor.view.dom;

    // No dangerous elements
    const dangerous = dom.querySelectorAll(
      'script, style, iframe, object, embed, svg, form, base, meta',
    );
    expect(dangerous.length).toBe(0);

    // No event handler attributes
    let hasOnAttr = false;
    dom.querySelectorAll('*').forEach((el: Element) => {
      for (let i = 0; i < el.attributes.length; i++) {
        if (el.attributes[i]!.name.startsWith('on')) hasOnAttr = true;
      }
    });
    expect(hasOnAttr).toBe(false);

    // All links have allowed hrefs
    dom.querySelectorAll('a').forEach((a: HTMLAnchorElement) => {
      expect(isAllowedHref(a.getAttribute('href') ?? '')).toBe(true);
    });
  });
});
