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

React Server Components (the Next.js App Router): `dist/react.js` starts with `'use client'`,
added by the build (Rolldown warns that it may not preserve a directive in the source), so the
component and the hook are client references that a Server Component can import. Props that are
functions (event handlers, `onReady`, extensions, custom toolbar items) cannot cross from a
Server Component: they are passed from a Client Component.

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

### Svelte

A Svelte component exists only as a `.svelte` file compiled by the Svelte compiler: it cannot be
written in plain TypeScript like the React and Vue ones. On 2026-10-20, Svelte 5 had 82% of the
weekly downloads of `svelte`, Svelte 4 14%, Svelte 3 4%. The Svelte wrapper (T-062) has two
entries, so that an application on Svelte 4 never meets a file it cannot compile:

- **`stilo-editor/svelte/action`**, for Svelte 4 and 5: two actions in TypeScript, the shape
  Svelte offers to bind a DOM library to an element. They import nothing from Svelte at run
  time, only the `ActionReturn` type, which both versions have. `stiloEditor` is the primitive
  (`<div use:stiloEditor={options}>`; the editor options without `element`, and `onready` with
  the editor). `stiloEditorWithUI` is the ready level: it creates the toolbar, editor and status
  bar containers inside its element, takes the props of the component below as options, and
  defaults `extensions` to `[defaultExtensions()]`. Svelte calls an action's `update` when its
  options change: `editable` and the callbacks follow, the rest is read once. Actions never run
  on the server. Svelte 5 also has attachments (`{@attach}`, 5.29); `fromAction` turns an action
  into one, so the wrapper does not ship both.
- **`stilo-editor/svelte`**, for Svelte 5: the `StiloEditor` component, written with runes, and
  the two actions. Svelte libraries ship their components as source, compiled by the
  application's build, because compiled output depends on the exact Svelte version; the export
  has the `svelte` condition, which Svelte's Vite plugin recognizes (also for server-side
  rendering in SvelteKit). The component is a thin shell over `stiloEditorWithUI`, whose logic
  stays in TypeScript: its script only splits the props between the action and its element.
  Events are callback props in lowercase, as in Svelte 5 (`oninput`, `onselectionchange`,
  `ontransaction`, `onfocus`, `onblur`, `onready`); `editor` is bindable (`bind:editor`); the
  attributes that are not props, `class` among them, go to its element.

The build emits `dist/svelte/action.js` and `dist/svelte/index.js`, whose import of
`./stilo-editor.svelte` stays as written, and copies the component and its hand-written types
(`stilo-editor.svelte.d.ts`) next to them. `svelte` is `^4 || ^5`. The devDependencies are
`svelte` and `@sveltejs/vite-plugin-svelte`, which compiles the component in the tests, in the
demo and in `npm run size`. `svelte-check`, the type checker of `.svelte` files, is not used: it
needs TypeScript 5 or 6, and the project is on TypeScript 7. The component's script is plain
JavaScript and its types are written in `stilo-editor.svelte.d.ts`; tsc checks the actions,
where the logic is. Biome reads `.svelte` files with `html.experimentalFullSupportEnabled`,
without which it would see the variables used only in the markup as unused.

## Consequences

- `package.json` gets an `exports` entry, a build entry and an optional peer dependency for each
  wrapper; one release publishes the core and every wrapper. A breaking change in a wrapper is
  a breaking change of the package.
- D-04 stands: one package, no workspace.
- `npm run size` measures, for React, Vue and Svelte, an app with the primitive and one with the
  component, the framework itself excluded, and fails if the primitive alone pulls in the
  default UI (`lucide`, `@floating-ui/dom`). The Svelte app with the component compiles
  `dist/svelte/stilo-editor.svelte`, as an application does.
- Applications on React 18 are not covered by the unit tests, which run on React 19: the
  release check of the package (T-063) also builds an app on React 18. Likewise Vue 3.3 and
  3.4: the tests run on 3.5, and T-063 also builds an app on Vue 3.3. Likewise Svelte 4: the
  tests run on Svelte 5, and T-063 also builds an app on Svelte 4 with the actions.
- Rejected: separate packages in an npm workspace (a monorepo against D-04, one more release
  and version to keep in step per wrapper); a controlled `value` / `onChange(html)` (cost at
  every change, the cursor lost when the value differs); React 19 only (most React downloads
  are already on 19, but React 18 still has about a fifth of them, and the wrapper needs
  nothing that only 19 has).
- Svelte 4 gets the actions, not the component: a component in the syntax Svelte 4 compiles
  would give the Svelte 5 majority the legacy mode, and a second component would double the
  work.
- Rejected for Svelte: the actions alone (no component for most Svelte users); the component
  compiled to JavaScript by our build (tied to one Svelte version); attachments instead of
  actions (Svelte 5.29 and later only).
