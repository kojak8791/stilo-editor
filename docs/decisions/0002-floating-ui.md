# 0002 — Floating UI for UI popovers

- Status: accepted
- Date: 2026-10-12

## Context

The default UI (ARCHITECTURE §9) needs floating elements anchored to something else: the
heading dropdown (F-802, M1), the link popover anchored to the selection (F-803, M1), then font
and color menus, the table menu, the bubble menu and the slash menu (M2–M3), and richer tooltips.

Positioning a floating element well is not trivial: flip to the other side when there is no room,
shift to stay inside the viewport, follow the anchor on scroll and resize, anchor to a text
selection (a rectangle, not an element). Writing it by hand means owning those edge cases in
every component.

The native Popover API (`popover` attribute) gives top-layer rendering and light dismiss, but
not positioning (CSS anchor positioning is not available in all the browsers of NFR-3), and
jsdom implements neither, so it would split behavior between unit tests and browsers.

## Decision

- Add `@floating-ui/dom` to the runtime `dependencies` (ARCHITECTURE §1.1).
- Only `src/ui/` may import it, like `lucide`; `src/core/` and `src/extensions/` never do
  (§2.2, enforced by `tests/architecture.test.ts`).
- All floating UI goes through one component, `src/ui/components/popover.ts` (design in
  `docs/UI.md`), which wraps `computePosition` + `autoUpdate`. Other UI code never calls
  Floating UI directly.
- The native `popover` attribute is not used. Dismissal (Escape, pointer down outside) is
  handled by the popover component.
- M1 tooltips are native (`title`); a Floating UI tooltip with an arrow and a light animation
  replaces them later.
- Positioning strategy (revised in T-016): `absolute`, inside a positioned container that
  scrolls with the anchor — the toolbar for its menus, the element of the editor for popovers
  anchored to the content. The first version used `fixed`, which had to be repositioned by
  script on every scroll and visibly lagged behind the anchor.

## Consequences

- One more runtime dependency (small, no dependencies of its own besides `@floating-ui/core`
  and `@floating-ui/utils`); headless users who do not import `stilo-editor/ui` do not load it.
- Positioning cannot be verified in jsdom (no layout): unit tests cover open/close, keyboard and
  focus behavior; position is checked in the demo and, later, in E2E tests.
- ARCHITECTURE §1.1 and §2.2 list the new dependency.
- With `absolute`, an ancestor with `overflow: hidden` can clip a popover; `flip()` keeps it on
  the side with room when possible.
