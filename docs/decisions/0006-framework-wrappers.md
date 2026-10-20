# 0006 — Framework wrappers

- Status: proposed
- Date: 2026-10-20

## Context

Most applications embed an editor in a component of their framework (F-1002 React, F-1003 Vue,
F-1005 Svelte). The core is plain TypeScript on the DOM (D-05): `new Editor({ element })` mounts
ProseMirror in an element, `destroy()` removes it, `editor.on()` reports changes, and the
default UI (`createToolbar`, `createStatusBar`) is appended to containers. A wrapper connects
this life cycle to the framework's. Four questions are open (ARCHITECTURE §2):

- **Packaging.** Separate packages in an npm workspace, or subpath exports of `stilo-editor`
  like `stilo-editor/ui`. D-04 chose one package and no monorepo.
- **The framework as a dependency.** The application brings its own React, Vue or Svelte; two
  copies of React in one page break its hooks.
- **Server-side rendering.** Frameworks render components on the server (Next.js, Nuxt,
  SvelteKit), where there is no DOM; the editor can only exist in the browser.
- **How the editor, its events and the default UI reach the component**, and how the content
  goes in and out.

The content question has a performance side. A *controlled* component (`value` and
`onChange(html)`, like a form input) serializes the whole document at every change, compares it
with the value passed back at every render, and replaces the document (`setHTML`, the cursor to
the start) when they differ. Serializing at every transaction is ruled out by NFR-1
([AGENTS.md](../../AGENTS.md) §4): its cost grows with the document.

## Decision

### Packaging

The wrappers are **subpath exports of `stilo-editor`**: `stilo-editor/react`, later
`stilo-editor/vue` and `stilo-editor/svelte`. Their sources live in `src/react/`, `src/vue/`,
`src/svelte/`, and the library build emits them as more entries (`dist/react.js`, …) next to
`index.js` and `ui.js`. The wrappers take the version of the package: the core and a wrapper
are never out of step.

### The framework as an optional peer dependency

Each framework is a **peer dependency marked optional** (`peerDependenciesMeta`): npm installs
nothing for an application that does not use the wrapper, and the application's own copy is
the one used. The build keeps the framework external. React: `"react": "^18 || ^19"`. The
wrapper uses only APIs that both versions have; it is developed and tested on the current
version, 19. The packages needed to build and test a wrapper are devDependencies
(ARCHITECTURE §1.1); for React: `react`, `react-dom`, `@types/react`, `@types/react-dom`.

### Import directions

A wrapper imports its framework and the public APIs only: `src/index.ts` and `src/ui/index.ts`.
The core, the extensions and the default UI never import a framework. `tests/architecture.test.ts`
enforces both directions.

### Shape

Every wrapper offers the same two levels, in the idiom of its framework:

1. **A primitive that creates the editor in an element of the component** and destroys it
   with the element, for applications that build their own UI. It takes the `EditorOptions`
   without `element` and gives the `Editor` back. React: `useStiloEditor(options)` returns
   `{ ref, editor }`; `editor` is `null` until the element is mounted.
2. **A ready component with the default UI**: the toolbar (shown by default, with the options of
   `createToolbar`), the status bar (hidden by default), the UI strings and a class for its
   element. It renders an element with three children: the toolbar container, the editor
   container and the status bar container (the toolbar is sticky inside that element). React:
   `<StiloEditor>`; its extensions default to `[defaultExtensions()]`.

The wrappers add no editor features: everything else goes through the `Editor` they give back
(the primitive's result; the component's `onReady`).

### Content: not controlled

The options are **read once, when the editor is created**: `content` is the initial content,
like `defaultValue` of a form input. Two exceptions follow their changes: `editable` (the editor
has `setEditable`) and the event handlers. The application reads the content when it needs it
(`editor.getHTML()` on save, or debounced after `input`) and loads another document with
`editor.setHTML(html, { resetHistory: true })`. A component recreated with other options gets a
new identity in its framework (React: `key`).

### Events

The ready component forwards the core events to props: `onInput`, `onSelectionChange`,
`onTransaction`, `onFocus`, `onBlur`, with the payloads of `editor.on()`. It subscribes once per
editor and calls the handler of the current render, so a new function at every render costs
nothing. Other events (those of extensions, such as `imageRejected`) go through `editor.on()`.

### Server-side rendering and Strict Mode

On the server the component renders its empty containers; the editor is created in the
framework's client-side mount hook (React: `useEffect`), so it never runs on the server.
Importing a wrapper in Node touches no DOM (ARCHITECTURE §4.2). React's Strict Mode mounts,
unmounts and mounts again in development: the first editor is destroyed and only the second
one stays.

### React without JSX

The React sources use `createElement`: no JSX setting in `tsconfig.json` and no JSX plugin in
the build.

### Vue

The Vue wrapper (T-061) is written in TypeScript with render functions (`defineComponent`, `h`):
no single-file components, so no Vue plugin in the build. `vue` is `^3.3`, the version that
brought `toValue` and `MaybeRefOrGetter`; on 2026-10-20, 3.5 had 83% of the weekly downloads of
`vue`, 3.3 and 3.4 6.5%, older 3.x versions 2%, Vue 2 (end of life) 8%. The devDependency is `vue` alone: it ships its
types and the server renderer.

- `useStiloEditor(options)` returns `{ element, editor }`: `element` is the template ref of the
  element (`<div ref="element">`; a property named `ref` would clash with Vue's `ref`), `editor`
  a `shallowRef` (a deep `ref` would make the editor reactive). The editor is created when the
  element is mounted and destroyed when it goes, also with `v-if`. `setup` runs once, so
  `editable` follows its changes when it is a ref or a getter.
- `StiloEditor` emits events instead of taking handler props: `ready` with the editor, then
  `input`, `selectionChange`, `transaction`, `focus`, `blur` (`@selection-change` in a
  template). `class` and the other attributes fall through to its element, so it has no
  `className` prop; every editor option is a declared prop, so none falls through. Boolean props
  accept the bare attribute (`<StiloEditor status-bar />`).
- No `v-model`: the content is not controlled, as above.
- The component is marked `/* @__PURE__ */`: Vue is external to the build, so bundlers would not
  know that `defineComponent` is pure and would keep the component, and with it the default UI,
  in an application that uses only the composable.

## Consequences

- `package.json` gets an `exports` entry, a build entry and an optional peer dependency for each
  wrapper; one release publishes the core and every wrapper. A breaking change in a wrapper is
  a breaking change of the package.
- D-04 stands: one package, no workspace.
- `npm run size` measures, for React and for Vue, an app with the primitive and one with the
  component, the framework itself excluded, and fails if the primitive alone pulls in the
  default UI (`lucide`, `@floating-ui/dom`).
- Applications on React 18 are not covered by the unit tests, which run on React 19: the
  release check of the package (T-063) also builds an app on React 18. Likewise Vue 3.3 and
  3.4: the tests run on 3.5, and T-063 also builds an app on Vue 3.3.
- Rejected: separate packages in an npm workspace (a monorepo against D-04, one more release
  and version to keep in step per wrapper); a controlled `value` / `onChange(html)` (cost at
  every change, the cursor lost when the value differs); React 19 only (most React downloads
  are already on 19, but React 18 still has about a fifth of them, and the wrapper needs
  nothing that only 19 has).
- Svelte (T-062) follows this shape; how it is written (a compiled Svelte component or a
  Svelte action) is decided in its task.
