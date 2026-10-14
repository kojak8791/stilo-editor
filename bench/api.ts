import { Selection } from 'prosemirror-state';
import type { Editor } from '../src';
import { nestedList, paragraphs, table } from './generators';

/** Benchmark documents of SPEC NFR-1.2, generated in the page (not timed). */
export const DOCUMENTS: Readonly<Record<string, () => string>> = {
  'paragraphs-1k': () => paragraphs(1_000),
  'paragraphs-10k': () => paragraphs(10_000),
  'paragraphs-50k': () => paragraphs(50_000),
  'nested-list': () => nestedList(2_000),
  'table-large': () => table(200, 10),
};

/** Where the time of one operation goes, in milliseconds; the phases add up to `total`. */
export interface Phases {
  /** Building the transactions (the command), or parsing the HTML. */
  command: number;
  /** `EditorState.applyTransaction`, with the plugins' `appendTransaction`. */
  state: number;
  /** `EditorView.updateState`: the DOM update. */
  view: number;
  /** The editor's synchronous event listeners (`transaction`, `input`, ...). */
  events: number;
  /** The forced layout after the operation. */
  layout: number;
  /** Until the next animation frame, where the toolbar refreshes (plus up to a frame of wait). */
  frame: number;
  /** From that frame to the next task: style, layout and paint of the frame. */
  paint: number;
  total: number;
}

/**
 * What the benchmark page (`/bench/`, ARCHITECTURE §11) exposes as `window.__stilo`.
 * Every timing is in milliseconds and includes a forced layout, so that it covers the DOM work.
 */
export interface BenchApi {
  /** The page's editor, for ad hoc measurements. */
  readonly editor: Editor;
  /** `setHTML()` of a benchmark document with a fresh history. */
  load(name: string): number;
  /** One `getHTML()`. */
  getHTML(): number;
  /** `iterations` single-character insertions at `fraction` (0 = start, 1 = end) of the doc. */
  typing(fraction: number, iterations: number): number[];
  /** `iterations` block moves in the middle of the document, alternating down and up. */
  moveBlock(iterations: number): number[];
  /** `setSearch({ text })` until the highlights are rendered; an empty text clears the search. */
  search(text: string): number;
  /** Runs `operation` and splits its time into {@link Phases}, up to the next paint. */
  measure(operation: () => void): Promise<Phases>;
  /** Puts the cursor at `fraction` of the document. */
  placeCursor(fraction: number): void;
  /** JS heap in use (Chromium only), `null` elsewhere. */
  heapSize(): number | null;
  /** Puts the cursor at `fraction` of the document and focuses the editor (for real keys). */
  focusAt(fraction: number): void;
  /**
   * Starts recording real key presses: Event Timing durations of `keydown`, from the press to
   * the next paint. The API reports only durations of at least 16 ms (Chromium).
   */
  recordKeys(): void;
  /** Durations recorded since {@link recordKeys}. */
  keyDurations(): number[];
}

declare global {
  interface Window {
    __stilo?: BenchApi;
  }
}

function layout(): void {
  void document.body.offsetHeight;
}

function time(run: () => void): number {
  const start = performance.now();
  run();
  layout();
  return performance.now() - start;
}

/** Resolves at the next animation frame, with its time. */
function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve(performance.now())));
}

/** Resolves at the next task, with its time: after a frame, once it is painted. */
function nextTask(): Promise<number> {
  return new Promise((resolve) => setTimeout(() => resolve(performance.now())));
}

/**
 * Wraps the view's `dispatch` and `updateState` to time the state, view and event phases of the
 * operation that `run` executes. Nested dispatches (from a listener) count in their parent.
 */
function createProbe(editor: Editor): (phases: Phases, operation: () => void) => void {
  const { view } = editor;
  const dispatch = view.dispatch.bind(view);
  const updateState = view.updateState.bind(view);
  let current: Phases | null = null;
  let depth = 0;
  let dispatchStart = 0;
  let viewEnd = 0;

  view.dispatch = (tr) => {
    depth++;
    if (depth === 1) dispatchStart = viewEnd = performance.now();
    try {
      dispatch(tr);
    } finally {
      depth--;
    }
    if (current && depth === 0) current.events += performance.now() - viewEnd;
  };
  view.updateState = (state) => {
    const start = performance.now();
    updateState(state);
    viewEnd = performance.now();
    if (!current || depth > 1) return;
    if (depth === 1) current.state += start - dispatchStart;
    current.view += viewEnd - start;
  };

  return (phases, operation) => {
    current = phases;
    try {
      operation();
    } finally {
      current = null;
    }
  };
}

/** Creates the benchmark API for `editor`. */
export function createBenchApi(editor: Editor): BenchApi {
  const placeCursor = (fraction: number): void => {
    const { doc } = editor.state;
    const pos = Math.round(doc.content.size * fraction);
    editor.view.dispatch(editor.state.tr.setSelection(Selection.near(doc.resolve(pos))));
  };
  const probe = createProbe(editor);
  const keys: number[] = [];

  return {
    editor,
    load(name) {
      const generate = DOCUMENTS[name];
      if (!generate) throw new Error(`Unknown benchmark document "${name}"`);
      const html = generate();
      return time(() => editor.setHTML(html, { resetHistory: true }));
    },
    getHTML: () => time(() => editor.getHTML()),
    typing(fraction, iterations) {
      placeCursor(fraction);
      return Array.from({ length: iterations }, () =>
        time(() => editor.view.dispatch(editor.state.tr.insertText('x'))),
      );
    },
    moveBlock(iterations) {
      placeCursor(0.5);
      return Array.from({ length: iterations }, (_, i) =>
        time(() => (i % 2 ? editor.commands.moveBlockUp() : editor.commands.moveBlockDown())),
      );
    },
    search: (text) => time(() => editor.commands.setSearch({ text })),
    async measure(operation) {
      const phases: Phases = {
        ...{ command: 0, state: 0, view: 0, events: 0 },
        ...{ layout: 0, frame: 0, paint: 0, total: 0 },
      };
      const start = performance.now();
      probe(phases, operation);
      const ran = performance.now();
      layout();
      const laidOut = performance.now();
      const framed = await nextFrame();
      const painted = await nextTask();
      phases.command = ran - start - phases.state - phases.view - phases.events;
      phases.layout = laidOut - ran;
      phases.frame = framed - laidOut;
      phases.paint = painted - framed;
      phases.total = painted - start;
      return phases;
    },
    placeCursor,
    focusAt(fraction) {
      placeCursor(fraction);
      editor.focus();
    },
    recordKeys() {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          if (entry.name === 'keydown') keys.push(entry.duration);
      }).observe({ type: 'event', durationThreshold: 16 } as PerformanceObserverInit);
    },
    keyDurations: () => [...keys],
    heapSize: () =>
      (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize ?? null,
  };
}
