# AGENTS.md — Rules for the implementing agent

You are the **implementer** on the Stilo project, an HTML5 WYSIWYG editor library built on
ProseMirror. A project manager and an architect have already made every decision. Your job is to
implement **exactly one task at a time**, as written, and nothing else.

## 1. Before you write any code

1. Read the task file you were assigned: `docs/tasks/T-NNN-*.md`.
2. Read every document and file listed in its **Context** section.
3. Read the reference extension `src/extensions/bold/` if the task creates or changes an extension.
4. If anything in the task is ambiguous, contradictory, or impossible: **stop**. Write your
   question in the task's `## Questions` section and do not guess.

## 2. Hard rules (never break these)

- **Do not install, remove or upgrade dependencies.** Never run `npm install <package>`. Use only
  the packages already in `package.json`.
- **Do not change configuration files**: `package.json`, `tsconfig*.json`, `vite.config.ts`,
  `vitest.config.ts`, `playwright*.config.ts`, `biome.json`, `.gitignore`.
- **Only touch the files listed in the task's Scope.** Files listed under "Do not touch" are
  read-only. If you believe another file must change, ask (see §1.4).
- **Do not change public APIs, types or signatures** already defined in `src/core/` or in the
  task's Contract section.
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

## 6. Definition of done

A task is done only when **all** of these are true:

1. `npm run check` passes (typecheck + lint + unit tests). Run `npm run format` first.
2. Every acceptance criterion in the task is satisfied.
3. Only files in the task's Scope were changed (`git status` to verify).
4. You filled in the task's `## Report` section: files changed, what you did, anything the
   reviewer should look at.

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
