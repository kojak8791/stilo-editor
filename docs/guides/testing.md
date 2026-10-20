# Writing tests

How to write the tests of an extension or a fix. What every extension must test is in
[AGENTS.md](../../AGENTS.md) §5; the test layers are in [ARCHITECTURE.md](../ARCHITECTURE.md) §10.

## Unit tests (Vitest + jsdom)

Tests are colocated (`src/extensions/<name>/<name>.test.ts`) and use `tests/helpers`:

- `createTestEditor({ extensions?, html? })`: an `Editor` with `defaultExtensions()` unless
  `extensions` is given.
- Selection markers in `html`: `|` is the cursor, `[` … `]` a range. Test content must not
  contain these characters as text.
- `getHTMLWithSelection(editor)`: the canonical HTML with the markers put back. `|` carries the
  marks the next typed character would get (`<strong>b|</strong>`: typing continues in bold);
  `[` and `]` hug the selected text.
- `typeText(editor, text)`: types character by character, running input rules.
- `pressKey(editor, 'Mod-b')`: sends a key combination to the keymaps (`Mod` = `Ctrl`). Write
  the combination exactly as in the keymap (`'Mod-Shift-s'`, lowercase letter): the synthetic
  event has no `keyCode`, the fallback browsers use for `Shift` / Caps Lock variants.
- `render(node)` (`tests/helpers/react.ts`, for the React wrapper): renders a React element
  with `createRoot` inside `act`, so its effects have run; returns `container`, `rerender` and
  `unmount`.
- `mount(render)` (`tests/helpers/vue.ts`, for the Vue wrapper): mounts an app that renders
  `render()` and waits a tick, so the editor exists; returns `container` and `unmount`.

jsdom has no layout and loads no CSS: positions, visibility and styles are checked in the demo
or in E2E tests.

## E2E tests (Playwright)

`tests/e2e/*.spec.ts` run against the demo page in Chromium, Firefox and WebKit
(`playwright.config.ts`, Vite dev server on port 5180). Three rules keep them faithful to real
input:

- **Type through the spec's `type()` helper**, which waits for a rendered frame before each key.
  A real key press makes the browser render; Playwright's synthetic keys do not, and without a
  frame Chromium keeps a new block skipped by `content-visibility` (ADR 0003) and puts the caret
  before the first character typed into it. Real Chrome is not affected. The same holds for any
  script that drives the demo: a failure seen only with fast synthetic keys is rerun at a human
  pace before it is called an editor bug.
- **Paste with a `paste` event that carries its own `DataTransfer`**, never the system
  clipboard: it is shared by the parallel workers and by the developer.
- **Drag with the real mouse from the middle of the selected text.** Playwright's WebKit on
  Windows resolves every point of a text to offset 0 during a drop, so drops inside text are
  skipped there (Safari is checked by hand); drops between blocks run everywhere.

## Security

The payloads in `tests/fixtures/xss/vectors.ts` run through the sanitizer
(`sanitize.test.ts`) and a paste (`clipboard.test.ts`); the output must be clean. `setHTML`
uses the same sanitizer.
