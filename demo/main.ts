/// <reference types="vite/client" />
import '../src/styles/content.css';
import './demo.css';
import '../src/styles/ui.css';
import { Editor, StarterKit } from '../src';
import { createToolbar } from '../src/ui';

const content = [
  '<h2>Welcome to Stilo</h2>',
  '<p>This is <strong>bold</strong>, <em>italic</em>, <u>underline</u>, <s>strike</s> and ',
  '<code>code</code>. Here is <a href="https://prosemirror.net">a link</a>.</p>',
  '<blockquote><p>A quote.</p></blockquote>',
  '<ul><li>First item</li><li>Second item<ul><li>Nested item</li></ul></li></ul>',
  '<ol start="3"><li>Third</li><li>Fourth</li></ol>',
  '<hr>',
  '<p>Line one<br>line two</p>',
].join('');

const output = document.querySelector<HTMLElement>('#output')!;
const params = new URLSearchParams(location.search);

// `?fixed`: the editor scrolls inside its own container instead of with the page.
if (params.has('fixed')) {
  document.querySelector('.demo')!.classList.add('demo--fixed');
}

const editor = new Editor({
  element: document.querySelector<HTMLElement>('#editor')!,
  extensions: [StarterKit({ placeholder: { placeholder: 'Write something…' } })],
  content,
  ariaLabel: 'Demo editor',
});

createToolbar(editor, { container: document.querySelector<HTMLElement>('#toolbar')! });

// Bench mode (ARCHITECTURE §11): no getHTML() per update, the API on window.__stilo.
if (params.has('bench')) {
  const { createBenchApi } = await import('./bench');
  window.__stilo = createBenchApi(editor);
} else {
  const showHTML = () => {
    output.textContent = editor.getHTML();
  };
  editor.on('update', showHTML);
  showHTML();
}
