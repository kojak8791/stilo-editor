import DOMPurify from 'dompurify';
import { describe, expect, it } from 'vitest';
import { XSS_VECTORS } from '../../../tests/fixtures/xss/vectors';
import {
  ALLOWED_ATTR,
  ALLOWED_TAGS,
  isAllowedHref,
  isAllowedImageSrc,
  sanitizeToDOM,
  sanitizeToString,
  urlScheme,
} from './sanitize';

describe('urlScheme', () => {
  it.each([
    ['https://example.com', 'https'],
    ['HTTP://EXAMPLE.COM', 'http'],
    ['mailto:a@b.c', 'mailto'],
    ['tel:+39123', 'tel'],
    ['a+b.c-d:x', 'a+b.c-d'],
    ['java\tscript:alert(1)', 'javascript'],
    [' \n javascript:alert(1)', 'javascript'],
    ['\u0001javascript:alert(1)', 'javascript'],
    ['jav\u0000ascript:alert(1)', 'javascript'],
  ])('extracts the scheme of %j → %s', (input, expected) => {
    expect(urlScheme(input)).toBe(expected);
  });

  it.each(['/path', 'page.html', '#top', '?q=1', '//cdn.example/x', '', '1abc:x', 'foo/bar:baz'])(
    'returns null for %j',
    (input) => {
      expect(urlScheme(input)).toBeNull();
    },
  );
});

describe('isAllowedHref', () => {
  it.each([
    'https://example.com',
    'HTTPS://EXAMPLE.COM',
    'http://example.com',
    'mailto:a@b.c',
    'tel:+39123',
    '/a',
    'a.html',
    '#x',
    '',
  ])('allows %j', (input) => {
    expect(isAllowedHref(input)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'java\tscript:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html,x',
    'file:///etc/passwd',
    'ftp://example.com',
  ])('rejects %j', (input) => {
    expect(isAllowedHref(input)).toBe(false);
  });
});

describe('isAllowedImageSrc', () => {
  it.each([
    'https://example.com/a.png',
    'http://example.com/a.png',
    '/img/a.png',
    'a.png',
    '  a.png  ',
    'data:image/png;base64,iVBORw0KGgo=',
    'DATA:IMAGE/JPEG;BASE64,AAAA',
    'data:image/gif;base64,R0lGOD',
    'data:image/webp;base64,AA AA',
  ])('allows %j', (input) => {
    expect(isAllowedImageSrc(input)).toBe(true);
  });

  it.each([
    '',
    '   ',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/png,rawdata',
    'data:text/html;base64,AAAA',
    'javascript:alert(1)',
    'ftp://example.com/a.png',
    'blob:https://example.com/x',
  ])('rejects %j', (input) => {
    expect(isAllowedImageSrc(input)).toBe(false);
  });
});

describe('sanitizeToString', () => {
  it.each([
    [
      'keeps allowed content',
      '<p>Hello <strong>world</strong></p>',
      '<p>Hello <strong>world</strong></p>',
    ],
    ['unwraps unknown tags', '<p><abbr>a</abbr> <big>b</big></p>', '<p>a b</p>'],
    ['removes scripts with their content', '<p>a</p><script>alert(1)</script>', '<p>a</p>'],
    [
      'removes attributes outside the allowlist',
      '<p id="x" onclick="y" data-foo="z" data-type="taskList">a</p>',
      '<p data-type="taskList">a</p>',
    ],
    [
      'filters style through sanitizeStyle',
      '<span style="COLOR: RED; position: absolute; font-size: 12PX">a</span>',
      '<span style="font-size: 12px; color: red">a</span>',
    ],
    [
      'removes style when nothing remains',
      '<span style="position: absolute">a</span>',
      '<span>a</span>',
    ],
    [
      'keeps only language-* classes',
      '<pre><code class="hljs language-js language-ts-x foo">x</code></pre>',
      '<pre><code class="language-js language-ts-x">x</code></pre>',
    ],
    ['removes class when no token remains', '<p class="foo bar">a</p>', '<p>a</p>'],
    [
      'trims an allowed href',
      '<a href="  https://example.com  ">a</a>',
      '<a href="https://example.com">a</a>',
    ],
    ['removes a forbidden href', '<a href="javascript:alert(1)">a</a>', '<a>a</a>'],
    [
      'removes hrefs that DOMPurify alone would keep',
      '<a href="ftp://example.com">a</a><a href="sms:123">b</a>',
      '<a>a</a><a>b</a>',
    ],
    ['trims an allowed src', '<img src=" /a.png " alt="x">', '<img src="/a.png" alt="x">'],
    [
      'removes a forbidden src',
      '<img src="data:image/svg+xml;base64,PHN2Zz4=" alt="x">',
      '<img alt="x">',
    ],
    [
      'keeps target only when exactly _blank',
      '<a href="/" target="_blank">a</a><a href="/" target="_self">b</a><a href="/" target="_BLANK">c</a>',
      '<a href="/" target="_blank">a</a><a href="/">b</a><a href="/">c</a>',
    ],
    [
      'keeps other allowed attributes unchanged',
      '<ol start="3"><li><a href="/" title="T" rel="noopener">a</a></li></ol>',
      '<ol start="3"><li><a href="/" title="T" rel="noopener">a</a></li></ol>',
    ],
  ])('%s', (_name, input, expected) => {
    expect(sanitizeToString(input)).toBe(expected);
  });

  it('does not add hooks to the default DOMPurify instance', () => {
    sanitizeToString('<p>a</p>');
    expect(DOMPurify.sanitize('<p class="foo" style="position: absolute">a</p>')).toBe(
      '<p class="foo" style="position: absolute">a</p>',
    );
  });
});

describe('sanitizeToDOM', () => {
  it('returns a detached body element', () => {
    const body = sanitizeToDOM('<p>a</p>');
    expect(body.tagName).toBe('BODY');
    expect(body.isConnected).toBe(false);
    expect(body.innerHTML).toBe('<p>a</p>');
  });

  it('applies the same filtering as sanitizeToString', () => {
    expect(
      sanitizeToDOM('<p onclick="x" style="color: RED">a<script>x</script></p>').innerHTML,
    ).toBe('<p style="color: red">a</p>');
  });
});

// Removes spaces and control characters, as browsers do inside URL schemes.
function compact(value: string): string {
  return [...value].filter((char) => char > ' ').join('');
}

const DANGEROUS_VALUE = /(java|vb)script:|data:text|svg\+xml|expression\(|url\(/i;

describe('XSS fixtures', () => {
  it.each(XSS_VECTORS)('neutralizes %s', (vector) => {
    for (const body of [sanitizeToDOM(vector), sanitizeToDOM(sanitizeToString(vector))]) {
      for (const element of body.querySelectorAll('*')) {
        expect(ALLOWED_TAGS).toContain(element.localName);
        for (const attr of element.attributes) {
          expect(ALLOWED_ATTR).toContain(attr.name);
          expect(compact(attr.value)).not.toMatch(DANGEROUS_VALUE);
        }
      }
    }
  });
});
