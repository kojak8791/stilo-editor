# AGENTS.md — Rules for contributors and coding agents

Stilo is an HTML5 WYSIWYG editor library built on ProseMirror. These rules apply to anyone who
changes the code, human or AI agent. The decisions that matter outside a single change
(dependencies, configuration, file layout, public APIs, HTML output) are written down in
`docs/`; a change that needs a new decision updates those documents first, or adds an ADR
(`docs/decisions/`).

## 0. Write it right the first time

The toolchain enforces these. Respect them while you type, not after `npm run check` fails.

- **Format** (Biome): 2-space indent, max **100** columns, single quotes, semicolons, trailing
  commas. Lines that would exceed 100 columns: break them yourself.
- **Lint** (Biome `recommended`, warnings = errors): `const` unless reassigned; no unused
  variables, imports or parameters; `import type` for type-only imports; no `any`, `enum`,
  default exports; no unreachable code.
- **TypeScript** (`strict`, `noUncheckedIndexedAccess`): array/regex-group access is
  `T | undefined`; after a successful match use `!`. Every code path returns.
- **Smallest correct code**: one anchored regex per accepted form, no duplicated blocks (use a
  private helper), no comments that repeat the code.
- **Loop**: write the code → `npm run format` → `npm run check` → fix **all** reported issues in
  one pass → repeat.

## 1. Before you write code

1. Read the documents that cover the change: `docs/ARCHITECTURE.md`, `docs/UI.md` for the
   default UI, `docs/SPEC.md` for the requirement, the ADRs it touches.
2. Read the reference extension `src/extensions/bold/` if the change creates or changes an
   extension. If it moves, deletes, inserts or wraps nodes, read
   `docs/guides/prosemirror-positions.md`.
3. If something is ambiguous or contradicts the documents, ask the project owner instead of
   guessing.

## 2. Hard rules

- **Dependencies** change only by decision (ADR). Never run `npm install <package>` on your own.
- **Configuration files** (`package.json`, `tsconfig*.json`, `vite.config.ts`,
  `vitest.config.ts`, `playwright*.config.ts`, `biome.json`, `.gitignore`) change only when the
  change is about them.
- **Public APIs, types and HTML output** follow `docs/ARCHITECTURE.md` and `docs/UI.md`; changing
  them means updating those documents in the same change.
- **Lint warnings fail the build** (`npm run check` uses `--error-on-warnings`).
- **Never disable lint rules** (`biome-ignore`) or use `@ts-ignore` / `@ts-expect-error` / `any`.
- **Never weaken a test to make it pass.** A test changes only when the behavior it describes
  changes on purpose.
- **No invented features.** Implement what was asked; propose extras separately.
- **Import directions** (`docs/ARCHITECTURE.md` §2.2): `src/core/` and `src/extensions/` never
  import from `src/ui/`, `lucide` or `@floating-ui/dom`; `src/ui/` imports the core only via
  `src/index.ts`.
- **Never invent numbers** (measurements, costs): write "unknown".

## 3. Coding rules

- TypeScript strict, ESM. Named exports only, no default exports.
- No `enum`: use string literal unions. No `any`: use `unknown` and narrow.
- No DOM access at module top level. No global mutable state.
- Relative imports without file extension. No path aliases.
- Follow the naming table in `docs/ARCHITECTURE.md` §4.1.
- An extension always has the same shape: copy `src/extensions/bold/` and adapt it.
- A ProseMirror `Command` returns a `boolean` and calls `dispatch` itself. Return a command's
  result as is (`wrapIn(type)(state, dispatch)`); never pass it to `dispatch` or compare it
  with `null`.
- Style attributes are handled only through `src/core/html/css.ts`. Never build or parse
  `style` strings by hand.
- HTML output must match `docs/ARCHITECTURE.md` §7 exactly.
- Public functions and types get a short JSDoc comment. Inside function bodies, comment only
  non-obvious logic.
- Code, comments, identifiers and documentation in English.

## 4. Performance rules (SPEC NFR-1, ADR 0003)

- Never traverse the whole document (`doc.descendants`, `doc.nodesBetween(0, doc.content.size)`)
  inside plugin `apply`, `view.update`, or decoration code.
- Decorations: map with `DecorationSet.map` and recompute only the changed ranges.
- Never call `getHTML()` / serialization on every transaction.
- Expensive derived data (counts, search results) is computed on demand or debounced.
- A change that may affect performance is measured with `npm run bench` before and after.

## 5. Tests

- Unit tests are colocated: `src/extensions/<name>/<name>.test.ts`.
- Use the helpers in `tests/helpers/` (`createTestEditor`, selection markers `|` and `[ ]`,
  `getHTMLWithSelection`).
- Test in layers: dense where the risk is high (HTML in/out, sanitizing, commands), essential
  behaviors for the UI; layout and visual details are checked in the demo.
- Every extension needs tests for: parse (each accepted HTML source), serialize, idempotence
  (`setHTML(getHTML())` then `getHTML()` is identical), every command, every shortcut, every
  input rule.
- When a position or structure bug resists, print the real positions with a throwaway test
  (`docs/guides/prosemirror-positions.md` §6) instead of reasoning at length. Delete it before
  committing.
- jsdom has no layout and loads no CSS: positioning, visibility and styles are checked in the
  demo (and later in E2E tests).

## 6. Definition of done

1. `npm run check` passes (typecheck + lint + unit tests). Run `npm run format` first.
2. The behavior is tried in the demo when it is visible there.
3. The documents in `docs/` describe the new behavior or decision.
4. `docs/BACKLOG.md` shows the task status.

## 7. Git

- Work on a branch `task/T-NNN-short-title` (the task ID from `docs/BACKLOG.md`), created from
  `main`.
- Commit messages follow Conventional Commits and reference the task:
  `feat(bold): add bold extension (T-003)`. The body explains what changed and why: it is the
  record of the task.
- The project owner tries the change and decides the merge.

## 8. Useful commands

| Command | Purpose |
|---|---|
| `npm run check` | Quality gate (must pass) |
| `npm run format` | Auto-fix formatting and safe lint issues |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run bench` | Performance benchmarks (needs `npx playwright install chromium`) |
| `npm run size` | Bundle size of typical apps; fails if tree-shaking breaks |
| `npm run test:e2e` | Playwright E2E |
| `npm run dev` | Demo page |
