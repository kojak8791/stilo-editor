# T-017 — Benchmark harness (NFR-1)

| Field | Value |
|---|---|
| Status | `review` |
| Spec | NFR-1 |
| Milestone | M1 |
| Depends on | T-016 |
| Branch | `task/T-017-bench` |

## Goal

`npm run bench` measures the editor on the documents of SPEC NFR-1.2 in a real browser, writes
the results and fails when a budget is exceeded; the first measurement calibrates the budgets.

## Context

- `docs/SPEC.md` NFR-1, `docs/ARCHITECTURE.md` §11
- `demo/main.ts`, `package.json` (`bench` script, `@playwright/test`)

## Scope

Files to create:

- `bench/generators/index.ts`, `bench/budgets.ts`, `bench/editor.bench.ts`
- `bench/results/baseline.json`, `playwright.bench.config.ts`, `demo/bench.ts`
- `docs/decisions/0003-performance-baseline.md`

Files to modify:

- `demo/main.ts` (bench mode), `src/styles/content.css` (ADR 0003)
- `docs/SPEC.md` NFR-1.3/1.4, `docs/ARCHITECTURE.md` §11, `docs/tasks/BACKLOG.md`

## Contract

- **Generators** (seeded, mulberry32): `paragraphs(count, seed)` — 20–60 words with strong,
  em, u, s, code and links, an `<h2>` every 20 paragraphs; `nestedList(count, seed, maxDepth)` —
  random walk of depth up to 8, every nested list randomly `ul` or `ol`.
- **Bench mode** `/demo/?bench`: same editor and toolbar as the demo, no `getHTML()` per
  update, `window.__stilo` (`BenchApi`): `load`, `getHTML`, `typing`, `moveBlock`, `heapSize`,
  `focusAt`, `recordKeys`, `keyDurations`, `editor`. Documents are generated in the page.
- **Metrics** per document: `load`, `getHTML` (median of 5), synthetic typing (200 insertions at
  start, middle, end; p95 = worst position), move block (50, alternating down/up), real key to
  paint (40 keys, one every 33 ms; durations under 16 ms count as 16), heap.
- **Budgets** checked by a final `budgets` test after all documents are measured; results in
  `bench/results/<date>.json`.
- Documents: `paragraphs-1k`, `-10k`, `-50k`, `nested-list` (M2 adds `table-large`,
  `word-paste`). Chromium only for now (Firefox and WebKit are informative in SPEC and not
  installed).

## Tests

- `npm run check` (typecheck and lint cover `bench/` and the demo).
- `npm run bench` passes on the reference machine.
- PM check: typing, held key, scrolling, find, selection and blockquote in large documents
  (`/demo/?bench`, then `__stilo.load('paragraphs-10k')` in the console).

## Acceptance criteria

- [x] `npm run check` passes
- [x] `npm run bench` passes, `bench/results/baseline.json` committed
- [x] ADR 0003 with the measurements and the calibrated budgets
- [x] PM check in the demo (done during the task)

## Questions

None.

## Report

### Files changed

| File | Action |
|---|---|
| `bench/generators/index.ts` | Created — seeded generators |
| `bench/budgets.ts` | Created — budgets, calibrated by ADR 0003 |
| `bench/editor.bench.ts` | Created — Playwright benchmark, final `budgets` test |
| `bench/results/baseline.json` | Created — reference run |
| `playwright.bench.config.ts` | Created — Chromium, Vite on port 5179 (`BROWSER=none`) |
| `demo/bench.ts`, `demo/main.ts` | Bench mode and `BenchApi` |
| `src/styles/content.css` | `content-visibility: auto` on top-level blocks, blockquote margins |
| `docs/decisions/0003-performance-baseline.md` | Created |
| `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `docs/tasks/BACKLOG.md` | NFR-1 updates, notes |

### Summary

The first run failed four budgets. Profiling showed that our code costs little (0.1 ms per
transaction) and that the time is native browser work: layout first, then, with real keys,
contenteditable insertion, selection sync and paint. `content-visibility: auto` on the top-level
blocks brought real typing in 10k paragraphs from 144 to 24 ms per key; the 50k budgets for
typing and block moves were raised to a known ProseMirror limit (ADR 0003).

### Points for the reviewer

- The synthetic typing metric of NFR-1.3 underestimates what a user feels (6 ms vs 152 ms in
  50k): the real key metric is the one to watch, informative until it has a budget.
- `content-visibility` side effects seen by the PM: a fast scroll jump shows blank space for a
  moment; find, selection and blockquote are unaffected.

### Failed `npm run check` runs before final: 0

## Metrics

- Architect = implementer, same session as T-015 and T-016. `/context` Messages at start: 204K;
  at end: unknown (to be measured by the PM).
- Bench runs during the task: several (first PM run, profiling probes, comparisons), all on the
  PM's machine.
- Review rounds: 1 (PM demo check of large documents, during the task). Escalation: none.
