import '../src/styles/content.css';
import '../src/styles/ui.css';
import { defaultExtensions, Editor } from '../src';
import { createStatusBar, createToolbar } from '../src/ui';
import { debounce, setUpPage } from './common';
import { formatHTML, highlightHTML, highlightTS } from './highlight';

const content = [
  '<h2>A field guide to Stilo</h2>',
  '<p>Everything here is a live editor. Select some text and try the toolbar, or type ',
  '<code>## </code> at the start of a line to make a heading. The HTML next to it follows ',
  'every change.</p>',
  '<h3>Formatting that stays clean</h3>',
  '<p>Text can be <strong>bold</strong>, <em>italic</em>, <u>underlined</u>, ',
  '<s>struck through</s>, <mark>highlighted</mark> or ',
  '<span style="color: #2b50b6">colored</span>, with H<sub>2</sub>O and ',
  'E = mc<sup>2</sup> for the scientists. Whatever you do, the output stays semantic HTML.</p>',
  '<blockquote><p>What goes in as HTML comes out as clean, self-contained HTML, ',
  'with a strict allowlist for tags, attributes and inline styles.</p></blockquote>',
  `<figure><img src="${new URL('./images/alassio.webp', import.meta.url).href}" `,
  'alt="The sea at Alassio under a cloudy sky, with Capo Mele in the distance" width="640" height="360">',
  '<figcaption>Alassio beach towards Capo Mele. Photo by ashoppio, ',
  '<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>, via ',
  '<a href="https://commons.wikimedia.org/wiki/File:Panorama_della_Spiaggia_di_Alassio_verso_Capo_Mele.jpg">',
  'Wikimedia Commons</a></figcaption></figure>',
  '<h3>Shortcuts worth knowing</h3>',
  '<table><tr><th>Keys</th><th>What they do</th></tr>',
  '<tr><td>Ctrl+K</td><td>Add or edit a link</td></tr>',
  '<tr><td>Ctrl+F</td><td>Find and replace</td></tr>',
  '<tr><td>Alt+↑ / Alt+↓</td><td>Move the block up or down</td></tr>',
  '<tr><td>Ctrl+Shift+V</td><td>Paste as plain text</td></tr></table>',
  '<h3>Things to try</h3>',
  '<ul data-type="taskList">',
  '<li data-checked="true">Open this page</li>',
  '<li data-checked="false">Drag a column border of the table above</li>',
  '<li data-checked="false">Press Ctrl+F and replace a word everywhere</li>',
  '<li data-checked="false">Paste a table from a spreadsheet</li></ul>',
  '<h3>Code</h3>',
  '<pre><code class="language-ts">const editor = new Editor({\n',
  "  element: document.querySelector('#editor'),\n",
  '  extensions: [defaultExtensions()],\n',
  '});</code></pre>',
].join('');

const usage = `import 'stilo-editor/style.css';
import { Editor, defaultExtensions } from 'stilo-editor';
import { createToolbar } from 'stilo-editor/ui';

const editor = new Editor({
  element: document.querySelector<HTMLElement>('#editor')!,
  extensions: [defaultExtensions()],
  content: '<p>Hello <strong>world</strong></p>',
});

createToolbar(editor, { container: document.querySelector<HTMLElement>('#toolbar')! });

editor.getHTML(); // '<p>Hello <strong>world</strong></p>'`;

setUpPage();

document.querySelector<HTMLElement>('#usage-code')!.innerHTML = highlightTS(usage);

const editor = new Editor({
  element: document.querySelector<HTMLElement>('#editor')!,
  extensions: [defaultExtensions({ placeholder: { placeholder: 'Write something…' } })],
  content,
  ariaLabel: 'Stilo editor',
});

createToolbar(editor, {
  container: document.querySelector<HTMLElement>('#toolbar')!,
  // The editor scrolls inside its frame: a toolbar stuck to the page would hide which one scrolls.
  sticky: false,
});
createStatusBar(editor, { container: document.querySelector<HTMLElement>('#status')! });

const output = document.querySelector<HTMLElement>('#output')!;
const showHTML = debounce(() => {
  output.innerHTML = highlightHTML(formatHTML(editor.getHTML()));
});
editor.on('input', showHTML);
showHTML();
