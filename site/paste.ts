import '../src/styles/content.css';
import '../src/styles/ui.css';
import { defaultExtensions, Editor } from '../src';
import { createStatusBar, createToolbar } from '../src/ui';
import { debounce, formatBytes, setUpPage } from './common';
import { formatHTML, highlightHTML } from './highlight';

setUpPage();

/** Larger clipboard HTML is shown cut, so that highlighting it does not freeze the page. */
const SHOWN_BYTES = 200 * 1024;

const element = document.querySelector<HTMLElement>('#editor')!;
const editor = new Editor({
  element,
  extensions: [
    defaultExtensions({ placeholder: { placeholder: 'Paste here from Word, Docs or the web…' } }),
  ],
  ariaLabel: 'Paste target',
});
createToolbar(editor, {
  container: document.querySelector<HTMLElement>('#toolbar')!,
  // The editor scrolls inside its frame: a toolbar stuck to the page would hide which one scrolls.
  sticky: false,
});
createStatusBar(editor, { container: document.querySelector<HTMLElement>('#status')! });

const clipboard = document.querySelector<HTMLElement>('#clipboard')!;
const clipboardSize = document.querySelector<HTMLElement>('#clipboard-size')!;
const output = document.querySelector<HTMLElement>('#output')!;
const outputSize = document.querySelector<HTMLElement>('#output-size')!;
const byteLength = (text: string) => new TextEncoder().encode(text).length;

// Capture phase: runs before the editor handles the paste, which then lands in an empty document.
element.addEventListener(
  'paste',
  (event) => {
    const html = event.clipboardData?.getData('text/html') ?? '';
    clipboardSize.textContent = html ? formatBytes(byteLength(html)) : '';
    if (!html) {
      clipboard.textContent = 'No HTML on the clipboard: plain text.';
    } else if (html.length > SHOWN_BYTES) {
      clipboard.textContent = `${html.slice(0, SHOWN_BYTES)}\n\n… cut here, too long to show.`;
    } else {
      clipboard.innerHTML = highlightHTML(html);
    }
    editor.setHTML('');
  },
  { capture: true },
);

const showHTML = debounce(() => {
  const html = editor.isEmpty ? '' : editor.getHTML();
  output.innerHTML = highlightHTML(formatHTML(html));
  outputSize.textContent = html ? formatBytes(byteLength(html)) : '';
});
editor.on('input', showHTML);
