import { describe, expect, it } from 'vitest';
import { XSS_VECTORS } from '../../../tests/fixtures/xss/vectors';
import { createTestEditor, getHTMLWithSelection, typeText } from '../../../tests/helpers';
import { isAllowedHref } from '../../core/html/sanitize';

describe('Link: parse and serialize', () => {
  it.each([
    ['<p><a href="https://x.com">a</a></p>', '<p><a href="https://x.com">a</a></p>'],
    ['<p><a href=" https://x.com ">a</a></p>', '<p><a href="https://x.com">a</a></p>'],
    ['<p><a href="/page">a</a></p>', '<p><a href="/page">a</a></p>'],
    ['<p><a href="#top">a</a></p>', '<p><a href="#top">a</a></p>'],
    ['<p><a href="mailto:a@b.c">a</a></p>', '<p><a href="mailto:a@b.c">a</a></p>'],
    ['<p><a href="tel:+39123">a</a></p>', '<p><a href="tel:+39123">a</a></p>'],
    [
      '<p><a href="https://x.com" target="_blank">a</a></p>',
      '<p><a href="https://x.com" target="_blank" rel="noopener noreferrer nofollow">a</a></p>',
    ],
    [
      '<p><a href="https://x.com" target="_blank" rel="noopener">a</a></p>',
      '<p><a href="https://x.com" target="_blank" rel="noopener noreferrer nofollow">a</a></p>',
    ],
    ['<p><a href="https://x.com" rel="nofollow">a</a></p>', '<p><a href="https://x.com">a</a></p>'],
    ['<p><a href="https://x.com" target="_self">a</a></p>', '<p><a href="https://x.com">a</a></p>'],
    ['<p><a href="https://x.com" title="t">a</a></p>', '<p><a href="https://x.com">a</a></p>'],
    ['<p><a href="javascript:alert(1)">a</a></p>', '<p>a</p>'],
    ['<p><a href="data:text/html,x">a</a></p>', '<p>a</p>'],
    ['<p><a href="ftp://x.com">a</a></p>', '<p>a</p>'],
    ['<p><a href="">a</a></p>', '<p>a</p>'],
    ['<p><a href="  ">a</a></p>', '<p>a</p>'],
    ['<p><a>a</a></p>', '<p>a</p>'],
    ['<p><a name="x">a</a></p>', '<p>a</p>'],
    ['<p><strong><a href="x">a</a></strong></p>', '<p><a href="x"><strong>a</strong></a></p>'],
    ['<p><code><a href="x">a</a></code></p>', '<p><a href="x"><code>a</code></a></p>'],
    ['<p><a href="x">a<br>b</a></p>', '<p><a href="x">a<br>b</a></p>'],
    ['<p><a href="x">a</a><a href="x">b</a></p>', '<p><a href="x">ab</a></p>'],
    ['<p><a href="x">a</a><a href="y">b</a></p>', '<p><a href="x">a</a><a href="y">b</a></p>'],
    ['<a href="x">a</a>', '<p><a href="x">a</a></p>'],
    ['<p><a href="x?a=1&amp;b=2">a</a></p>', '<p><a href="x?a=1&amp;b=2">a</a></p>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html: '<p><a href="x" target="_blank">a</a> <a href="/y">b</a></p>',
    });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });
});

describe('Link: commands', () => {
  it.each([
    ['setLink', '<p>a[b]c</p>', '<p>a<a href="x">[b]</a>c</p>', { href: 'x' }, true],
    [
      'setLink',
      '<p>a[b]c</p>',
      '<p>a<a href="x" target="_blank" rel="noopener noreferrer nofollow">[b]</a>c</p>',
      { href: 'x', target: '_blank' },
      true,
    ],
    [
      'setLink',
      '<p>a[b]c</p>',
      '<p>a<a href="https://x.com">[b]</a>c</p>',
      { href: ' https://x.com ' },
      true,
    ],
    ['setLink', '<p>a[b]c</p>', '<p>a[b]c</p>', { href: 'javascript:alert(1)' }, false],
    ['setLink', '<p>a[b]c</p>', '<p>a[b]c</p>', { href: '' }, false],
    ['setLink', '<p>a[b]c</p>', '<p>a[b]c</p>', { href: '  ' }, false],
    ['setLink', '<p>a|b</p>', '<p>a|b</p>', { href: 'x' }, false],
    [
      'setLink',
      '<p>a<a href="x">b|c</a>d</p>',
      '<p>a<a href="y" target="_blank" rel="noopener noreferrer nofollow">b|c</a>d</p>',
      { href: 'y', target: '_blank' },
      true,
    ],
    [
      'setLink',
      '<p>a<a href="x" target="_blank">b|c</a>d</p>',
      '<p>a<a href="y">b|c</a>d</p>',
      { href: 'y' },
      true,
    ],
    [
      'setLink',
      '<p><a href="x">a<strong>b|</strong>c</a></p>',
      '<p><a href="y">a<strong>b|</strong>c</a></p>',
      { href: 'y' },
      true,
    ],
    [
      'setLink',
      '<p>a<a href="x">bc|</a>d</p>',
      '<p>a<a href="x">bc</a>|d</p>',
      { href: 'y' },
      false,
    ],
    [
      'setLink',
      '<p>a|<a href="x">bc</a>d</p>',
      '<p>a|<a href="x">bc</a>d</p>',
      { href: 'y' },
      false,
    ],
    [
      'setLink',
      '<p><a href="x">[b]c</a></p>',
      '<p><a href="y">[b]</a><a href="x">c</a></p>',
      { href: 'y' },
      true,
    ],
    [
      'setLink',
      '<p><a href="x">a[b</a>c]</p>',
      '<p><a href="x">a</a><a href="y">[bc]</a></p>',
      { href: 'y' },
      true,
    ],
    [
      'setLink',
      '<p><code>a[b]c</code></p>',
      '<p><code>a</code><a href="x"><code>[b]</code></a><code>c</code></p>',
      { href: 'x' },
      true,
    ],
    [
      'unsetLink',
      '<p><a href="x">a[b]c</a></p>',
      '<p><a href="x">a</a>[b]<a href="x">c</a></p>',
      {},
      true,
    ],
    [
      'unsetLink',
      '<p><a href="x">a</a>[b<a href="y">c]</a></p>',
      '<p><a href="x">a</a>[bc]</p>',
      {},
      true,
    ],
    ['unsetLink', '<p>a<a href="x">b|c</a>d</p>', '<p>ab|cd</p>', {}, true],
    ['unsetLink', '<p>a<a href="x">bc|</a>d</p>', '<p>a<a href="x">bc</a>|d</p>', {}, false],
    ['unsetLink', '<p>a|b</p>', '<p>a|b</p>', {}, false],
    ['unsetLink', '<p>[ab]</p>', '<p>[ab]</p>', {}, false],
  ])('%s on %j returns %s, gives %j', (command, html, expected, attrs, returns) => {
    const editor = createTestEditor({ html });
    const result =
      command === 'unsetLink'
        ? editor.commands.unsetLink()
        : editor.commands.setLink(attrs as { href: string; target?: '_blank' | null });
    expect(result).toBe(returns);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('setLink.can() reports availability', () => {
    const editor1 = createTestEditor({ html: '<p>a[b]c</p>' });
    expect(editor1.commands.setLink.can({ href: 'x' })).toBe(true);
    const editor2 = createTestEditor({ html: '<p>a|b</p>' });
    expect(editor2.commands.setLink.can({ href: 'x' })).toBe(false);
    expect(getHTMLWithSelection(editor1)).toBe('<p>a[b]c</p>');
    expect(getHTMLWithSelection(editor2)).toBe('<p>a|b</p>');
  });

  it('reports the active state', () => {
    const editor1 = createTestEditor({ html: '<p><a href="x">a|b</a></p>' });
    expect(editor1.isActive('link')).toBe(true);
    const editor2 = createTestEditor({ html: '<p><a href="x">[ab]</a></p>' });
    expect(editor2.isActive('link')).toBe(true);
    const editor3 = createTestEditor({ html: '<p><a href="x">[a</a>b]</p>' });
    expect(editor3.isActive('link')).toBe(false);
    const editor4 = createTestEditor({ html: '<p><a href="x">a|b</a></p>' });
    expect(editor4.isActive('link', { href: 'x' })).toBe(true);
    expect(editor4.isActive('link', { href: 'y' })).toBe(false);
  });

  it('typing does not extend the link (inclusive: false)', () => {
    const editor1 = createTestEditor({ html: '<p><a href="x">ab|</a></p>' });
    typeText(editor1, 'c');
    expect(getHTMLWithSelection(editor1)).toBe('<p><a href="x">ab</a>c|</p>');
    const editor2 = createTestEditor({ html: '<p><a href="x">a|b</a></p>' });
    typeText(editor2, 'c');
    expect(getHTMLWithSelection(editor2)).toBe('<p><a href="x">ac|b</a></p>');
  });
});

describe('Link: getAttributes', () => {
  it.each([
    [
      '<p><a href="https://x.com" target="_blank">a|b</a></p>',
      { href: 'https://x.com', target: '_blank' },
    ],
    ['<p>[a<a href="https://x.com">b</a>]</p>', { href: 'https://x.com', target: null }],
    ['<p>a|b</p>', {}],
  ])('in %j', (html, expected) => {
    expect(createTestEditor({ html }).getAttributes('link')).toEqual(expected);
  });
});

describe('Link: security', () => {
  it.each(XSS_VECTORS)('writes only safe links for %s', (html) => {
    const container = document.createElement('div');
    container.innerHTML = createTestEditor({ html }).getHTML();
    for (const link of container.querySelectorAll('a')) {
      expect(
        link.getAttributeNames().every((name) => ['href', 'target', 'rel'].includes(name)),
      ).toBe(true);
      expect(isAllowedHref(link.getAttribute('href') ?? '')).toBe(true);
    }
  });
});
