# Stilo — Functional & Non-Functional Specification

Status: **draft v0.1** (2026-10-10). Changes to decisions marked as such require an ADR in
`docs/decisions/`.

Every feature has a stable ID (`F-xxx`) referenced by tasks. Priority / milestone:

- **M1 — MVP**: usable rich-text editor, HTML in/out, default toolbar, demo page, benchmark harness.
- **M2 — v1.0**: tables, images, fonts/colors, paste cleanup, i18n, productivity tools.
- **M3 — Later**: advanced features, collaboration, framework wrappers.

Keyboard shortcuts use ProseMirror notation: `Mod` = Ctrl on Windows/Linux, Cmd on macOS.

---

## 1. Core editor (`F-0xx`)

| ID | Feature | M | Notes |
|---|---|---|---|
| F-001 | `Editor` class: create on a DOM element with HTML content and a list of extensions | M1 | See ARCHITECTURE §5 |
| F-002 | `getHTML()` / `setHTML(html, { resetHistory?, emitUpdate? })` | M1 | Canonical output, see ARCHITECTURE §7. Replacement is undoable unless `resetHistory: true` |
| F-003 | `getJSON()` / `setJSON(json)` | M1 | ProseMirror JSON, optional format |
| F-004 | `getText()` plain text export | M1 | Blocks separated by `\n\n` |
| F-005 | `isEmpty`, `isEditable`, `setEditable(bool)` (read-only mode) | M1 | |
| F-006 | Events: `update`, `selectionUpdate`, `transaction`, `focus`, `blur`, `destroy` | M1 | `on/off` API |
| F-007 | `commands.*`, `can().*`, `isActive(name, attrs?)` | M1 | |
| F-008 | `focus(position?)`, `blur()`, `destroy()` | M1 | |
| F-009 | Multiple independent editors on the same page | M1 | No global state |
| F-010 | HTML sanitization of all input (setHTML, paste, drop) with DOMPurify | M1 | See ARCHITECTURE §8 |
| F-011 | Placeholder text on empty document | M1 | Option `placeholder` |
| F-012 | Drop cursor and gap cursor | M1 | `prosemirror-dropcursor`, `prosemirror-gapcursor` |

## 2. History (`F-1xx`)

| ID | Feature | M | Notes |
|---|---|---|---|
| F-101 | Undo / Redo | M1 | `Mod-z`, `Mod-Shift-z`, `Mod-y` |
| F-102 | Configurable depth (default 100) and grouping delay (default 500 ms) | M1 | |
| F-103 | History implementation is swappable (local now, Yjs undo later) | M1 | Commands `undo`/`redo` are abstract |

## 3. Text formatting — marks (`F-2xx`)

| ID | Feature | M | Shortcut | Markdown input rule |
|---|---|---|---|---|
| F-201 | Bold | M1 | `Mod-b` | `**text**` |
| F-202 | Italic | M1 | `Mod-i` | `*text*`, `_text_` |
| F-203 | Underline | M1 | `Mod-u` | — |
| F-204 | Strikethrough | M1 | `Mod-Shift-s` | `~~text~~` |
| F-205 | Inline code | M1 | `Mod-e` | `` `text` `` |
| F-206 | Link (add/edit/remove, `target`, auto `rel`) | M1 | `Mod-k` (opens the link popover, F-803) | Autolink on typing URL + space (M2) |
| F-207 | Subscript / Superscript (mutually exclusive) | M2 | `Mod-,` / `Mod-.` | — |
| F-208 | Text color | M2 | — | — |
| F-209 | Highlight (background color) | M2 | `Mod-Shift-h` | `==text==` |
| F-210 | Font family | M2 | — | — |
| F-211 | Font size | M2 | — | — |
| F-212 | Clear formatting (remove all formatting marks in selection; links are kept) | M1 | `Mod-\` | — |

## 4. Blocks (`F-3xx`)

| ID | Feature | M | Shortcut | Markdown input rule |
|---|---|---|---|---|
| F-301 | Paragraph | M1 | `Mod-Alt-0` | — |
| F-302 | Headings H1–H6 (allowed levels configurable) | M1 | `Mod-Alt-1`…`6` | `# ` … `###### ` |
| F-303 | Blockquote | M1 | `Mod-Shift-b` | `> ` |
| F-304 | Horizontal rule | M1 | — | `---` |
| F-305 | Hard break (`<br>`) | M1 | `Shift-Enter` | — |
| F-306 | Code block (plain, `language` attribute) | M2 | `Mod-Alt-c` | ```` ``` ```` |
| F-307 | Code block syntax highlighting | M3 | — | — |
| F-308 | Text alignment (left/center/right/justify) on paragraphs and headings | M2 | `Mod-Shift-l/e/r/j` | — |
| F-309 | **Move block up/down** | M1 | `Alt-ArrowUp` / `Alt-ArrowDown` | — |
| F-310 | Block indentation (non-list) | M3 | — | — |

### F-309 — Move block: exact behavior

- The *movable unit* is a direct child of the innermost ancestor of the selection that is a
  list (`bulletList`, `orderedList`, `taskList`: the unit is a list item) or a container
  (`doc`, `blockquote`, `tableCell`, `tableHeader`: the unit is a block). So a paragraph in a
  blockquote inside a list item moves within the blockquote.
- If the selection spans several sibling units, all of them move together.
- Moving past the first/last sibling is a **no-op** (command returns `false`); units never jump
  out of their container.
- The selection moves with the block; the move is a single undo step.

## 5. Lists (`F-4xx`)

| ID | Feature | M | Shortcut | Markdown input rule |
|---|---|---|---|---|
| F-401 | Bullet list | M1 | `Mod-Shift-8` | `- `, `* `, `+ ` |
| F-402 | Ordered list (with `start` attribute) | M1 | `Mod-Shift-7` | `1. ` (number becomes `start`) |
| F-403 | Nested lists (unlimited depth), mixed types | M1 | `Tab` / `Shift-Tab` | — |
| F-404 | Enter on empty item exits/lifts; Backspace at item start lifts; Backspace at the start of a block right after a list joins it to the end of the last item (an empty block is deleted) | M1 | — | — |
| F-405 | Toggle / convert between bullet and ordered | M1 | — | — |
| F-406 | Task list (checkbox items) | M2 | `Mod-Shift-9` | `[ ] `, `[x] ` |
| F-407 | List style type (roman, alpha, ...) | M3 | — | — |

## 6. Tables (`F-5xx`) — based on `prosemirror-tables`

| ID | Feature | M |
|---|---|---|
| F-501 | Insert table (rows × cols, optional header row) | M2 |
| F-502 | Add row before/after, add column before/after | M2 |
| F-503 | Delete row / column / table | M2 |
| F-504 | Merge cells / split cell | M2 |
| F-505 | Toggle header row / header column | M2 |
| F-506 | Cell selection, `Tab`/`Shift-Tab` navigation (Tab in last cell adds a row) | M2 |
| F-507 | Column resize by dragging | M2 |
| F-508 | Cell background color | M3 |
| F-509 | Paste tables from Excel / Google Sheets | M3 |

## 7. Images (`F-6xx`)

| ID | Feature | M | Notes |
|---|---|---|---|
| F-601 | Inline `image` node (`src`, `alt`, `title`, `width`, `height`) | M2 | For images inside text |
| F-602 | Block `figure` node: image + optional caption (`<figure>`/`<figcaption>`) | M2 | Caption is plain text |
| F-603 | Paste image from clipboard → inline `image` as base64 data URL | M2 | |
| F-604 | Drop image file → inline `image` as base64 data URL | M2 | |
| F-605 | Image picker: local file (→ base64) or remote URL, with `alt`, `title`, caption → inserts a `figure` | M2 | Core command + UI dialog (F-806) |
| F-606 | Edit image/figure properties (`alt`, `title`, caption, size) | M2 | |
| F-607 | Resize with handles (keeps aspect ratio), for both nodes | M2 | |
| F-608 | Max inline size option (default 5 MB), reject larger with an event | M2 | `image.maxInlineBytes` |
| F-609 | Upload callback `image.upload(file) => Promise<url>` instead of base64 | M3 | Option name reserved now |
| F-610 | Figure alignment (left/center/right) | M3 | Output format to be decided by ADR |
| F-611 | Rich-text captions (marks inside `figcaption`) | M3 | |

## 8. Paste & clipboard (`F-7xx`)

| ID | Feature | M |
|---|---|---|
| F-701 | Paste HTML is sanitized and parsed via schema rules | M1 |
| F-702 | Paste plain text: lines → paragraphs | M1 |
| F-703 | Paste cleanup for Microsoft Word | M2 |
| F-704 | Paste cleanup for Google Docs | M2 |
| F-705 | "Paste as plain text" (`Mod-Shift-v`) | M2 |
| F-706 | Copy produces canonical HTML + plain text | M1 |

## 9. Default UI (`F-8xx`) — optional module `stilo-editor/ui`

| ID | Feature | M |
|---|---|---|
| F-801 | Toolbar, configurable item list and groups, active/disabled states | M1 |
| F-802 | Heading/paragraph dropdown | M1 |
| F-803 | Link dialog (popover), opened by the toolbar button or `Mod-k` | M1 |
| F-804 | Font family / size dropdowns, color pickers | M2 |
| F-805 | Table menu (insert grid picker + operations) | M2 |
| F-806 | Image dialog: local file / remote URL, preview, `alt`, `title`, caption | M2 |
| F-807 | Bubble menu on text selection | M2 |
| F-808 | i18n: English and Italian, pluggable dictionaries | M2 |
| F-809 | Light/dark theme via CSS custom properties | M2 |
| F-810 | Fullscreen mode | M2 |
| F-811 | Slash command menu (`/`) | M3 |
| F-812 | Block drag handle (BlockNote-like): drag a block or list item anywhere; a list item dropped outside its list gets wrapped in a new list of the same type, at the drop level | M3 |

## 10. Productivity tools (`F-9xx`)

| ID | Feature | M |
|---|---|---|
| F-901 | Word and character count (computed on demand / debounced) | M2 |
| F-902 | Find & replace (match case, whole word) | M2 |
| F-903 | HTML source view (edit and apply) | M2 |
| F-904 | Special characters picker | M3 |
| F-905 | Emoji picker | M3 |
| F-906 | Video / iframe embeds (allowlisted providers) | M3 |
| F-907 | Markdown export | M3 |
| F-908 | Print | M3 |

## 11. Collaboration & ecosystem (`F-10xx`)

| ID | Feature | M |
|---|---|---|
| F-1001 | Real-time collaboration with Yjs (`y-prosemirror`), remote cursors | M3 |
| F-1002 | React wrapper | M3 |
| F-1003 | Vue wrapper | M3 |
| F-1004 | Optional CSS-class output mode for style-based marks | M3 |

---

## 12. Non-functional requirements

### NFR-1 Performance (measured, not assumed)

ProseMirror's model is an immutable tree with structural sharing, and its view only updates the
DOM nodes that changed. The realistic risks for very large documents are:

1. **DOM size** — a physical limit of any `contenteditable` editor. Stilo does not virtualize
   the document; this limit is documented, not hidden.
2. **Our own code** — plugins that scan the whole document on every transaction, decorations
   recomputed from scratch, serialization on every keystroke.
3. **Base64 images** inflating both the model and the DOM.
4. **Large tables** (table plugin computations are per-table).

Therefore:

- **NFR-1.1 Benchmark suite from M1.** `bench/` contains document generators and Playwright
  benchmarks that run in a real browser (Chromium; Firefox and WebKit as informative).
- **NFR-1.2 Benchmark documents:**
  - `paragraphs-1k`, `paragraphs-10k`, `paragraphs-50k`: paragraphs with mixed marks and links,
    headings every 20 paragraphs;
  - `nested-list`: 2,000 items, depth up to 8, mixed bullet/ordered (M1);
  - `table-large`: 200 rows × 10 columns (M2);
  - `word-paste`: a large real-world HTML fixture pasted from Word (M2).
- **NFR-1.3 Metrics:**
  - *typing latency*: time to dispatch a single-character `insertText` transaction plus a forced
    layout (`document.body.offsetHeight`), median and p95 over 200 iterations at the start,
    middle and end of the document;
  - *load*: `setHTML()` time until the view is rendered;
  - *export*: `getHTML()` time;
  - *move block*: time of F-309 in the middle of the document;
  - *key to paint*: real key presses (one every 33 ms) in the middle of the document, Event
    Timing duration of `keydown` up to the next paint, median and p95 — informative (ADR 0003);
  - *memory*: JS heap after load (Chromium only).
- **NFR-1.4 Initial budgets (Chromium, reference machine).** These were the starting values;
  ADR 0003 calibrated them after the first measurement (50k paragraphs: typing p95 50 ms, move
  block 100 ms). The values in force live in `bench/budgets.ts`:

  | Metric | 10k paragraphs | 50k paragraphs |
  |---|---|---|
  | Typing latency p95 | < 16 ms | < 33 ms |
  | `setHTML` | < 1.5 s | < 6 s |
  | `getHTML` | < 300 ms | < 1.5 s |
  | Move block | < 16 ms | < 33 ms |

- **NFR-1.5 Regression rule.** A benchmark exceeding its budget fails `npm run bench`. Results are
  written to `bench/results/` (JSON) to compare runs.
- **NFR-1.6 Coding rules** (enforced in AGENTS.md and code review):
  - no full-document traversal (`doc.descendants`, `doc.nodesBetween(0, doc.content.size)`) in
    plugin `apply`/`update` paths unless the task explicitly allows it;
  - decorations are mapped incrementally (`DecorationSet.map`) and recomputed only on changed ranges;
  - `getHTML()` is never called internally per transaction; consumers are advised to debounce it;
  - expensive derived data (word count, search results) is computed on demand or debounced.

### NFR-2 Security

- All HTML input (setHTML, paste, drop, source view) goes through DOMPurify, then schema parsing.
- `href` allowed protocols: `http:`, `https:`, `mailto:`, `tel:`, relative URLs, `#fragment`.
- `img src` allowed: `http:`, `https:`, relative URLs, `data:image/(png|jpeg|gif|webp)`. No SVG
  data URLs.
- Style attributes are filtered to the CSS property allowlist (ARCHITECTURE §7.3).
- An XSS fixture suite (`tests/fixtures/xss/`) must produce output without scripts, event handlers
  or dangerous URLs.

### NFR-3 Browser support

Latest 2 major versions of Chrome, Edge, Firefox, Safari (desktop). Mobile Safari/Chrome:
best-effort in M2, tested in M3. E2E tests run on Chromium, Firefox and WebKit.

### NFR-4 Accessibility

- Editable area: `role="textbox"`, `aria-multiline="true"`, configurable `aria-label`.
- Toolbar: `role="toolbar"`, roving tabindex, arrow-key navigation, `aria-pressed` on toggles,
  `aria-label` from i18n, visible focus.
- All features reachable via keyboard.

### NFR-5 Output quality

- `getHTML()` output is canonical: `setHTML(getHTML(x))` then `getHTML()` yields the identical
  string (idempotence), tested for every extension.
- No classes or editor-internal attributes in content output (exceptions listed in ARCHITECTURE §7).

### NFR-6 Packaging

- ESM only, TypeScript declarations included, tree-shakable (`sideEffects` limited to CSS).
- The core can be imported in Node without crashing (no DOM access at module top level).
- Bundle size is reported by `npm run build`; budgets will be set by ADR after M1.
- **Headless-first**: the core (`stilo-editor`) never imports the UI (`stilo-editor/ui`). Using
  only the core, with a custom UI, is a first-class scenario. The default UI uses only the public
  core API. Enforced by an architecture test (ARCHITECTURE §2.2).

### NFR-7 Quality gates

- `npm run check` (typecheck + lint + unit tests) must pass on every commit to `main`.
- Every extension ships with unit tests: schema parse/serialize, commands, round-trip idempotence.
- Public API has JSDoc comments.

---

## 13. Roadmap

| Milestone | Content | Status |
|---|---|---|
| **M0 — Foundations** | Docs, scaffolding, config, core contracts (`Editor`, extension API, HTML pipeline skeleton, test helpers), first reference extension (`Bold`) | Done |
| **M1 — MVP** | F-001…F-012, F-101…F-103, F-201…F-206, F-212, F-301…F-305, F-309, F-401…F-405, F-701, F-702, F-706, F-801…F-803, NFR-1 harness, demo page | In progress |
| **M2 — v1.0** | Remaining M2 features; first npm release `1.0.0` | Planned |
| **M3 — Later** | Collaboration, wrappers, advanced UI, embeds | Planned |
