/// <reference types="vite/client" />
import '../src/styles/content.css';
import './demo.css';
import '../src/styles/ui.css';
import { defaultExtensions, Editor } from '../src';
import { createStatusBar, createToolbar } from '../src/ui';

const content = [
  '<h2>Welcome to Stilo</h2>',
  '<p>This is <strong>bold</strong>, <em>italic</em>, <u>underline</u>, <s>strike</s> and ',
  '<code>code</code>. Here is <a href="https://prosemirror.net">a link</a>.</p>',
  '<blockquote><p>A quote.</p></blockquote>',
  '<pre><code class="language-js">function greet(name) {\n  return "Hello, " + name;\n}</code></pre>',
  '<ul><li>First item</li><li>Second item<ul><li>Nested item</li></ul></li></ul>',
  '<ol start="3"><li>Third</li><li>Fourth</li></ol>',
  '<ul data-type="taskList"><li data-checked="true">Done task</li>',
  '<li data-checked="false">Open task</li></ul>',
  '<table><tr><th>Shortcut</th><th>Action</th></tr><tr><td>Tab</td><td>Next cell</td></tr>',
  '<tr><td>Shift+Tab</td><td>Previous cell</td></tr></table>',
  '<hr>',
  '<p>Line one<br>line two</p>',
].join('');

const output = document.querySelector<HTMLElement>('#output')!;
const params = new URLSearchParams(location.search);

// `?fixed`: the editor scrolls inside its own container instead of with the page.
if (params.has('fixed')) {
  document.querySelector('.demo')!.classList.add('demo--fixed');
}

// `?dark`: the dark theme.
if (params.has('dark')) {
  document.documentElement.classList.add('demo-dark');
}

// `?nomarkdown`: Markdown shortcuts off.
const editor = new Editor({
  element: document.querySelector<HTMLElement>('#editor')!,
  extensions: [defaultExtensions({ placeholder: { placeholder: 'Write something…' } })],
  content,
  ariaLabel: 'Demo editor',
  markdownShortcuts: !params.has('nomarkdown'),
});

createToolbar(editor, { container: document.querySelector<HTMLElement>('#toolbar')! });
createStatusBar(editor, { container: document.querySelector<HTMLElement>('#status')! });

const showHTML = () => {
  output.textContent = editor.getHTML();
};
editor.on('input', showHTML);
showHTML();
