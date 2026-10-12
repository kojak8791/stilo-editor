# Backlog

Planned tasks for M0 and M1, derived from `docs/SPEC.md` §13 (roadmap) and ordered by
dependency. This is a plan, not a contract: each task file (`T-NNN-*.md`) is written only when the
task is next, and may split or merge rows. Owner **Implementer** means a task file for the
implementer, who writes the code and the tests (see `AGENTS.md`); **Architect** means work the
architect does itself, declared here (contracts, core design, or a task whose specification
would cost as much as its code). See `docs/VISION.md`, "Project meta-goals".

Tasks group closely related features, so that one reading of the context serves several
implementations.

## M0 — Foundations

| Task | Content | Spec | Owner | Status |
|---|---|---|---|---|
| T-001 | CSS style helpers | NFR-2, §7.3 | Implementer | done |
| T-002 | HTML sanitizer | NFR-2, F-010 | Implementer | done |
| T-003 | Core runtime: event emitter, extension manager, `Editor`, HTML parse/serialize, helpers; `Document`, `Text`, `Paragraph` | F-001…F-009 | Architect | done |
| T-004 | Test helpers (`createTestEditor`, selection markers), `Bold` reference extension, `StarterKit` skeleton | F-201, F-301 | Architect | done |

## M1 — MVP

| Task | Content | Spec | Owner | Status |
|---|---|---|---|---|
| T-005 | Marks: `Italic`, `Underline`, `Strike`, `Code` | F-202…F-205 | Implementer | done |
| T-006 | Blocks: `Heading`, `Blockquote`, `HorizontalRule`, `HardBreak` | F-302…F-305 | Implementer | done |
| T-007 | Lists: `BulletList`, `OrderedList`, `ListItem` | F-401…F-405 | Implementer | done |
| T-008 | `Link` | F-206 | Implementer | done |
| T-009 | `History`, `ClearFormatting` | F-101…F-103, F-212 | Implementer | done |
| T-010 | `MoveBlock` | F-309 | Implementer | done |
| T-011 | `Placeholder`, `DropCursor`, `GapCursor` | F-011, F-012 | Implementer | done |
| T-012 | Clipboard: paste HTML and plain text, canonical copy | F-701, F-702, F-706 | Implementer | todo |
| T-013 | Default UI: toolbar and heading dropdown (needs a UI design pass first) | F-801, F-802 | Architect + Implementer | todo |
| T-014 | Default UI: link popover, also bound to `Mod-k` (the headless `Link` has no shortcut) | F-803 | Implementer | todo |
| T-015 | Demo page and NFR-1 benchmark harness; `content.css` with ProseMirror and gap cursor base CSS and the placeholder rule (`.stilo-placeholder::before` showing `attr(data-placeholder)`, hidden when not editable) | NFR-1 | Architect + Implementer | todo |
