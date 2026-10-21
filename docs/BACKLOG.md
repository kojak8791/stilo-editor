# Backlog

The history of the work done and the plan of the next tasks, derived from `docs/SPEC.md` §14
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
| T-041 | Markdown input rules that change the block type (`# `…`###### `) keep the alignment and the line spacing of the paragraph, as the toolbar and the shortcuts already do | F-302, F-308, F-312 | done |
| T-042 | Images, first part: inline `image` node, paste of an image file (Ctrl+V) as a base64 data URL with a size limit (`maxInlineBytes`, `imageRejected` event), resize with two side handles keeping the aspect ratio | F-601, F-603, F-607, F-608 | done |
| T-043 | Find and replace (match case, whole word) together with the word and character count: `Search` extension on `SearchQuery` of `prosemirror-search` with an incremental highlight plugin capped at 1,000 matches (ADR 0004), find bar under the toolbar (`Mod-f`), status bar with the count (debounced, ADR 0003) | F-901, F-902 | done |
| T-044 | Code block (plain, `language` attribute): `codeBlock` node, `setCodeBlock`/`unsetCodeBlock`/`toggleCodeBlock` (selected paragraphs join into one block, a line each, and split back), `Mod-Alt-c`, ```` ``` ```` input rule with an optional language, `Enter` on an empty last line leaves the block; its own toolbar button next to Quote (two separate buttons for inline code and code block, not one control) | F-306 | done |
| T-045 | Tables with `prosemirror-tables`: insert (grid picker), add and delete rows and columns, merge and split cells, header row and column, `Tab` navigation, column resize; first the ADR on the column width output (ADR 0005: `data-colwidth` and `<colgroup>`); table commands in one step; toolbar button: insert grid outside a table, operations menu inside | F-501…F-507, F-805 | done |
| T-046 | Task list: `taskList` / `taskItem` nodes (`<ul data-type="taskList">`, `<li data-checked>`), `toggleTaskList` (`Mod-Shift-9`, converts to and from the other lists in one step), `[ ] ` / `[x] ` input rules, checkbox in a node view, `toggleTaskChecked` (`Mod-Enter`, one step for any number of items), checked items struck through and muted, a CSS box for content shown outside the editor; toolbar button after Numbered list | F-406 | done |
| T-047 | Paste cleanup for Microsoft Word and Google Docs (Google Docs puts `font-family`, `font-size` and `color` on every span; `<ul><li><h2>` parses badly), "Paste as plain text"; pasted tables keep the column widths they carry (`<col width>`, `width` on the cells, `style="width"`) as `colwidth`, so they get their `<colgroup>` (ADR 0005); tables without widths stay fluid; Word cleanup built on fixtures of its clipboard format, not verified with Word | F-703, F-704, F-705 | done |
| T-048 | Text case: `setTextCase` (UPPERCASE, lowercase, Title Case, Sentence case, tOGGLE cASE) changes the characters in one step, marks kept; a menu of actions (`ALargeSmall` icon) after Clear formatting; no shortcut | F-213 | done |
| T-049 | Table handles: on the row and the column under the mouse and of the cell with the cursor, a handle opens the row / column menu; a corner menu over the table (merge, split, delete table); a layer over the editor, positioned with Floating UI (top-level blocks clip what overflows them) | F-805 | done |
| T-050 | Bulk changes slowed by `tableEditing`: its fix of the changed tables (`changedDescendants` of prosemirror-tables) does not advance its index in the old document when a block differs, so a change to every block costs quadratic time (5.8 s in jsdom for 50k paragraphs, also without tables). Wrap the plugin so it looks for tables to fix only when the changed part of the document holds one (5.8 s → 2 ms); a test that changed tables are still fixed; measure in Chrome a change to every block (text case, replace all); report the bug upstream | NFR-1 | done |
| T-051 | Benchmark page `/bench/`, separate from the demo: a panel of bulk operations (load the benchmark documents, select all, text case, typing, block moves, undo, search and replace all) beside the full editor, each timed in phases (command, state, view, events, layout, the frame of the toolbar refresh, paint); `window.__stilo` moves there and `npm run bench` uses it | NFR-1 | done |
| T-052 | ARCHITECTURE §7 back to the HTML contract: command, key and node-view details move out (they are in API.md, README and the code), the design notes stay short; new §6.4 node views and §6.5 changes to many nodes; the bulk-change measurements move to PERFORMANCE.md; fixes (§2 order, §8.1, decision log). Second pass: the header says how the documents divide the work; §5 explains the `Editor` design instead of repeating API.md §2 (the precise `isActive` / `getAttributes` / `select` semantics move there); §4.2 keeps only the rules that come from the architecture; §6.2 and §6.3 point to API.md; §10 summarizes the test layers, the how-to moves to `docs/guides/testing.md`. UI.md rewritten as the design of the default UI: no copied interfaces, markup, i18n table, pixel layout or task IDs (the code is the reference); `content.css` described in ARCHITECTURE §7.6; its "Later" list moved to the notes below | — | done |
| T-053 | Public site on GitHub Pages (`site/`, `npm run site`): Home (hero, live editor with its HTML beside it, why, features, usage), Performance (generated documents of 1,000 to 20,000 paragraphs, load and export timed in the visitor's browser), Paste (clipboard HTML beside the HTML the editor keeps), Headless (an editor with a few extensions and a toolbar of plain buttons, its code shown beside it); self-hosted fonts; the pages play the host and theme the editor only through its custom properties; `.github/workflows/pages.yml` builds and publishes it at every push to main | — | done |
| T-054 | `setHTML` / `setJSON` slow when the document selection is inside the editor (10k paragraphs: DOM update 0.26 s → 2.9 s in Chrome, growing faster than the document): clear the DOM selection before replacing the document; measure other large changes (replace all) for the same effect | NFR-1 | done |
| T-055 | Release `stilo-editor@0.2.0`: version, the README anchor links on the npm page (they do not work there), `npm pack` check in a clean Vite app, tag `v0.2.0` and GitHub release notes | NFR-6 | done |

## Release 0.2.1 — documentation

A first contact that says in a few seconds what Stilo is: the npm page shows the README of the
published package, so the new README needs a release. No code changes.

| Task | Content | Spec | Status |
|---|---|---|---|
| T-056 | Documentation: shorter README (claim, quick start first, compact feature list, why Stilo), the full feature list in `docs/FEATURES.md` with screenshots, `CHANGELOG.md` (back to 0.1.0), `AGENTS.md` and `CONTRIBUTING.md` point to `docs/FEATURES.md`, `package.json` description and homepage (the live demo) | — | done |
| T-057 | CI on GitHub Actions: `npm run check` and `npm run size` at every push and pull request, status badge in the README | — | done |
| T-058 | Release `stilo-editor@0.2.1`: version, `npm pack` check in a clean Vite app, tag `v0.2.1`, GitHub releases (also for `v0.1.0` and `v0.2.0`) from the changelog | NFR-6 | done |

## Release 0.3.0 — framework wrappers

Most apps embed an editor in a framework component, so the React, Vue and Svelte wrappers come
before the remaining M2 features and before collaboration.

| Task | Content | Spec | Status |
|---|---|---|---|
| T-059 | Toolbar refresh on large selections: after select all, the refresh of the toolbar (the `isActive` / `isEnabled` check of every button over the selection, in one frame) takes 2.0 s at 10k paragraphs and 11.1 s at 50k (headless Chromium, frame phase of `/bench/`), so the selection shows late; checks that do not grow with the selection, also the `isEnabled` checks that are O(n) at the top level (`insertBlock` runs `canReplaceWith` on the document content); frame and per-keystroke cost measured on `/bench/` before and after | NFR-1 | done |
| T-060 | Framework wrappers, first part: the ADR on their shape (separate packages in an npm workspace or subpath exports of `stilo-editor`, the framework as a peer dependency, server-side rendering, how the editor, its events and the default UI reach the component), then the React wrapper, its tests and its documentation (API.md, README). ADR 0006: subpath `stilo-editor/react`, `react` `^18 \|\| ^19` as an optional peer dependency, `StiloEditor` (default UI) and `useStiloEditor` (headless), content not controlled; React demo page `/demo/react/` | F-1002 | done |
| T-061 | Vue wrapper, on the shape of the T-060 ADR: tests, documentation. ADR 0006 (Vue): subpath `stilo-editor/vue`, `vue` `^3.3` as an optional peer dependency, render functions (no single-file components), `StiloEditor` with emitted events and `useStiloEditor` returning `{ element, editor }`; Vue demo page `/demo/vue/` | F-1003 | done |
| T-062 | Svelte wrapper, on the shape of the T-060 ADR: tests, documentation. ADR 0006 (Svelte): `svelte` `^4 \|\| ^5` as an optional peer dependency; `stilo-editor/svelte` (Svelte 5) with the `StiloEditor` component written with runes, shipped as a `.svelte` source, with callback props and `bind:editor`; `stilo-editor/svelte/action` (Svelte 4 and 5) with the actions `stiloEditorWithUI` and `stiloEditor`; Svelte demo page `/demo/svelte/` | F-1005 | done |
| T-067 | Framework guides: one document per framework (`docs/frameworks/react.md`, `vue.md`, `svelte.md`), linked from the README, complete for its user with every code example in the idiom of the framework: install, styles, component, props and events, reading and loading the content, read-only, server-side rendering, toolbar items, custom buttons, languages, a UI of your own with the primitive and the button states, extensions, TypeScript. The reference tables (commands, extensions and their options, toolbar item IDs, events, CSS custom properties) stay once in API.md and are linked; API.md §7–§9 move into the guides; API.md stays the reference of the core and the guide of the vanilla UI. AGENTS.md: a change of the public API updates every guide, even where the text repeats | — | done |
| T-068 | Read-only that holds: with `editable: false` the commands still applied (`toggleBold()` returned `true` and changed the HTML), so the default toolbar edited a read-only editor. In a read-only editor a command that would change the content or the stored marks does nothing and returns `false`, also from `.can()`; selection and search commands keep working, `setHTML` / `setJSON` still replace the content. `setEditable` emits `transaction`, so the toolbar, the find bar and the UIs of the apps follow it; the default toolbar items are disabled in read-only without running their checks, except find | F-005 | done |
| T-069 | React wrapper and the Next.js App Router: the build of `stilo-editor/react` starts with the `'use client'` directive, so the component and the hook can be imported from a Server Component without a wrapper file of the app; added by the build (`output.banner` in `vite.config.ts`), since Rolldown warns that it may not preserve a directive in the sources | F-1002 | done |
| T-070 | Default spacing of the editable area: without styles of the app the text touched the toolbar and an empty editor had no height (found in the Next.js check before the release). `content.css` gives `.stilo-content.ProseMirror` `padding: 12px 16px` and `min-height: 6em` inside `:where()`, so any rule of the app replaces them; no border, the focus outline of the browser; content shown outside the editor unchanged | — | done |
| T-063 | Release `stilo-editor@0.3.0` and the wrappers: version 0.3.0, changelog, download sizes, `npm pack` check in clean Vite apps (vanilla, React 19 and 18, Vue 3.5, 3.4 and 3.3, Svelte 5 with the component and 4 with the actions: `tsc` with `skipLibCheck: false`, build, Chromium), tags, GitHub release from the changelog. On Vue 3.3 the types of `stilo-editor/vue` do not compile (`DefineSetupFnComponent` exists from Vue 3.4): the peer dependency is `vue` `^3.4` | NFR-6 | done |

## M2 — v1.0 (after 0.3.0)

| Task | Content | Spec | Status |
|---|---|---|---|
| T-064 | Images, second part: block `figure` with a plain-text caption, drop of image files as a data URL (the same size limit as paste), an insert dialog (local file or remote URL, preview, `alt`, `title`, caption) that inserts a `figure`, editing the properties of an image or a figure, resize of both nodes keeping the aspect ratio | F-602, F-604…F-607, F-806 | todo |
| T-065 | Bubble menu on a text selection: its content and how it relates to the toolbar decided at the start | F-807 | todo |
| T-066 | Fullscreen mode and dark theme: a dark set of the `--stilo-*` custom properties; the gap cursor line of `content.css` (`.ProseMirror-gapcursor:after`, a fixed `black` today) takes a color that follows the theme | F-809, F-810 | todo |
| T-071 | Markdown shortcuts can be turned off: the editor option `markdownShortcuts` (default `true`; also a prop of the React, Vue and Svelte components) leaves out the input rules plugin and its `Backspace` undo, so `#`, `>`, `*`, ... are typed as text. Set when the editor is created; not per extension. Cost when on, measured before deciding the default: 1–7 µs per keystroke (Node, 10k paragraphs; the paragraph text before the cursor, at most 500 characters, against each rule), under 1% of inserting the character. Demo: `?nomarkdown` | F-013 | done |
| T-072 | Compact toolbar (optional) for narrow editors, items on two levels, built from the same item configuration as the toolbar; designed together with the bubble menu (T-065) and done right after it | F-813 | todo |

## Notes for later milestones

- Find and format: apply a mark (bold, italic, highlight, color, ...) to every match of the
  search, like "Replace with format" of word processors; possibly also remove it. One step, a
  top-level block at a time, as `replaceAll` (ADR 0004). To decide: which formats, where the
  command goes in the find bar.
- After 0.1.0: a chaining API that runs several commands in one transaction (one `input`
  event).
- npm trusted publishing (OIDC) with provenance instead of publishing by hand.
- Performance (ADR 0003): per-keystroke cost of the link bubble. Measure with `npm run bench`
  before and after.
- Toolbar icons: our own SVG set, drawn for the toolbar (possibly starting from
  single icons of public sets, keeping their license notices), replacing `lucide`; bold and
  strike first. Changing or dropping the `lucide` dependency needs an ADR.
- Sticky toolbar shadow when the editor content scrolls in its own container (`?fixed`): a
  pure-CSS candidate is a scroll-driven animation on a named scroll timeline of the content,
  shared with the toolbar through `timeline-scope`; it needs a common ancestor and a unique
  name per editor. To evaluate.
- Default UI: a Floating UI tooltip with an arrow and a light animation in place of the native
  `title` (ADR 0002).
- Default UI: `setEditable` emits no event, so the toolbar does not reflect read-only mode until
  `toolbar.update()` is called; handle it when the core gets an event.
- Link popover: insert a new linked text at a cursor outside a link (the button is disabled
  there today); export `createLinkPopover` for custom toolbars.
