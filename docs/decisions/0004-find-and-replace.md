# 0004 — Find and replace with `prosemirror-search`

- Status: proposed
- Date: 2026-10-14

## Context

F-902 asks for find and replace with match case and whole word. `prosemirror-search` (official
ProseMirror package, MIT) provides:

- `SearchQuery`: matching inside textblocks across marks (`bo<b>ld</b>` matches `bold`), leaf
  nodes, case, whole word (Unicode letters), regular expressions, and the replacement content
  (`getReplacements`, which also reads `$&` and `$1` in the replacement text, even for a
  literal search);
- a `search()` plugin that highlights every match, and commands (`findNext`, `replaceNext`,
  `replaceAll`, ...) that read the query from that plugin's state.

The plugin rebuilds all highlights on every transaction that changes the document or the
selection, scanning the whole document; each match restarts the scan from the start of the
document (`findNext` walks the top-level children from the first one), so the cost grows with
matches × blocks. That breaks AGENTS.md §4 and the budgets of ADR 0003 while a search is open.
Measured in Node (no DOM, `prosemirror-search` 1.1.1):

| Document | Query | Cost |
|---|---|---|
| 10,000 paragraphs | none | 0.03 ms per keystroke |
| 10,000 paragraphs | 4,836 matches | 250 ms per keystroke |
| 50,000 paragraphs (15 MB) | `stilo` (tens of thousands of matches) | 13 s to set the query, 11 s per keystroke |
| 10,000 paragraphs | `o` (266,746 matches) | stopped after more than a minute |

`SearchQuery.findNext` on the same 50,000-paragraph document, stopping at 1,000 matches:

| Query | Matches | Plain | Whole word |
|---|---|---|---|
| no match | 0 | 18 ms | 12 ms |
| frequent, two letters (`or`, `di`) | 1,000 | 1–2 ms | 16–47 ms |
| frequent word | 1,000 | 3–5 ms | 8–12 ms |
| rare phrase, matches spread over the document | 693–757 | 123–129 ms | 280–303 ms |
| one paragraph rescanned (the last one) | — | 0.5–4 ms | — |

## Decision

- Add `prosemirror-search` to the runtime `dependencies` (ARCHITECTURE §1.1). Only
  `SearchQuery` is used: matching follows ProseMirror's rules.
- Its `search()` plugin, its commands and `getReplacements` are not used: the replacement text
  is inserted literally, with the marks shared by the whole match. The `Search` extension
  (`src/extensions/search/`) has its own plugin and commands:
  - setting a query scans the document once and stops at `maxMatches` highlights (default
    1,000); the count then reads `1000+`;
  - a transaction that changes the document rescans only the textblocks it touched, and maps the
    other highlights (`DecorationSet.map`); a selection change only checks whether the selection
    is a match;
  - the commands (`findNext`, `findPrevious`, `replaceNext`, `replaceAll`) scan from the
    selection, once per call.
- Queries are literal (`literal: true`, no regular expressions: SPEC F-902 asks for none).
- The default UI (UI.md) waits 350 ms after the last keystroke in the find field before searching
  (`Enter` searches at once), and searches only from 2 characters.

## Consequences

- One more runtime dependency, small and with ProseMirror packages as its only dependencies;
  tree-shaken away by apps without the `Search` extension.
- Our plugin and commands are code to maintain and test (incremental update, wrap around,
  replacement): dense unit tests on edits inside, across and next to a match, undo, replace all.
- With more than `maxMatches` matches, the matches after the last highlight are not
  highlighted; `findNext` still reaches them.
- `replaceAll` collects every match: with hundreds of thousands of matches it is slow (one user
  action, not measured).
- `npm run bench` measures the search in Chromium, rendering included (informative metrics,
  no budget): setting a frequent search (1,000+ matches) 35 ms at 10,000 paragraphs and 116 ms
  at 50,000; a rare phrase 21 ms and 92 ms; typing in the middle with the frequent search
  active, p95 3.5 ms and 17.9 ms.
