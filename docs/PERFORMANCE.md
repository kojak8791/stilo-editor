# Performance

Stilo is made for long documents. This page explains what that means in practice, how it is
measured, and where the limits are. The decision record with the full data is
[ADR 0003](decisions/0003-performance-baseline.md).

## In practice

| Document | Size | What it feels like |
|---|---|---|
| Up to 1,000 paragraphs (a long report) | 40,000 words | Instant in every operation |
| 10,000 paragraphs (longer than most novels) | 400,000 words | Typing feels immediate; formatting, search and selection too |
| 50,000 paragraphs | 2 million words | Usable; typing shows a slight delay; loading takes a few seconds |

Every block stays in the page: the whole text can be searched with the browser's find, selected
and read by assistive technologies. Blocks far from the viewport are painted only when they come
into view, so a very fast jump through a long document can show blank space for a moment.

## How it is measured

Performance is a requirement with numbers attached (SPEC NFR-1), checked by a benchmark that
runs the editor in a real browser (Chromium, through Playwright) on generated documents:
paragraphs with headings, mixed formatting and links, and a list nested eight levels deep. The
same seed always produces the same documents, so runs can be compared.

For each document the benchmark measures:

- **key press to screen**: real key presses, one every 33 ms like a held key, timed by the
  browser from the press to the next frame painted on screen (Event Timing API);
- **typing in the editor**: 200 inserted characters at the start, middle and end of the
  document, each including the layout it causes;
- **load** (`setHTML`) and **export** (`getHTML`);
- **block move** (`Alt+↑` / `Alt+↓`) in the middle of the document;
- **memory** used after loading;
- **find and replace**: starting a search for a frequent word and for a rare phrase, and typing
  while a search is open (for information, without a budget).

Each other metric has a budget: a run that exceeds one fails (`npm run bench`). The reference run is
kept in [`bench/results/baseline.json`](../bench/results/baseline.json) and later runs are
compared with it.

## Reference numbers

Chromium on the reference desktop PC (ADR 0003). Times are medians unless noted; a key press
under 16 ms fits in one frame of a 60 Hz screen.

| Document | HTML size | Load | Key press to screen | Typing (p95) | Export | Block move (p95) | Memory |
|---|---|---|---|---|---|---|---|
| 1,000 paragraphs | 0.4 MB | 0.13 s | under 16 ms | 0.7 ms | 13 ms | 1.4 ms | 25 MB |
| 10,000 paragraphs | 4 MB | 1.1 s | 24 ms | 6.6 ms | 125 ms | 14 ms | 82 MB |
| 50,000 paragraphs | 20 MB | 5.6 s | 150 ms | 39 ms | 0.7 s | 80 ms | 307 MB |
| Nested list, 2,000 items | 0.2 MB | 0.09 s | under 16 ms | 0.2 ms | 12 ms | 0.2 ms | 21 MB |

## Why it is fast

- **ProseMirror** updates only the part of the page that changed.
- **No work proportional to the whole document on a keystroke**: plugins never scan the whole
  document, decorations are updated only where the text changed, and the HTML is serialized only
  when it is asked for (rules in [AGENTS.md](../AGENTS.md) §4).
- **The browser works only on what is visible**: top-level blocks use `content-visibility: auto`,
  so layout and painting skip the blocks outside the viewport. In 10,000 paragraphs this alone
  brought a key press from 144 ms to 24 ms.

## Limits

- **The size of the page.** Stilo does not virtualize the document: every block is in the DOM,
  and the browser's own work on a very large editable area grows with it. That is what remains
  at 50,000 paragraphs.
- **Top-level changes.** When a top-level block changes, ProseMirror compares the list of all
  top-level blocks, so moving a block in a huge flat document costs more than typing in it.
- **Find and replace.** Typing with a search open costs little more than without it: only the
  edited paragraph is searched again. Starting a search reads the whole document once and at
  most 1,000 matches are highlighted: at 50,000 paragraphs, showing or clearing the highlights
  takes 0.1–0.4 s, mostly ProseMirror redrawing them, and going to the next match about 70 ms.
  At 10,000 paragraphs every step stays under 70 ms. *Replace all* collects
  every match: with hundreds of thousands of matches it is slow (not measured).
- **Word count.** The first count reads the whole document (55 ms at 10,000 paragraphs); later
  counts read only the changed blocks. The status bar counts half a second after the last
  change, never on a keystroke.
- **One browser, one machine.** Budgets are set for Chromium on the reference PC; Firefox and
  WebKit are measured for information later.

## Run it yourself

```sh
npx playwright install chromium   # once
npm run bench
```

Results are written to `bench/results/<date>.json`. In the demo, `/demo/?bench` exposes the
benchmark API: open the browser console and run `__stilo.load('paragraphs-10k')` to try a large
document by hand.

## Download size

What an app built with Vite downloads, measured on 2026-10-13 with `npm run size`:

| App | Minified | Gzip |
|---|---|---|
| Minimal: `Document`, `Text`, `Paragraph`, `Bold` | 246.4 kB | 77.6 kB |
| Core and `defaultExtensions` | 274.1 kB | 85.8 kB |
| Core, `defaultExtensions` and the default UI | 327.2 kB | 102.4 kB |
| … plus, on the first opening of the character picker | 21.2 kB | 7.1 kB |

Most of it is ProseMirror, which every app needs, and DOMPurify, which sanitizes the HTML. The
styles add 2.9 kB gzip. `npm run size` builds the library, bundles these apps from `dist/` like a
consumer would, and fails if the minimal app contains packages that only unused extensions need.
