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
paragraphs with headings, mixed formatting and links, a list nested eight levels deep, and a
table of 200 rows × 10 columns. The
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
| Table, 200 × 10 cells | 0.2 MB | 0.06 s | under 16 ms | 0.3 ms | 10 ms | — | 22 MB |

## Why it is fast

- **ProseMirror** updates only the part of the page that changed.
- **No work proportional to the whole document on a keystroke**: plugins never scan the whole
  document, decorations are updated only where the text changed, and the HTML is serialized only
  when it is asked for (rules in [AGENTS.md](../AGENTS.md) §4).
- **The browser works only on what is visible**: top-level blocks use `content-visibility: auto`,
  so layout and painting skip the blocks outside the viewport. In 10,000 paragraphs this alone
  brought a key press from 144 ms to 24 ms.

## Bulk changes

Commands that change many blocks at once (text case of a whole document, checking a long
checklist, table commands) replace them in one step instead of one step per block
([ARCHITECTURE.md §6.5](ARCHITECTURE.md#65-changes-to-many-nodes)). What that changed:

| Operation | Where measured | Before | After |
|---|---|---|---|
| Text case of 50,000 paragraphs (the new editor state) | Chrome | 4.1 s | 1 ms |
| Checking 4,000 task items | jsdom (unit tests) | 884 ms | 9 ms |
| Header column of a 200-row table inside 50,000 paragraphs | unknown | 164 ms | 35 ms |

Adding or deleting a column, or turning the first column into headers, in a 200-row table now
takes 6–10 ms alone and 33–48 ms inside 50,000 paragraphs (undo the same).

Paragraphs and headings without alignment or line spacing share one attribute object: one
object per paragraph cost 19 MB of memory at 50,000 paragraphs.

## Limits

- **The size of the page.** Stilo does not virtualize the document: every block is in the DOM,
  and the browser's own work on a very large editable area grows with it. That is what remains
  at 50,000 paragraphs.
- **Top-level changes.** When a top-level block changes, ProseMirror compares the list of all
  top-level blocks, so moving a block in a huge flat document costs more than typing in it.
- **Find and replace.** Typing with a search open costs little more than without it: only the
  edited paragraph is searched again. Starting a search reads the whole document once: every
  match is counted, the first 1,000 are highlighted. At 50,000 paragraphs, showing or clearing
  the highlights takes 0.1–0.5 s, mostly ProseMirror redrawing them, and going to the next
  match 50–110 ms. At 10,000 paragraphs every step stays under 150 ms, the next match about
  10 ms. *Replace all* is one change: 0.3 s for 9,500 matches in 10,000 paragraphs, about 6 s
  for 48,000 matches in 50,000 paragraphs, where ProseMirror walks the blocks before each
  changed one to place it.
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

Results are written to `bench/results/<date>.json`.

To try the limits by hand, run `npm run dev` and open `/bench/`: the full editor beside a panel
that loads the benchmark documents and runs bulk operations on them (select all, text case,
typing, block moves, undo, search, replace all). Each operation is listed with its time split
into phases, in milliseconds:

| Phase | What it covers |
|---|---|
| cmd | The command that builds the change, or the parsing of a loaded document |
| state | `applyTransaction`: the new state, with the plugins' fixes |
| view | `updateState`: the update of the page |
| events | The editor's event listeners |
| layout | The layout of the page after the change |
| frame | Until the next frame, where the toolbar refreshes (up to 16 ms of it is waiting) |
| paint | Painting that frame |

**Copy** puts the list on the clipboard, one row per line with tab-separated columns. The same
functions are on `window.__stilo` in the browser console, e.g.
`await __stilo.measure(() => __stilo.editor.commands.selectAll())`.

## Download size

What an app built with Vite downloads, measured on 2026-10-14 with `npm run size`:

| App | Minified | Gzip |
|---|---|---|
| Minimal: `Document`, `Text`, `Paragraph`, `Bold` | 266.4 kB | 84.2 kB |
| Core and `defaultExtensions` | 333.7 kB | 104.9 kB |
| Core, `defaultExtensions` and the default UI | 410.4 kB | 127.5 kB |
| … plus, on the first opening of the character picker | 21.2 kB | 7.1 kB |

Most of it is ProseMirror, which every app needs, and DOMPurify, which sanitizes the HTML. The
styles add 2.9 kB gzip. `npm run size` builds the library, bundles these apps from `dist/` like a
consumer would, and fails if the minimal app contains packages that only unused extensions need.
`prosemirror-tables` is the exception: it registers its cell selection when it is loaded, so
bundlers keep part of it (12.8 kB minified, 4.1 kB gzip) even in an app without the `Table`
extension.
