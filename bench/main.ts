/// <reference types="vite/client" />
import '../src/styles/content.css';
import './bench.css';
import '../src/styles/ui.css';
import { defaultExtensions, Editor } from '../src';
import { createStatusBar, createToolbar } from '../src/ui';
import { createBenchApi, DOCUMENTS, type Phases } from './api';

const PHASES = ['command', 'state', 'view', 'events', 'layout', 'frame', 'paint', 'total'] as const;
/** Characters typed, or blocks moved, by one button. */
const REPEAT = 20;

const editor = new Editor({
  element: document.querySelector<HTMLElement>('#editor')!,
  extensions: [
    defaultExtensions({ placeholder: { placeholder: 'Load a document from the panel…' } }),
  ],
  ariaLabel: 'Benchmark editor',
});
createToolbar(editor, { container: document.querySelector<HTMLElement>('#toolbar')! });
createStatusBar(editor, { container: document.querySelector<HTMLElement>('#status')! });

const api = createBenchApi(editor);
window.__stilo = api;

const controls = document.querySelector<HTMLFieldSetElement>('#controls')!;
const stats = document.querySelector<HTMLElement>('#stats')!;
const status = document.querySelector<HTMLElement>('#state')!;
const results = document.querySelector<HTMLTableSectionElement>('#results')!;
const rows: Array<{ label: string; phases: Phases }> = [];

function group(title: string): HTMLElement {
  const element = document.createElement('div');
  element.className = 'bench__group';
  element.append(Object.assign(document.createElement('strong'), { textContent: title }));
  controls.append(element);
  return element;
}

function button(parent: HTMLElement, label: string, task: () => Promise<void>): void {
  const element = Object.assign(document.createElement('button'), { type: 'button' });
  element.textContent = label;
  element.addEventListener('click', () => void run(label, task));
  parent.append(element);
}

function field(parent: HTMLElement, label: string, value: string): HTMLInputElement {
  const input = Object.assign(document.createElement('input'), { type: 'text', value });
  const wrapper = document.createElement('label');
  wrapper.append(`${label} `, input);
  parent.append(wrapper);
  return input;
}

/** Resolves once the page has painted, so that the status shows before a long task. */
function painted(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
}

async function run(label: string, task: () => Promise<void>): Promise<void> {
  controls.disabled = true;
  status.textContent = `Running: ${label}…`;
  await painted();
  try {
    await task();
    status.textContent = 'Ready.';
  } catch (error) {
    status.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
    console.error(error);
  } finally {
    controls.disabled = false;
    updateStats();
  }
}

function log(label: string, phases: Phases): void {
  rows.push({ label, phases });
  console.log(label, phases);
  const row = results.insertRow(0);
  row.insertCell().textContent = label;
  for (const phase of PHASES) row.insertCell().textContent = phases[phase].toFixed(1);
}

/** Measures `operation`; a command that returns `false` is logged as not applied. */
async function measure(label: string, operation: () => unknown): Promise<void> {
  let applied: unknown;
  const phases = await api.measure(() => {
    applied = operation();
  });
  log(applied === false ? `${label} (not applied)` : label, phases);
}

/** Measures `operation` {@link REPEAT} times and logs the mean of each phase. */
async function repeat(label: string, operation: (i: number) => void): Promise<void> {
  const all: Phases[] = [];
  for (let i = 0; i < REPEAT; i++) all.push(await api.measure(() => operation(i)));
  const mean = Object.fromEntries(
    PHASES.map((phase) => [phase, all.reduce((sum, phases) => sum + phases[phase], 0) / REPEAT]),
  ) as unknown as Phases;
  log(`${label} ×${REPEAT} (mean)`, mean);
}

function updateStats(): void {
  const heap = api.heapSize();
  stats.textContent = [
    `${editor.state.doc.childCount.toLocaleString('en')} blocks`,
    `${editor.view.dom.getElementsByTagName('*').length.toLocaleString('en')} DOM elements`,
    heap === null ? 'heap unknown' : `heap ${Math.round(heap / 1024 / 1024)} MB`,
  ].join(' · ');
}

const documents = group('Document');
for (const [name, generate] of Object.entries(DOCUMENTS)) {
  button(documents, name, async () => {
    const html = generate();
    await measure(`Load ${name}`, () => editor.setHTML(html, { resetHistory: true }));
  });
}
button(documents, 'Empty', () =>
  measure('Empty', () => editor.setHTML('', { resetHistory: true })),
);
button(documents, 'getHTML()', () =>
  measure('getHTML()', () => {
    editor.getHTML();
  }),
);

const selection = group('Selection');
button(selection, 'Select all', () => measure('Select all', () => editor.commands.selectAll()));
for (const [label, fraction] of [
  ['Cursor at start', 0],
  ['Cursor in the middle', 0.5],
  ['Cursor at end', 1],
] as const) {
  button(selection, label, () => measure(label, () => api.placeCursor(fraction)));
}

const edit = group('Edit (on the selection)');
button(edit, 'UPPERCASE', () => measure('UPPERCASE', () => editor.commands.setTextCase('upper')));
button(edit, 'lowercase', () => measure('lowercase', () => editor.commands.setTextCase('lower')));
button(edit, `Type ${REPEAT} characters`, () =>
  repeat('Type a character', () => editor.view.dispatch(editor.state.tr.insertText('x'))),
);
button(edit, `Move block ${REPEAT} times`, () =>
  repeat('Move block', (i) =>
    i % 2 ? editor.commands.moveBlockUp() : editor.commands.moveBlockDown(),
  ),
);
button(edit, 'Undo', () => measure('Undo', () => editor.commands.undo()));
button(edit, 'Redo', () => measure('Redo', () => editor.commands.redo()));

const search = group('Search');
const find = field(search, 'Find', 'dolor');
const replacement = field(search, 'Replace with', 'DOLOR');
button(search, 'Search', () =>
  measure(`Search "${find.value}"`, () => editor.commands.setSearch({ text: find.value })),
);
button(search, 'Replace all', async () => {
  await measure(`Search "${find.value}"`, () => editor.commands.setSearch({ text: find.value }));
  await measure(`Replace all with "${replacement.value}"`, () =>
    editor.commands.replaceAll(replacement.value),
  );
});
button(search, 'Clear search', () => measure('Clear search', () => editor.commands.clearSearch()));

document.querySelector('#copy')!.addEventListener('click', () => {
  const lines = [
    ['operation', ...PHASES].join('\t'),
    ...rows.map(({ label, phases }) =>
      [label, ...PHASES.map((phase) => phases[phase].toFixed(1))].join('\t'),
    ),
  ];
  void navigator.clipboard.writeText(lines.join('\n')).then(() => {
    status.textContent = `Copied ${rows.length} results.`;
  });
});
document.querySelector('#clear')!.addEventListener('click', () => {
  rows.length = 0;
  results.replaceChildren();
});

updateStats();
