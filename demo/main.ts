/// <reference types="vite/client" />
import '../src/styles/content.css';
import './demo.css';
import '../src/styles/ui.css';
import { defaultExtensions, Editor } from '../src';
import { createStatusBar, createToolbar } from '../src/ui';

/** A picture drawn on a canvas, as a PNG data URL: the demo needs no network. */
function demoPicture(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 240;
  const context = canvas.getContext('2d')!;
  const gradient = context.createLinearGradient(0, 0, 480, 240);
  gradient.addColorStop(0, '#0969da');
  gradient.addColorStop(1, '#8250df');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 480, 240);
  context.fillStyle = '#ffffff';
  context.font = 'bold 64px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Stilo', 240, 120);
  return canvas.toDataURL('image/png');
}

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
  `<figure><img src="${demoPicture()}" alt="The word Stilo on a blue gradient" width="360" height="180">`,
  '<figcaption>A figure with a <strong>styled</strong> caption and ',
  '<a href="https://en.wikipedia.org/wiki/Figure_(publishing)">a link</a></figcaption></figure>',
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
