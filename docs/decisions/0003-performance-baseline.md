# 0003 — Performance baseline: `content-visibility` and calibrated budgets

- Status: accepted
- Date: 2026-10-12

## Context

SPEC NFR-1.4 set initial budgets "to be calibrated by an ADR after the first measurement". T-017
built the harness (`npm run bench`, ARCHITECTURE §11) and ran it on the reference machine
(the PM's PC, Chromium 156, demo served by Vite in dev mode).

First run, without any containment (ms):

| Metric | 10k paragraphs | 50k paragraphs |
|---|---|---|
| `setHTML` | 1542 | 7774 |
| `getHTML` | 138 | 681 |
| Typing p95 (synthetic) | 13.8 | 77 |
| Move block p95 | 19.3 | 100 |

Findings:

1. **Our code is not the bottleneck.** In 10k paragraphs one synthetic keystroke cost 0.1 ms to
   apply the transaction, 1.5 ms to update the ProseMirror view and 9.9 ms of forced browser
   layout.
2. **The synthetic metric hides most of what a user feels.** Real key presses (Event Timing,
   press to next paint) in the middle of 10k paragraphs took 144 ms (median), 768 ms in 50k.
   A Chromium trace shows native work: contenteditable text insertion, layout, selection sync,
   paint. The PM saw the same in the demo: a held key showed characters in bursts of 3–4.
3. **ProseMirror reconciles every top-level block** when one of them changes
   (`ViewTreeUpdater`), so a top-level change (typing, and even more moving a block) is O(n) in
   the number of top-level blocks: about 6 ms per keystroke and 70 ms per block move in 50k.

## Decision

1. `content.css` gives the top-level blocks `content-visibility: auto` with
   `contain-intrinsic-size: auto 3em`: the browser skips style, layout and paint of the blocks
   outside the viewport. Measured with real keys: 10k paragraphs 144 → 24 ms, 50k 768 → 144 ms
   (median). Containment stops margins from collapsing through a block, so `content.css` trims
   the first and last child margins inside a blockquote.
2. The harness also measures real key presses (`keyToPaintMedian`, `keyToPaintP95`), for
   information until enough runs exist to set a budget.
3. Budgets (`bench/budgets.ts`): 10k paragraphs unchanged; 50k paragraphs typing p95 33 → 50 ms
   and move block 33 → 100 ms, a known ProseMirror limit (finding 3). Load and export unchanged.
4. `bench/results/baseline.json` keeps the first run with these decisions, to compare later
   runs.

Baseline (ms, heap in MB):

| Metric | 1k | 10k | 50k | nested list |
|---|---|---|---|---|
| `setHTML` | 128 | 1104 | 5649 | 88 |
| `getHTML` | 12.9 | 125 | 674 | 11.9 |
| Typing p95 / median (synthetic) | 0.7 / 0.2 | 6.6 / 1.0 | 39 / 6.1 | 0.2 / 0.1 |
| Move block p95 | 1.4 | 14 | 80 | 0.2 |
| Real key to paint, median / p95 | ≤16 / ≤16 | 24 / 40 | 152 / 312 | ≤16 / ≤16 |
| Heap | 25 | 82 | 307 | 21 |

## Consequences

- Up to about 10k paragraphs typing is fluid; at 50k it is usable but visibly slower. This is
  the "DOM size" limit of SPEC NFR-1 (risk 1): documented, not hidden. Stilo does not
  virtualize the document.
- With `content-visibility`, a block not rendered yet counts as 3em: the scrollbar settles the
  first time a long document is scrolled through, and a fast jump shows blank space for a moment
  before the content is painted (PM check). Find in page, selection and accessibility are not
  affected.
- Candidates for later work, in order of expected gain: toolbar `isEnabled` checks that are
  O(n) at the top level (for example `insertBlock` runs `canReplaceWith` on the document
  content), and the per-keystroke cost of the toolbar refresh and of the link bubble.
- Measurements depend on the machine; budgets are for the reference machine. The dev server
  is not minified, which matters little for these metrics (most of the time is native).
