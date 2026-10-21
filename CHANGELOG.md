# Changelog

All notable changes to `stilo-editor`. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org): until `1.0.0`, a minor version may change the API.

## [Unreleased]

### Added

- Editor option `markdownShortcuts` (default `true`): `false` turns the Markdown shortcuts off,
  so `#`, `>`, `*` and the other Markdown characters are typed as text. Also a prop of the
  React, Vue and Svelte components.
- Dark theme: every color of the toolbar, of the popovers and of `content.css` has a dark value,
  used when the page sets `color-scheme: dark` (or `light dark` to follow the system). Without
  `color-scheme` nothing changes. The gap cursor takes the color of the text.
- Toolbar item `fullscreen`, last in the default toolbar: the element that holds the toolbar
  and the editor fills the browser window; <kbd>Esc</kbd> in the editor leaves it, and the page
  scrolls back where it was. `ToolbarContext` gains `toggleFullscreen()` and `isFullscreen()`,
  and `isActive` of a custom button receives the context as second argument.

## [0.3.1] - 2026-10-20

### Changed

- The package keywords name React, Vue, Svelte and Next.js, so that npm search finds the
  wrappers. No change in the code.

## [0.3.0] - 2026-10-20

### Added

- React wrapper, `stilo-editor/react`: the `StiloEditor` component with the default toolbar
  and the `useStiloEditor` hook for a UI of your own. React 18 and 19, server-side rendering,
  marked `'use client'` for React Server Components (Next.js App Router).
- Vue wrapper, `stilo-editor/vue`: the `StiloEditor` component with the default toolbar and the
  `useStiloEditor` composable for a UI of your own. Vue 3.4 and later, server-side rendering.
- Svelte wrapper, `stilo-editor/svelte`: the `StiloEditor` component for Svelte 5, with
  `bind:editor`, and the actions `stiloEditorWithUI` (default toolbar) and `stiloEditor` (a UI of
  your own) for Svelte 4 and 5, also from `stilo-editor/svelte/action`. Server-side rendering.
- A guide for each framework, React, Vue and Svelte (`docs/frameworks/`): every task with code in
  the idiom of the framework, from install to a UI of your own.

### Changed

- The editable area has a small default padding (`12px 16px`) and height (`min-height: 6em`),
  so an editor without styles of your own no longer has its text against the toolbar. Any rule
  of yours replaces them; if you put the padding on the container instead, set
  `.stilo-content { padding: 0 }`.

### Fixed

- A read-only editor (`editable: false`) can no longer be changed through the toolbar or the
  commands: a command that would change the content returns `false`, also from `.can()`, and
  the toolbar disables its buttons, except find. `setEditable` now emits `transaction`, so
  the toolbar and your own buttons follow the switch.
- After *select all* in a large document the toolbar refreshes about 10 times faster, so the
  selection shows sooner (50,000 paragraphs: 11 s → 1 s).

## [0.2.1] - 2026-10-16

Documentation release: no code changes.

### Changed

- Shorter README, quick start first. The full list of features, shortcuts and Markdown
  shortcuts moves to [docs/FEATURES.md](docs/FEATURES.md).
- New: this changelog.
- The npm page links to the live demo as the homepage.

## [0.2.0] - 2026-10-15

Second preview release. No breaking changes: with `defaultExtensions()` the new features are on
as soon as you update.

### Added

- **Tables**: insert from a grid, merge and split cells, header row and column, resizable
  columns, handles on rows and columns that select them and open their menu.
- **Images**: paste an image or a screenshot (embedded in the HTML, up to 5 MB by default),
  resize with side handles.
- **Checklists**, with the `[ ] ` and `[x] ` Markdown shortcuts.
- **Code blocks**, with an optional language (`class="language-js"`).
- **Find and replace**, with match case, whole word and an exact count of the matches.
- **Word and character count**: `getWordCount()` and an optional status bar
  (`createStatusBar`).
- **Font family and font size** in the toolbar.
- **Text alignment** and **line spacing** of paragraphs and headings.
- **Text case**: UPPERCASE, lowercase, Title Case, Sentence case, tOGGLE cASE.
- **Paste from Word and Google Docs**: real lists, column widths of tables kept, the body
  font, size and color dropped.

### Changed

- `defaultExtensions()` includes the new extensions. Each one can be turned off with
  `false`, e.g. `defaultExtensions({ table: false })`.
- New dependency: `prosemirror-search`.

### Fixed

- `setHTML` / `setJSON` were slow on large documents while the selection was inside the
  editor.
- Changes to every block of a large document (text case, replace all) took quadratic time.
- The `#` heading shortcuts dropped the alignment and the line spacing.

## [0.1.0] - 2026-10-13

First preview release.

### Added

- `Editor` with HTML and JSON in and out, a strict allowlist for tags, attributes and
  styles, undo and redo.
- Text: bold, italic, underline, strikethrough, inline code, subscript, superscript, text
  color, highlight, clear formatting.
- Links, with a popover and a bubble to open, edit or remove them.
- Blocks: paragraphs, headings 1–6, quotes, horizontal lines, line breaks, moving blocks up
  and down.
- Bulleted and numbered lists.
- Markdown shortcuts as you type, keyboard shortcuts for every command.
- Paste cleanup: pasted HTML is cleaned up, plain text lines become paragraphs.
- Default toolbar (`stilo-editor/ui`): sticky option, keyboard navigation, special
  characters and emoji picker.

[Unreleased]: https://github.com/kojak8791/stilo-editor/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/kojak8791/stilo-editor/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/kojak8791/stilo-editor/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/kojak8791/stilo-editor/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/kojak8791/stilo-editor/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kojak8791/stilo-editor/releases/tag/v0.1.0
