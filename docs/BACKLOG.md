# Backlog

The history of the work done and the plan of the next tasks, derived from `docs/SPEC.md` §13
(roadmap). A task is one branch (`task/T-NNN-short-title`); its record is the commit history,
and its decisions live in `docs/` (ARCHITECTURE, UI, ADRs). This is a plan, not a contract: rows
may be split or merged when a task starts.

## M0 — Foundations

| Task | Content | Spec | Status |
|---|---|---|---|
| T-001 | CSS style helpers | NFR-2, §7.3 | done |
| T-002 | HTML sanitizer | NFR-2, F-010 | done |
| T-003 | Core runtime: event emitter, extension manager, `Editor`, HTML parse/serialize, helpers; `Document`, `Text`, `Paragraph` | F-001…F-009 | done |
| T-004 | Test helpers (`createTestEditor`, selection markers), `Bold` reference extension, `StarterKit` skeleton | F-201, F-301 | done |

## M1 — MVP

| Task | Content | Spec | Status |
|---|---|---|---|
| T-005 | Marks: `Italic`, `Underline`, `Strike`, `Code` | F-202…F-205 | done |
| T-006 | Blocks: `Heading`, `Blockquote`, `HorizontalRule`, `HardBreak` | F-302…F-305 | done |
| T-007 | Lists: `BulletList`, `OrderedList`, `ListItem` | F-401…F-405 | done |
| T-008 | `Link` | F-206 | done |
| T-009 | `History`, `ClearFormatting` | F-101…F-103, F-212 | done |
| T-010 | `MoveBlock` | F-309 | done |
| T-011 | `Placeholder`, `DropCursor`, `GapCursor` | F-011, F-012 | done |
| T-012 | Clipboard: paste HTML and plain text, canonical copy | F-701, F-702, F-706 | done |
| T-013 | Default UI: toolbar, `lucide` icons, i18n (`en`, `it`), `ui.css`, import-rules test (design: `docs/UI.md`) | F-801, NFR-4 | done |
| T-014 | Default UI: popover component (Floating UI, ADR 0002) and heading dropdown | F-802 | done |
| T-015 | `content.css` (ProseMirror and gap cursor base CSS, lists, blockquote, placeholder rule `.stilo-placeholder::before` showing `attr(data-placeholder)`, hidden when not editable); fix `insertBlock` throwing on a document-level selection; remove the toolbar `try/catch` around `isEnabled` | NFR-5 | done |
| T-016 | Default UI: link popover, also bound to `Mod-k` (the headless `Link` has no shortcut), link bubble, popovers positioned `absolute` (ADR 0002), `Editor.getAttributes` | F-803 | done |
| T-017 | Demo benchmark mode (`/demo/?bench`) and NFR-1 harness; `content-visibility` and calibrated budgets (ADR 0003) | NFR-1 | done |
| T-018 | Documentation cleanup: the local-model experiment is closed; task files and template removed, `BACKLOG.md` moved to `docs/`, `AGENTS.md` rewritten for any contributor, README "How it is built" | — | done |
| T-019 | `docs/PERFORMANCE.md` (performance in practice, measurement method, numbers, limits); README performance in plain language | NFR-1 | done |
| T-020 | Lists: Backspace at the start of an empty paragraph after a list deletes it and puts the cursor at the end of the last item (today it becomes an empty item again); check a non-empty paragraph too | F-401, F-402 | done |
| T-021 | Toolbar placement: sticky when the editor flows in the page, static when the editor scrolls inside its own container | F-801 | done |
| T-022 | Tree-shaking: unused extensions stay in the consumer bundle because `defineExtension({...})` runs at module top level without `/* @__PURE__ */`; fix it and add a bundle-size check (core + StarterKit + UI is about 97 KB gzip today, mostly ProseMirror and DOMPurify) | NFR-6 | done |

## M2 — v1.0

| Task | Content | Spec | Status |
|---|---|---|---|
| T-023 | `Subscript`, `Superscript` (mutually exclusive), in `StarterKit` and in the default toolbar | F-207 | done |
| T-024 | Special characters and emoji picker: toolbar button, popover with two tabs and categories, search by name, our own curated data loaded on first open (F-904, F-905 moved up from M3) | F-904, F-905 | done |
| T-025 | `TextStyle` (mark `textStyle`, `color` only for now) and `Highlight` (`<mark>`, optional background color): parse, serialize, commands, `Mod-Shift-h`, `==text==`, in `StarterKit` | F-208, F-209 | done |
| T-026 | Default UI: text color and highlight split buttons (the main part applies the last used color, the arrow opens a popover with "no color", a fixed palette replaceable with `textColorButton(palette)` and `highlightButton(palette)`, and a custom color) | F-804 | done |
| T-027 | Toolbar restyle, first part: custom property defaults in one `:where(:root)` block of `ui.css` (no fallbacks), toolbar padding x/y, item gap and group gap split, 30px buttons, 2px gaps; borderless look (only the outer editor border), light toolbar background, short group separators, toolbar corners following the host radius, shadow on the stuck toolbar in pure CSS | F-801, F-809 | done |
| T-028 | README "Features" table for users (feature, keyboard shortcut, Markdown shortcut, notes on popovers; keyboard and accessibility summary); `AGENTS.md` definition of done keeps it in sync | — | done |
| T-029 | Logo: bicolor nib symbol (`assets/`, light and dark, adaptive favicon in the demo) and the `st\|lo` wordmark with a blinking caret, in the README header (`<picture>` for light and dark) | — | done |

## Preview release 0.1.0

Before the remaining M2 features: Stilo goes on npm as `0.x` previews, without announcements;
`1.0.0` stays the end of M2. Every later M2 feature block ships as a new `0.x`.

| Task | Content | Spec | Status |
|---|---|---|---|
| T-030 | API names before the first release: naming conventions (ARCHITECTURE §4.1), `StarterKit` → `defaultExtensions`, events `input` / `selectionchange`, `commands.<name>.can()`, selection commands `select` / `selectNode` / `selectAll`; constructor options object kept | F-006, F-007 | done |
| T-031 | Package: `package.json` metadata (`repository`, `homepage`, `bugs`, version `0.1.0`); `npm pack` and install in a clean Vite app: exports, types, CSS, tree-shaking | NFR-6 | done |
| T-032 | First E2E tests (Playwright, Chromium, Firefox and WebKit): typing, marks, link popover with `Mod-k`, paste, undo; Safari on macOS is checked by hand | — | done |
| T-035 | Drag and drop of whole blocks is a move of blocks (ARCHITECTURE §8.2): no empty paragraph (or list item, blockquote) left behind; dropped inside text the target is split (a list item gets a new item) | F-012 | done |
| T-033 | Release documents: README (warning, Usage with `npm install` and the CSS import, "Support" section: where to open issues and ask questions, no promised response time), `SECURITY.md` (private vulnerability reports through GitHub, public advisory with the fix), `CONTRIBUTING.md` (repeating the rule that keeps the README Features table in sync), issue templates (steps to reproduce, version, browser), first `docs/API.md` (editor options, commands, events, UI options; linked right below the Usage example; `ARCHITECTURE.md` stays the contributors' reference) | — | done |
| T-034 | First public release: `stilo-editor@0.1.0` on npm, tag `v0.1.0` and GitHub release | NFR-6 | done |

## M2 — v1.0 (continued)

| Task | Content | Spec | Status |
|---|---|---|---|
| T-038 | Font family and font size: `textStyle` attributes `fontFamily` and `fontSize` (also from `<font face size>`, nested spans keep the outer values), commands that change one style and keep the others, `stepFontSize` from the rendered size; toolbar: font dropdown (each font drawn in its font, fonts outside the list shown) and font size control (− field +, list, typed sizes; unit pt, px or rem) | F-210, F-211, F-804 | done |
| T-039 | Text alignment (left, center, right, justify) on paragraphs and headings: `textAlign` attribute, `setTextAlign`, `Mod-Shift-l/e/r/j`, alignment kept when the block type changes, toolbar icon menu (the four alignments in a row) | F-308 | done |
| T-040 | Line spacing on paragraphs and headings (`line-height`, values 1, 1.15, 1.5, 2), toolbar menu next to the alignment | F-312 | done |
| T-041 | Markdown input rules that change the block type (`# `…`###### `) keep the alignment and the line spacing of the paragraph, as the toolbar and the shortcuts already do | F-302, F-308, F-312 | planned |

## Notes for later milestones

- README on the npm page: links to anchors of the README itself (`#large-documents`) do not
  work there (they do on GitHub); links to `docs/` do. Fix with the next `0.1.x` that is
  published for other reasons.
- After 0.1.0: a chaining API that runs several commands in one transaction (one `input`
  event).
- After 0.1.0: CI on GitHub Actions running `npm run check` on every push, and npm trusted
  publishing (OIDC) with provenance instead of publishing by hand.
- Performance (ADR 0003): toolbar `isEnabled` checks that are O(n) at the top level (e.g.
  `insertBlock` runs `canReplaceWith` on the document content); per-keystroke cost of the toolbar
  refresh and of the link bubble. Measure with `npm run bench` before and after.
- Toolbar icons: our own SVG set, drawn for the toolbar (possibly starting from
  single icons of public sets, keeping their license notices), replacing `lucide`; bold and
  strike first. Changing or dropping the `lucide` dependency needs an ADR.
- Sticky toolbar shadow when the editor content scrolls in its own container (`?fixed`): a
  pure-CSS candidate is a scroll-driven animation on a named scroll timeline of the content,
  shared with the toolbar through `timeline-scope`; it needs a common ancestor and a unique
  name per editor. To evaluate.
- F-809 (themes): the gap cursor line in `content.css` (`.ProseMirror-gapcursor:after`) has a
  fixed `black` color, invisible on a dark theme; use `currentColor` or a `--stilo-*` property.
