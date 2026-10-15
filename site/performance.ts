import '../src/styles/content.css';
import '../src/styles/ui.css';
import { paragraphs } from '../bench/generators';
import { defaultExtensions, Editor } from '../src';
import { createStatusBar, createToolbar } from '../src/ui';
import { formatBytes, setUpPage } from './common';

setUpPage();

const editor = new Editor({
  element: document.querySelector<HTMLElement>('#editor')!,
  extensions: [defaultExtensions()],
  ariaLabel: 'Long document',
});
createToolbar(editor, {
  container: document.querySelector<HTMLElement>('#toolbar')!,
  // The editor scrolls inside its frame: a toolbar stuck to the page would hide which one scrolls.
  sticky: false,
});
createStatusBar(editor, { container: document.querySelector<HTMLElement>('#status')! });

const sizeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-count]')];
const exportButton = document.querySelector<HTMLButtonElement>('#export')!;
const stat = (id: string) => document.querySelector<HTMLElement>(`#stat-${id}`)!;

/** Resolves after the browser has painted the current state. */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
}

function milliseconds(start: number): string {
  return `${Math.round(performance.now() - start).toLocaleString('en-US')} ms`;
}

async function load(button: HTMLButtonElement): Promise<void> {
  for (const other of sizeButtons) {
    other.disabled = true;
    other.setAttribute('aria-pressed', String(other === button));
  }
  stat('load').textContent = 'loading…';
  stat('export').textContent = '—';
  await nextPaint();
  const html = paragraphs(Number(button.dataset.count));
  stat('size').textContent = formatBytes(new TextEncoder().encode(html).length);
  const start = performance.now();
  editor.setHTML(html, { resetHistory: true });
  await nextPaint();
  stat('load').textContent = milliseconds(start);
  for (const other of sizeButtons) other.disabled = false;
}

for (const button of sizeButtons) button.addEventListener('click', () => load(button));

exportButton.addEventListener('click', () => {
  const start = performance.now();
  editor.getHTML();
  stat('export').textContent = milliseconds(start);
});

load(sizeButtons[0]!);
