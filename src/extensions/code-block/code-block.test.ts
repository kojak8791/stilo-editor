import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';

describe('CodeBlock: parse and serialize', () => {
  it.each([
    ['<pre><code>a\n  b</code></pre>', '<pre><code>a\n  b</code></pre>'],
    ['<pre>a  b</pre>', '<pre><code>a  b</code></pre>'],
    [
      '<pre><code class="language-js">x</code></pre>',
      '<pre><code class="language-js">x</code></pre>',
    ],
    [
      '<pre class="language-ts"><code class="hljs">x</code></pre>',
      '<pre><code class="language-ts">x</code></pre>',
    ],
    [
      '<pre><code class="hljs language-js"><span class="hljs-keyword">let</span> <b>x</b></code></pre>',
      '<pre><code class="language-js">let x</code></pre>',
    ],
    ['<pre><code>a<br>b</code></pre>', '<pre><code>a\nb</code></pre>'],
    ['<pre></pre>', '<pre><code></code></pre>'],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({
      html: '<pre><code class="language-js">if (a) {\n  b();\n}\n</code></pre><p>c</p>',
    });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });
});

describe('CodeBlock: commands', () => {
  it.each([
    ['setCodeBlock', '<p>a|b</p>', '<pre><code>a|b</code></pre>', true],
    ['setCodeBlock', '<p><strong>a|</strong>b<br>c</p>', '<pre><code>a|b\nc</code></pre>', true],
    [
      'setCodeBlock',
      '<p>[a</p><p></p><p>b]</p><p>c</p>',
      '<pre><code>[a\n\nb]</code></pre><p>c</p>',
      true,
    ],
    ['setCodeBlock', '<ul><li>[a</li><li>b]</li></ul>', '<ul><li>[a</li><li>b]</li></ul>', false],
    ['setCodeBlock', '<pre><code>a|</code></pre>', '<pre><code>a|</code></pre>', false],
    [
      'unsetCodeBlock',
      '<pre><code>a\nb|\n\nc</code></pre>',
      '<p>a</p><p>b|</p><p></p><p>c</p>',
      true,
    ],
    ['unsetCodeBlock', '<pre><code>[a\nb]</code></pre>', '<p>[a</p><p>b]</p>', true],
    ['unsetCodeBlock', '<p>a|</p>', '<p>a|</p>', false],
    [
      'unsetCodeBlock',
      '<pre><code>[a\nb</code></pre><h1>c</h1><pre><code>d]</code></pre>',
      '<p>[a</p><p>b</p><h1>c</h1><p>d]</p>',
      true,
    ],
    ['toggleCodeBlock', '<p>a|</p>', '<pre><code>a|</code></pre>', true],
    ['toggleCodeBlock', '<pre><code>a|</code></pre>', '<p>a|</p>', true],
  ] as const)('%s on %j gives %j (returns %s)', (command, html, expected, returns) => {
    const editor = createTestEditor({ html });
    expect(editor.commands[command]()).toBe(returns);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('sets the language', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(editor.commands.setCodeBlock({ language: 'ts' })).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<pre><code class="language-ts">a|</code></pre>');
    expect(editor.commands.setCodeBlock({ language: 'c-sharp' })).toBe(true);
    expect(editor.getAttributes('codeBlock')).toEqual({ language: 'c-sharp' });
    expect(editor.commands.setCodeBlock()).toBe(true);
    expect(editor.getHTML()).toBe('<pre><code>a</code></pre>');
  });

  it('rejects an invalid language', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(editor.commands.setCodeBlock({ language: 'x" onclick="y' })).toBe(false);
    expect(editor.commands.toggleCodeBlock({ language: 'a b' })).toBe(false);
    expect(editor.getHTML()).toBe('<p>a</p>');
  });

  it('disables marks inside code', () => {
    const editor = createTestEditor({ html: '<pre><code>[a]</code></pre>' });
    expect(editor.commands.toggleBold.can()).toBe(false);
    expect(editor.commands.toggleCode.can()).toBe(false);
  });
});

describe('CodeBlock: keymap', () => {
  it('toggles with Mod-Alt-c', () => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    expect(pressKey(editor, 'Mod-Alt-c')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<pre><code>a|b</code></pre>');
    expect(pressKey(editor, 'Mod-Alt-c')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>a|b</p>');
  });

  it.each([
    ['Enter', '<pre><code>a|b</code></pre>', '<pre><code>a\n|b</code></pre>'],
    ['Enter', '<pre><code>a\n|\nb</code></pre>', '<pre><code>a\n\n|\nb</code></pre>'],
    ['Enter', '<pre><code>a\n|</code></pre><p>b</p>', '<pre><code>a</code></pre><p>|</p><p>b</p>'],
    [
      'Enter',
      '<ul><li><p>a</p><pre><code>b|</code></pre></li></ul>',
      '<ul><li><p>a</p><pre><code>b\n|</code></pre></li></ul>',
    ],
    ['Shift-Enter', '<pre><code>a|b</code></pre>', '<pre><code>a\n|b</code></pre>'],
    ['Backspace', '<p>a</p><pre><code>|</code></pre>', '<p>a</p><p>|</p>'],
    ['Backspace', '<p>a</p><pre><code>|b\nc</code></pre>', '<p>a|b<br>c</p>'],
  ])('%s in %j gives %j', (key, html, expected) => {
    const editor = createTestEditor({ html });
    pressKey(editor, key);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('leaves the code block with two Enter at the end', () => {
    const editor = createTestEditor({ html: '<pre><code>a|</code></pre>' });
    pressKey(editor, 'Enter');
    pressKey(editor, 'Enter');
    expect(getHTMLWithSelection(editor)).toBe('<pre><code>a</code></pre><p>|</p>');
  });
});

describe('CodeBlock: input rule', () => {
  it.each([
    ['<p>|</p>', '``` a', '<pre><code>a|</code></pre>'],
    ['<p>|</p>', '```js a', '<pre><code class="language-js">a|</code></pre>'],
    ['<p>|x</p>', '``` ', '<pre><code>|x</code></pre>'],
    ['<p>a|</p>', '``` ', '<p>a``` |</p>'],
    ['<pre><code>|</code></pre>', '# ', '<pre><code># |</code></pre>'],
  ])('in %j, typing %j gives %j', (html, text, expected) => {
    const editor = createTestEditor({ html });
    typeText(editor, text);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });
});
