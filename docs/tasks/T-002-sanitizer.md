# T-002 — HTML sanitizer

| Field | Value |
|---|---|
| Status | `done` |
| Spec | NFR-2 |
| Milestone | M0 |
| Depends on | T-001 |
| Branch | `task/T-002-sanitizer` (already created, with the provided tests) |

## Goal

Implement every function in `src/core/html/sanitize.ts` so that all provided tests in
`src/core/html/sanitize.test.ts` pass.

## Context (read before starting)

- `AGENTS.md` (all of it)
- `src/core/html/sanitize.ts`: the file JSDoc and the JSDoc of each function are the specification
- `src/core/html/sanitize.test.ts`: the provided tests
- `src/core/html/css.ts`: read only the JSDoc of `sanitizeStyle` (you call it, you do not change it)

There is no extension in this task: you do not need `src/extensions/bold/`.

## Scope

Files to modify:

- `src/core/html/sanitize.ts` — replace each `notImplemented(...)` body, add the private helpers
  below, and remove the `notImplemented` import.

Do not touch:

- everything else, in particular `src/core/html/sanitize.test.ts`, `tests/fixtures/xss/vectors.ts`
  and `src/core/html/css.ts`.

## Contract

Keep **exactly** the existing exports of `sanitize.ts`: names, signatures, return types, and the
constants `ALLOWED_TAGS`, `ALLOWED_ATTR`, `LINK_PROTOCOLS`, `IMAGE_PROTOCOLS`, `IMAGE_DATA_URL`
(do not change their values). No new files, no new exports. Where the points below add detail to
the JSDoc, they win.

### Imports

```ts
import DOMPurify, { type DOMPurify as Purifier } from 'dompurify';
import { sanitizeStyle } from './css';
```

### `urlScheme`

1. Remove every character that matches `/\s/` or whose char code is below `0x20`. Do it by
   filtering characters (`[...url].filter(...)`): do **not** write control characters in a regex,
   Biome's `noControlCharactersInRegex` rejects them.
2. Match `/^([a-z][a-z0-9+.-]*):/i` on the result; return the group lowercased, else `null`.

### `isAllowedHref`

`urlScheme(url)` is `null` → `true`; otherwise `true` only if the scheme is in `LINK_PROTOCOLS`.

### `isAllowedImageSrc`

On `url.trim()`, in this order: empty → `false`; matches `IMAGE_DATA_URL` → `true`; `urlScheme`
is `null` → `true`; otherwise `true` only if the scheme is in `IMAGE_PROTOCOLS`.

### Private helpers (not exported)

- `const purifiers = new WeakMap<Window, Purifier>();` at module level. This is the **only**
  allowed module-level mutable value (it is the per-window cache required by the file JSDoc).
- `getPurifier(): Purifier` — returns the cached instance for the global `window`; if missing,
  creates it with `DOMPurify(window)`, adds the hook (once, at creation), stores and returns it.
- `filterAttribute(name: string, value: string): string | null` — one `switch (name)` with the
  cases of the file JSDoc (`style`, `class`, `href`, `src`, `target`) and `default: return value`.
- The hook: `purifier.addHook('uponSanitizeAttribute', (_node, data) => { ... })`, using
  `data.attrName`, `data.attrValue` and `data.keepAttr` as described in the file JSDoc.
- The config: `{ ALLOWED_TAGS: [...ALLOWED_TAGS], ALLOWED_ATTR: [...ALLOWED_ATTR],
  ALLOW_DATA_ATTR: false }`. The spreads are required: DOMPurify wants mutable arrays. Build it in
  one place (a helper function or a module-level `const`) and reuse it in both sanitize functions.

### `sanitizeToString` / `sanitizeToDOM`

- `sanitizeToString`: `getPurifier().sanitize(html, config)`.
- `sanitizeToDOM`: same, with `RETURN_DOM: true` added to the config. DOMPurify types the result
  as `Node`; it is the `<body>` element, so cast it with `as HTMLElement`.

## Tests

- Provided tests (do not modify): `src/core/html/sanitize.test.ts` (97 tests), which uses
  `tests/fixtures/xss/vectors.ts`.
- Tests to write: none.

## Acceptance criteria

- [ ] `npm run check` passes (typecheck + lint + unit tests), after `npm run format`.
- [ ] All 97 tests in `src/core/html/sanitize.test.ts` pass (219 tests in total).
- [ ] `git status` shows only `src/core/html/sanitize.ts` modified (plus this task file's
      `## Questions` / `## Report` sections).
- [ ] No `any`, `@ts-ignore`, `@ts-expect-error`, `biome-ignore`, DOM access at module top level,
      or module-level mutable values other than `purifiers`.
- [ ] No hook is added to the default `DOMPurify` export.
- [ ] Exports and constants of `sanitize.ts` unchanged.
- [ ] One commit on branch `task/T-002-sanitizer`: `feat(core): implement html sanitizer (T-002)`.

## Notes

- `LINK_PROTOCOLS.includes(scheme)` works directly: the constants are `readonly string[]`.
- DOMPurify already trims attribute values before the hook; still return `value.trim()` for
  `href`/`src` as the file JSDoc says.
- Run a single test file while working: `npx vitest run src/core/html/sanitize.test.ts`.

## Questions

No questions.

## Report

- **Files changed**: `src/core/html/sanitize.ts`
- **Summary**: Implemented every function in the sanitizer module:
  - `urlScheme`: strips whitespace/control characters via `[...url].filter(...)`, matches scheme regex.
  - `isAllowedHref`: delegates to `urlScheme`, accepts relative URLs and schemes in `LINK_PROTOCOLS`.
  - `isAllowedImageSrc`: trims input, checks empty → `IMAGE_DATA_URL` → scheme via `urlScheme` → `IMAGE_PROTOCOLS`.
  - `purifiers` WeakMap: per-window DOMPurify cache (module-level mutable value).
  - `getPurifier`: lazy-creates DOMPurify instance with the `uponSanitizeAttribute` hook, caches per window.
  - `filterAttribute`: switch on attribute name — style → `sanitizeStyle`, class → `language-*` tokens, href/src → protocol check, target → `_blank` only, default → unchanged.
  - `getConfig`: returns DOMPurify config with spread arrays for `ALLOWED_TAGS`/`ALLOWED_ATTR` and `ALLOW_DATA_ATTR: false`.
  - `sanitizeToString` / `sanitizeToDOM`: delegate to `getPurifier().sanitize(html, config)`, the latter with `RETURN_DOM: true`.
- **Acceptance**: `npm run check` passes (typecheck + lint + 219 tests, all 97 sanitize tests pass).
- **Reviewer notes**: The hook is added only to the per-window purifier instance, never to the default `DOMPurify` export. No new exports or files were added.
