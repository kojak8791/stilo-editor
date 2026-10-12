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
| T-012 | Clipboard: paste HTML and plain text, canonical copy | F-701, F-702, F-706 | Implementer | done |
| T-013 | Default UI: toolbar, `lucide` icons, i18n (`en`, `it`), `ui.css`, import-rules test (design: `docs/UI.md`; Vite config and minimal demo page done by the architect) | F-801, NFR-4 | Implementer | done |
| T-014 | Default UI: popover component (Floating UI, ADR 0002) and heading dropdown | F-802 | Implementer | done |
| T-015 | `content.css` (ProseMirror and gap cursor base CSS, lists, blockquote, placeholder rule `.stilo-placeholder::before` showing `attr(data-placeholder)`, hidden when not editable); fix `insertBlock` throwing on a document-level selection; remove the toolbar `try/catch` around `isEnabled` | NFR-5 | Architect | done |
| T-016 | Default UI: link popover, also bound to `Mod-k` (the headless `Link` has no shortcut) | F-803 | Architect | done |
| T-017 | Demo benchmark mode (`/demo/?bench`) and NFR-1 harness | NFR-1 | Architect | todo |
| T-018 | Lists: Backspace at the start of an empty paragraph after a list deletes it and puts the cursor at the end of the last item (today it becomes an empty item again); check a non-empty paragraph too | F-401, F-402 | Architect | todo |
| T-019 | Toolbar placement: sticky when the editor flows in the page, static when the editor scrolls inside its own container | F-801 | Architect | todo |

## Notes for later milestones

- F-809 (themes): the gap cursor line in `content.css` (`.ProseMirror-gapcursor:after`) has a
  fixed `black` color, invisible on a dark theme; use `currentColor` or a `--stilo-*` property.
