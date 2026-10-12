# Backlog

The history of the work done and the plan of the next tasks, derived from `docs/SPEC.md` §13
(roadmap). A task is one branch (`task/T-NNN-short-title`); its record is the commit history,
and its decisions live in `docs/` (ARCHITECTURE, UI, ADRs). This is a plan, not a contract: rows
may be split or merged when a task starts.

## M0 — Foundations

| Task | Content | Spec | Status |
|---|---|---|---|
| T-001 | CSS style helpers | NFR-2, §7.3 | done |
| T-002 | HTML sanitizer | NFR-2, F-010 | done |
| T-003 | Core runtime: event emitter, extension manager, `Editor`, HTML parse/serialize, helpers; `Document`, `Text`, `Paragraph` | F-001…F-009 | done |
| T-004 | Test helpers (`createTestEditor`, selection markers), `Bold` reference extension, `StarterKit` skeleton | F-201, F-301 | done |

## M1 — MVP

| Task | Content | Spec | Status |
|---|---|---|---|
| T-005 | Marks: `Italic`, `Underline`, `Strike`, `Code` | F-202…F-205 | done |
| T-006 | Blocks: `Heading`, `Blockquote`, `HorizontalRule`, `HardBreak` | F-302…F-305 | done |
| T-007 | Lists: `BulletList`, `OrderedList`, `ListItem` | F-401…F-405 | done |
| T-008 | `Link` | F-206 | done |
| T-009 | `History`, `ClearFormatting` | F-101…F-103, F-212 | done |
| T-010 | `MoveBlock` | F-309 | done |
| T-011 | `Placeholder`, `DropCursor`, `GapCursor` | F-011, F-012 | done |
| T-012 | Clipboard: paste HTML and plain text, canonical copy | F-701, F-702, F-706 | done |
| T-013 | Default UI: toolbar, `lucide` icons, i18n (`en`, `it`), `ui.css`, import-rules test (design: `docs/UI.md`) | F-801, NFR-4 | done |
| T-014 | Default UI: popover component (Floating UI, ADR 0002) and heading dropdown | F-802 | done |
| T-015 | `content.css` (ProseMirror and gap cursor base CSS, lists, blockquote, placeholder rule `.stilo-placeholder::before` showing `attr(data-placeholder)`, hidden when not editable); fix `insertBlock` throwing on a document-level selection; remove the toolbar `try/catch` around `isEnabled` | NFR-5 | done |
| T-016 | Default UI: link popover, also bound to `Mod-k` (the headless `Link` has no shortcut), link bubble, popovers positioned `absolute` (ADR 0002), `Editor.getAttributes` | F-803 | done |
| T-017 | Demo benchmark mode (`/demo/?bench`) and NFR-1 harness; `content-visibility` and calibrated budgets (ADR 0003) | NFR-1 | done |
| T-018 | Documentation cleanup: the local-model experiment is closed; task files and template removed, `BACKLOG.md` moved to `docs/`, `AGENTS.md` rewritten for any contributor, README "How it is built" | — | review |
| T-019 | Lists: Backspace at the start of an empty paragraph after a list deletes it and puts the cursor at the end of the last item (today it becomes an empty item again); check a non-empty paragraph too | F-401, F-402 | todo |
| T-020 | Toolbar placement: sticky when the editor flows in the page, static when the editor scrolls inside its own container | F-801 | todo |

## Notes for later milestones

- First npm release: `SECURITY.md` (private vulnerability reports, response time),
  `CONTRIBUTING.md`, issue templates (steps to reproduce, version, browser), and a "Support"
  section in the README with a concrete promise the owner can keep (for example, a first
  answer to every issue within 7 days, confirmed bugs before new features).
- Performance (ADR 0003): toolbar `isEnabled` checks that are O(n) at the top level (e.g.
  `insertBlock` runs `canReplaceWith` on the document content); per-keystroke cost of the toolbar
  refresh and of the link bubble. Measure with `npm run bench` before and after.
- F-809 (themes): the gap cursor line in `content.css` (`.ProseMirror-gapcursor:after`) has a
  fixed `black` color, invisible on a dark theme; use `currentColor` or a `--stilo-*` property.
