# T-001 — CSS style helpers

| Field | Value |
|---|---|
| Status | `todo` |
| Spec | F-208, F-209, F-210, F-211, F-308 (groundwork) |
| Milestone | M1 |
| Depends on | — |
| Branch | `task/T-001-css-helpers` |

## Goal

Implement every function in `src/core/html/css.ts` so that all provided tests in
`src/core/html/css.test.ts` pass.

## Context (read before starting)

- `AGENTS.md` (all of it)
- `docs/ARCHITECTURE.md` §4 (conventions) and §7.3 (inline styles)
- `src/core/html/css.ts`: the JSDoc of each function is the specification
- `src/core/html/css.test.ts`: the provided tests

There is no extension in this task: you do not need `src/extensions/bold/`.

## Scope

Files to modify:

- `src/core/html/css.ts` — replace each `notImplemented(...)` body with a real implementation,
  and remove the `notImplemented` import when it is no longer used.

Do not touch:

- everything else, in particular `src/core/html/css.test.ts`, `src/core/errors.ts` and
  `vitest.config.ts`.

## Contract

Keep **exactly** the existing exports of `css.ts`: names, signatures, return types, and the
constants `STYLE_PROPERTIES`, `INPUT_ONLY_STYLE_PROPERTIES`, `CSS_WIDE_KEYWORDS`, `UNSAFE_VALUE`
(do not change their values). You may add private (non-exported) helper functions in the same
file. No new files, no new exports.

The JSDoc in `css.ts` is the specification. The points below remove every ambiguity; where they
add detail to the JSDoc, they win.

### `parseStyle`

- Remove every occurrence of `!important` from the value, then trim the value.
- Only the property is lowercased; the value keeps its case.

### `normalizeColor`

The input is trimmed and lowercased first. Then exactly these forms are accepted (`\s*` = any
spacing):

| Form | Grammar | Result |
|---|---|---|
| short hex | `#` + 3 hex digits | `#rrggbb` (each digit doubled) |
| long hex | `#` + 6 hex digits | unchanged |
| rgb | `rgb(` r `,` g `,` b `)` | `#rrggbb` |
| rgba | `rgba(` r `,` g `,` b `,` a `)` | see below |
| keyword | `^[a-z]{3,20}$`, not in `CSS_WIDE_KEYWORDS` | unchanged |

- Channels r, g, b: integers of 1–3 digits (`\d{1,3}`), each ≤ 255. No sign, no decimals, no `%`.
- Alpha a: `\d+(\.\d+)?` optionally followed by `%`. With `%`, divide by 100. After that, a > 1 →
  `null`; a = 1 → `#rrggbb`; otherwise → `rgba(r, g, b, A)` where `A` is
  `String(Math.round(a * 1000) / 1000)` (so `0.5` → `0.5`, `0.12345` → `0.123`, `0` → `0`).
- Hex output digits are lowercase, two per channel (`10` → `0a`).
- Any other input (including `rgb` with 4 values, `rgba` with 3, `hsl(...)`) → `null`.

### `normalizeFontFamily`

- "Surrounding quotes" means: after trimming, the name starts **and** ends with the same quote
  character (`"` or `'`) and is at least 2 characters long. Remove only that outer pair, then trim
  again and collapse inner whitespace runs to a single space.
- The case of the names is kept.
- "Letters" means ASCII letters `A-Z a-z`. Unquoted output only for `^[A-Za-z0-9-]+$`.

### `normalizeStyleValue`

- Test `UNSAFE_VALUE` against the raw `value` first; if it matches, return `null`.
- `color` and `background-color` → `normalizeColor`; `font-size` → `normalizeFontSize`;
  `font-family` → `normalizeFontFamily`; `text-align` → `normalizeTextAlign`.
- Use a `switch` over `property` covering all five cases (no `default` needed: the type is a
  closed union).

### `readStyle`

- Read the raw attribute with `element.getAttribute('style')`. Do **not** use `element.style`
  (the browser CSSOM rewrites values).

### `sanitizeStyle`

- Output properties: same rules as `buildStyle`, reading values from `parseStyle(style)`.
- Input-only properties: test the charset regex and `UNSAFE_VALUE` against the value returned by
  `parseStyle`, then output the value lowercased.

## Tests

- Provided tests (do not modify): `src/core/html/css.test.ts` (122 tests).
- Tests to write: none.

## Acceptance criteria

- [ ] `npm run check` passes (typecheck + lint + unit tests), after `npm run format`.
- [ ] All 122 tests in `src/core/html/css.test.ts` pass.
- [ ] `git status` shows only `src/core/html/css.ts` modified (plus this task file's
      `## Questions` / `## Report` sections).
- [ ] No `any`, `@ts-ignore`, `@ts-expect-error`, `biome-ignore`, non-exported mutable
      module-level variables, or DOM access at module top level.
- [ ] Exports and constants of `css.ts` unchanged.
- [ ] One commit on branch `task/T-001-css-helpers`:
      `feat(core): implement css style helpers (T-001)`.

## Notes

- Write each normalizer with one anchored regular expression per accepted form (`^...$`) and
  read capture groups. Avoid hand-written character loops.
- With `noUncheckedIndexedAccess`, capture groups are `string | undefined`: check them or use the
  non-null assertion `!` after a successful match (allowed by the lint config).
- `Number.prototype.toString(16).padStart(2, '0')` gives two-digit lowercase hex.
- Run a single test file while working: `npx vitest run src/core/html/css.test.ts`.
- Lint warnings in other `src/core/` files (unused parameters in stubs) are expected and not part
  of this task.

## Questions

<!-- Implementer: write questions here and stop if anything is unclear. -->

## Report

<!-- Implementer: fill in when done. Files changed, summary, points for the reviewer. -->
