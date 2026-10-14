import { Selection } from 'prosemirror-state';
import { nestedList, paragraphs, table } from '../bench/generators';
import type { Editor } from '../src';

/** Benchmark documents of SPEC NFR-1.2, generated in the page (not timed). */
const DOCUMENTS: Readonly<Record<string, () => string>> = {
  'paragraphs-1k': () => paragraphs(1_000),
  'paragraphs-10k': () => paragraphs(10_000),
  'paragraphs-50k': () => paragraphs(50_000),
  'nested-list': () => nestedList(2_000),
  'table-large': () => table(200, 10),
};

/**
 * What the demo exposes as `window.__stilo` in bench mode (`/demo/?bench`, ARCHITECTURE §11).
 * Every timing is in milliseconds and includes a forced layout, so that it covers the DOM work.
 */
export interface BenchApi {
  /** The demo editor, for ad hoc measurements. */
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

/** Creates the benchmark API for `editor`. */
export function createBenchApi(editor: Editor): BenchApi {
  const placeCursor = (fraction: number): void => {
    const { doc } = editor.state;
    const pos = Math.round(doc.content.size * fraction);
    editor.view.dispatch(editor.state.tr.setSelection(Selection.near(doc.resolve(pos))));
  };

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
