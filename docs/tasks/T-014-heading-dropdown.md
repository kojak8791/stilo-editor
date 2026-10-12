# T-014 — Default UI: popover component and heading dropdown

| Field | Value |
|---|---|
| Status | `todo` |
| Spec | F-802, NFR-4 |
| Milestone | M1 |
| Depends on | T-013 |
| Branch | `task/T-014-heading-dropdown` (already created) |

## Goal

A reusable popover (Floating UI), a dropdown menu built on it, and the heading dropdown in the
toolbar; plus three fixes to the T-013 toolbar. **The tests are provided and complete: you write
only the implementation and the CSS.** Make the provided tests pass without changing them.

## Context (read before starting)

- `AGENTS.md` (all of it)
- `docs/UI.md` §4.1, §5, §6, §7 (the design contract)
- `src/ui/toolbar/toolbar.ts`, `types.ts`, `items.ts`, `src/ui/index.ts`, `src/styles/ui.css`
- The provided tests: `src/ui/components/popover.test.ts` and `src/ui/toolbar/toolbar.test.ts`
  (test `1`, test `17` and the `describe('heading dropdown')` block are new)
- `node_modules/@floating-ui/dom/dist/floating-ui.dom.d.ts`: `computePosition`, `autoUpdate`,
  `offset`, `flip`, `shift`, `Placement`, `VirtualElement`

## Scope

Files to create:

- `src/ui/components/popover.ts`
- `src/ui/components/dropdown.ts`

Files to modify:

- `src/ui/toolbar/toolbar.ts`, `src/ui/toolbar/types.ts`, `src/ui/toolbar/items.ts`
- `src/ui/index.ts`
- `src/styles/ui.css`

Do not touch: the two provided test files, everything else, and `docs/` (except the Questions and
Report sections of this file).

## Contract

- `popover.ts`: exactly the API of UI.md §5 (`createPopover`, `Popover`, `PopoverOptions`,
  `PopoverCloseReason`).
- `types.ts`: `export type ToolbarItem = ToolbarButton | ToolbarDropdown;`.
- `items.ts`: `headingDropdown(levels?)` per UI.md §6.3; `DEFAULT_ITEMS.heading` is
  `headingDropdown()`; `DEFAULT_TOOLBAR` gets `['heading']` as second group (UI.md §3.3).
- `index.ts`: also export `headingDropdown`, `ToolbarDropdown`, `ToolbarDropdownOption`;
  **remove** `isMacPlatform` (it is internal).
- `dropdown.ts` (internal, not exported from `index.ts`):

  ```ts
  /** One option as displayed: label and shortcut already resolved and formatted. */
  export interface DropdownOptionView {
    id: string;
    label: string;
    shortcut?: string;
  }

  export interface DropdownOptions {
    /** Accessible name of the trigger and of the menu; shown when no option is active. */
    label: string;
    options: DropdownOptionView[];
    /** The popover container (the toolbar element). */
    container: HTMLElement;
    onSelect(id: string): void;
  }

  export interface DropdownState {
    activeId: string | null;
    disabledIds: ReadonlySet<string>;
  }

  export interface Dropdown {
    /** The trigger button; the toolbar inserts it in its group. */
    readonly trigger: HTMLButtonElement;
    update(state: DropdownState): void;
    destroy(): void;
  }

  export function createDropdown(options: DropdownOptions): Dropdown;
  ```

### Fixes to the T-013 toolbar

1. Groups are **direct children** of the toolbar element (UI.md §4.1): remove the
   `stilo-toolbar__groups` wrapper. With it, the CSS stacks the groups vertically.
2. `ArrowLeft` always moves to the previous item, wrapping from the first to the last. Today it
   does nothing on the last item.
3. `isMacPlatform` is no longer exported from `src/ui/index.ts`.

## Notes

- **Toolbar items are now of two kinds.** Keep one array of item elements for the roving
  tabindex (buttons and dropdown triggers); the toolbar click handler runs only `kind: 'button'`
  items: the dropdown handles its own trigger. The trigger also gets `data-item` and the class
  `stilo-toolbar__button` from the toolbar.
- **The menu lives inside the toolbar element** (the popover container), so the toolbar
  `mousedown` handler already keeps the editor selection, and the toolbar `keydown` handler
  must keep ignoring targets that are not item elements (menu options are not).
- **Order when selecting:** close the popover first, then call `onSelect(id)`. The toolbar's
  `onSelect` runs the option and calls `editor.focus()`. Focus the trigger only when the popover
  closed with `escape`.
- **Escape:** the popover listens on the document in the capture phase
  (`addEventListener('keydown', handler, true)`) and removes the listener on close.
- **Async position:** `computePosition` returns a promise; ignore a result that arrives after
  the popover closed. Set `content.style.left` / `top` (property assignment, not a style
  string: the css.ts rule concerns content HTML, not UI elements).
- **Enabled options:** `isActive(editor) || editor.can().<command>()`. `setBlockType` returns
  `false` on a block that already has the type, and the active option must stay selectable.
- **Toolbar `update()`** computes, for each dropdown, the first active option ID and the set of
  disabled option IDs, and calls `dropdown.update`. `destroy()` also destroys every dropdown.
- **Options** are `div` elements with `tabindex="-1"`, focused with `.focus()`.
- **CSS:** add the popover, dropdown and heading-preview rules of UI.md §7.
- **If a provided test looks wrong**, stop and write the test name, the output and your reason in
  `## Questions`. Do not edit it, and do not change files outside Scope to make it pass.
- After every `npm run check`, run `git status --short` and revert any file outside Scope.

## Acceptance criteria

- [ ] `npm run check` passes.
- [ ] The two provided test files are unchanged (`git diff main -- <file>` is empty).
- [ ] Only the files in Scope changed.
- [ ] `npm run dev`: the PM checks the toolbar on one row and the heading dropdown.

## Questions

<!-- Implementer: write questions here and stop if anything is unclear. -->

## Report

<!-- Implementer: fill in when done. Files changed, summary, points for the reviewer, failed
`npm run check` runs before the final one. -->

## Metrics

<!-- Reviewer only (the implementer never edits this section): architect tokens (preparation,
review), implementer failed check runs and context compactions, review rounds, escalation. -->
