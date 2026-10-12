# T-NNN — <Short title>

| Field | Value |
|---|---|
| Status | `todo` \| `in-progress` \| `blocked` \| `review` \| `done` |
| Spec | F-xxx, F-yyy |
| Milestone | M1 |
| Depends on | T-NNN, T-NNN |
| Branch | `task/T-NNN-short-title` |

## Goal

One or two sentences: what must exist when this task is done.

## Context (read before starting)

- `docs/ARCHITECTURE.md` §x.y
- `docs/SPEC.md` F-xxx
- `src/extensions/bold/` (reference extension)
- ...

## Scope

Files to create:

- `src/extensions/<name>/index.ts`
- `src/extensions/<name>/<name>.test.ts`

Files to modify:

- `src/extensions/index.ts` — add the export line only

Do not touch:

- everything else

## Contract

Exact names, signatures, node/mark specs, commands, shortcuts and HTML output decided for this task.

```ts
// signatures / types the implementation must expose
```

| Input HTML | Expected `getHTML()` |
|---|---|
| `<p><b>a</b></p>` | `<p><strong>a</strong></p>` |

## Tests

- Provided tests (do not modify): `path/to/file.test.ts`
- Tests to write:
  - [ ] parse: ...
  - [ ] serialize: ...
  - [ ] idempotence
  - [ ] command `xxx`: enabled when ..., disabled when ...
  - [ ] shortcut `Mod-x`
  - [ ] input rule `...`

## Acceptance criteria

- [ ] `npm run check` passes
- [ ] ...

## Notes

Hints, pitfalls, links to the ProseMirror docs relevant to this task.

## Questions

<!-- Implementer: write questions here and stop if anything is unclear. -->

## Report

<!-- Implementer: fill in when done. Files changed, summary, points for the reviewer, failed
`npm run check` runs before the final one. -->

## Metrics

<!-- Reviewer: architect tokens (preparation, review), review rounds, escalation (yes/no). -->
