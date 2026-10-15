# Stilo — Vision

## What Stilo is

Stilo is an open-source (MIT) WYSIWYG HTML5 editor library for the browser, built on
[ProseMirror](https://prosemirror.net). It aims at the feature level of the established rich text
editors, while being **entirely open source**: no paid tiers, no closed "pro" extensions.

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

## How Stilo is developed

Stilo is designed and owned by one person and developed with AI assistance (Claude). The owner
sets goals and priorities, makes the decisions, tries every change in the demo and decides the
merge. Decisions (dependencies, configuration, file layout, APIs, HTML output) are written down
**before** the code, in `docs/`; changes to them get an ADR ([decisions/](decisions/)). Every
change passes the quality gate ([AGENTS.md](../AGENTS.md)), and performance is measured against
explicit budgets.

## Document map

| Document | Content |
|---|---|
| [VISION.md](VISION.md) | This file: why and what |
| [SPEC.md](SPEC.md) | Features, priorities, non-functional requirements, roadmap |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical design, stack, file layout, extension API, HTML contract |
| [decisions/](decisions/) | Architecture Decision Records (changes to decisions) |
| [UI.md](UI.md) | Design of the default UI |
| [PERFORMANCE.md](PERFORMANCE.md) | Performance in practice, how it is measured, limits |
| [BACKLOG.md](BACKLOG.md) | Tasks done and planned |
| [guides/](guides/) | How-to guides (e.g. ProseMirror positions) |
| [../AGENTS.md](../AGENTS.md) | Rules for contributors and coding agents |
