# Stilo — Vision

## What Stilo is

Stilo is an open-source (MIT) WYSIWYG HTML5 editor library for the browser, built on
[ProseMirror](https://prosemirror.net). It aims at the feature level of editors such as Tiptap or
CKEditor 5, while being **entirely open source**: no paid tiers, no closed "pro" extensions.

## Goals

1. **A complete, professional editor**: rich text, headings, lists, tables, images, fonts, colors,
   undo/redo, block reordering, paste cleanup, and more (see [SPEC.md](SPEC.md)).
2. **HTML is the public format.** Content goes in as HTML and comes out as clean, semantic,
   self-contained HTML. A JSON representation exists (ProseMirror's own) but is optional.
3. **Framework-agnostic core.** Vanilla TypeScript library first; React/Vue/... wrappers later as
   thin layers.
4. **Headless core + optional default UI.** The core works without any UI; the bundled UI
   (toolbar, menus) is optional and replaceable.
5. **Extensible by design.** Every feature is an *extension* with the same shape. Third parties can
   write their own.
6. **Measured performance.** Performance on very large documents is verified by automated
   benchmarks with explicit budgets, not assumed.
7. **Collaboration-ready architecture.** Real-time collaboration (Yjs) is not in the first releases,
   but nothing in the design may prevent it.

## Non-goals (for now)

- Server-side rendering of the editor (the core must be *importable* in Node without crashing, but
  editing requires a DOM).
- A proprietary storage format. HTML is the contract.
- Canvas-based rendering or document virtualization (see the performance notes in SPEC.md).
- Legacy browsers (no IE, no pre-Chromium Edge).

## Project meta-goals

Stilo is also a learning project and an experiment: can a **local LLM** take a real share of the
work on a medium-complexity library, and where does it pay off? It is developed by a project
manager (human), an "architect" model (Claude) and a local implementer model (Qwen3.6-35B-A3B /
Bonsai27B via opencode + LM Studio).

**The product comes first.** Only code that passes the quality gate and the review is merged,
whoever wrote it. Within that limit:

- **Project manager**: goals, priorities, trade-offs, merges. Decides who takes a borderline task,
  and every escalation.
- **Architect**: architecture, decisions ([decisions/](decisions/)), contracts (types,
  signatures, HTML output), and task files that describe behavior and acceptance cases. It writes
  no implementation code, except where the backlog or a task Report says so.
- **Implementer**: writes the code and the tests of each task, chooses the internal design within
  the contract, and iterates until the quality gate passes ([AGENTS.md](../AGENTS.md)). It never
  makes architectural decisions.

The split is **hybrid and declared**. The local model takes the work where it saves something:
long, repetitive, well-testable tasks. A task whose specification would cost as much as its code
may go to the architect, openly (Owner column in [tasks/BACKLOG.md](tasks/BACKLOG.md)). If the
implementer still fails after three review rounds, the project manager decides: re-specify,
split, or escalate to the architect; the task Report records it.

Each task records what it cost (architect tokens for preparation and review, implementer fix
rounds), so that the project can answer with data where a local model saves tokens or time, and
where it does not.

Because of this, all decisions (dependencies, configuration, file layout, APIs, HTML output) are
written down **before** implementation, in `docs/`, and implementation work is split into tasks
([tasks/](tasks/)) whose acceptance cases are the contract.

## Document map

| Document | Content |
|---|---|
| [VISION.md](VISION.md) | This file: why and what |
| [SPEC.md](SPEC.md) | Features, priorities, non-functional requirements, roadmap |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical design, stack, file layout, extension API, HTML contract |
| [decisions/](decisions/) | Architecture Decision Records (changes to decisions) |
| [tasks/](tasks/) | Implementation tasks for the local model |
| [../AGENTS.md](../AGENTS.md) | Rules for the implementing agent |
