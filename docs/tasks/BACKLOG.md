# Backlog

Planned tasks for M0 and M1, derived from `docs/SPEC.md` §13 (roadmap) and ordered by
dependency. This is a plan, not a contract: each task file (`T-NNN-*.md`) is written only when the
task is next, and may split or merge rows. Owner **Architect** means written directly by the
architect (contracts, reference code); **Implementer** means a closed task file for the
implementer (see `AGENTS.md`).

Tasks group closely related features that follow the same reference code, so that one reading of
the context serves several implementations.

## M0 — Foundations

| Task | Content | Spec | Owner | Status |
|---|---|---|---|---|
| T-001 | CSS style helpers | NFR-2, §7.3 | Implementer | done |
| T-002 | HTML sanitizer | NFR-2, F-010 | Implementer | done |
| T-003 | Core runtime: event emitter, extension manager, `Editor`, HTML parse/serialize, helpers; `Document`, `Text`, `Paragraph` | F-001…F-009 | Architect | done |
| T-004 | Test helpers (`createTestEditor`, selection markers), `Bold` reference extension, `StarterKit` skeleton | F-201, F-301 | Architect | todo |

## M1 — MVP

| Task | Content | Spec | Owner | Status |
|---|---|---|---|---|
| T-005 | Marks: `Italic`, `Underline`, `Strike`, `Code` | F-202…F-205 | Implementer | todo |
| T-006 | Blocks: `Heading`, `Blockquote`, `HorizontalRule`, `HardBreak`, paragraph shortcut | F-301…F-305 | Implementer | todo |
| T-007 | Lists: `BulletList`, `OrderedList`, `ListItem` | F-401…F-405 | Implementer | todo |
| T-008 | `Link` | F-206 | Implementer | todo |
| T-009 | `History`, `ClearFormatting` | F-101…F-103, F-212 | Implementer | todo |
| T-010 | `MoveBlock` | F-309 | Implementer | todo |
| T-011 | `Placeholder`, `DropCursor`, `GapCursor` | F-011, F-012 | Implementer | todo |
| T-012 | Clipboard: paste HTML and plain text, canonical copy | F-701, F-702, F-706 | Implementer | todo |
| T-013 | Default UI: toolbar and heading dropdown (needs a UI design pass first) | F-801, F-802 | Architect + Implementer | todo |
| T-014 | Default UI: link popover | F-803 | Implementer | todo |
| T-015 | Demo page and NFR-1 benchmark harness | NFR-1 | Architect + Implementer | todo |
