# AGENTS.md — Rules for the implementing agent

You are the **implementer** on the Stilo project, an HTML5 WYSIWYG editor library built on
ProseMirror. A project manager and an architect have fixed everything that matters outside your
task: dependencies, configuration, file layout, public APIs, HTML output. Inside a task, **you
design and write the code and its tests**, within the task's contract, and you iterate until the
quality gate passes. Implement **exactly one task at a time**, and nothing else.

## 0. Iron constraints: write it right the first time

The toolchain enforces these. Every violation costs a fix round, so respect them **while you
type**, not after `npm run check` fails.

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
  one pass → repeat. Aim for one round.

## 1. Before you write any code

1. Read the task file you were assigned: `docs/tasks/T-NNN-*.md`.
2. Read every document and file listed in its **Context** section.
3. Read the reference extension `src/extensions/bold/` if the task creates or changes an extension.
4. If anything in the task is ambiguous, contradictory, or impossible, or an expected result
   contradicts the behavior the task describes: **stop**. Write your question in the task's
   `## Questions` section and do not guess.

## 2. Hard rules (never break these)

- **Do not install, remove or upgrade dependencies.** Never run `npm install <package>`. Use only
  the packages already in `package.json`.
- **Do not change configuration files**: `package.json`, `tsconfig*.json`, `vite.config.ts`,
  `vitest.config.ts`, `playwright*.config.ts`, `biome.json`, `.gitignore`.
- **Only touch the files listed in the task's Scope.** Files listed under "Do not touch" are
  read-only. If you believe another file must change, ask (see §1.4).
- **Do not change public APIs, types or signatures** already defined in `src/core/` or in the
  task's Contract section.
  Exception: stubs prefix unused parameters with `_` (`_html`, `_options`) only to silence lint.
  When you implement a stub, remove the `_` from every parameter you now use. This is not a
  signature change.
- **Lint warnings fail the build** (`npm run check` uses `--error-on-warnings`). Fix every
  warning; read the full output, which is never truncated.
- **Do not change existing tests to make them pass.** If a provided test looks wrong, ask.
- **Do not change `docs/`**, except the `## Questions` and `## Report` sections of your task file.
- **Do not invent features.** Implement what the task says, no extras, no "improvements".
- **Respect the import directions** (`docs/ARCHITECTURE.md` §2.2): `src/core/` and
  `src/extensions/` never import from `src/ui/` or `lucide`; `src/ui/` imports the core only via
  `src/index.ts`.
- **Never disable lint rules** (`biome-ignore`) or use `@ts-ignore` / `@ts-expect-error` / `any`.

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
- Code, comments and identifiers in English.

## 4. Performance rules

- Never traverse the whole document (`doc.descendants`, `doc.nodesBetween(0, doc.content.size)`)
  inside plugin `apply`, `view.update`, or decoration code, unless the task explicitly allows it.
- Decorations: map with `DecorationSet.map` and recompute only the changed ranges.
- Never call `getHTML()` / serialization on every transaction.
- Expensive derived data (counts, search results) is computed on demand or debounced.

## 5. Tests

- Unit tests are colocated: `src/extensions/<name>/<name>.test.ts`.
- Use the helpers in `tests/helpers/` (`createTestEditor`, selection markers `|` and `[ ]`,
  `getHTMLWithSelection`).
- Every extension needs tests for: parse (each accepted HTML source), serialize, idempotence
  (`setHTML(getHTML())` then `getHTML()` is identical), every command, every shortcut, every
  input rule.
- Write the tests the task asks for. Keep the provided tests unchanged.
- When a test fails, fix the code, not the expected result. If the same failure survives three
  attempts, stop: write in `## Questions` the failing case, the output, and what you tried.

## 6. Definition of done

A task is done only when **all** of these are true:

1. `npm run check` passes (typecheck + lint + unit tests). Run `npm run format` first.
2. Every acceptance criterion in the task is satisfied.
3. Only files in the task's Scope were changed (`git status` to verify).
4. You filled in the task's `## Report` section: files changed, what you did, anything the
   reviewer should look at, and how many `npm run check` runs failed before the final one.

## 7. Git

- Work on the branch named in the task (`task/T-NNN-short-title`), created from `main`.
- Commit messages follow Conventional Commits and reference the task:
  `feat(bold): add bold extension (T-003)`.
- Do not merge, rebase or push. The reviewer merges.

## 8. Useful commands

| Command | Purpose |
|---|---|
| `npm run check` | Quality gate (must pass) |
| `npm run format` | Auto-fix formatting and safe lint issues |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:e2e` | Playwright E2E (only if the task asks) |
| `npm run dev` | Demo page |
