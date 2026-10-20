# Stilo with Svelte

`stilo-editor/svelte` gives Svelte 5 the editor with the default toolbar, the `StiloEditor`
component, and gives Svelte 4 and 5 two actions: `stiloEditorWithUI`, the same editor with the
toolbar, and `stiloEditor`, the editor alone for a UI of your own. This guide shows every task
in Svelte 5, and Svelte 4 in §14; the reference tables (commands, extensions, toolbar item IDs,
events, CSS custom properties) are in [API.md](../API.md) and linked where they are needed.

## 1. Install

```sh
npm install stilo-editor
```

`svelte` is an optional peer dependency of `stilo-editor`: the wrapper uses the Svelte of your
application, nothing else to install. The wrapper has two entries:

| Import | Svelte | Content |
|---|---|---|
| `stilo-editor/svelte` | 5 | The `StiloEditor` component and the two actions |
| `stilo-editor/svelte/action` | 4 and 5 | The actions `stiloEditorWithUI` and `stiloEditor` |

The component is shipped as a `.svelte` file that your build compiles, like other Svelte
libraries: SvelteKit and the Vite templates of Svelte do it with no setup.

## 2. Styles

Import the styles once, for example in the component that shows the editor:

| Import | When |
|---|---|
| `stilo-editor/style.css` | With the default toolbar (`StiloEditor`, `stiloEditorWithUI`) |
| `stilo-editor/content.css` | With a UI of your own (`stiloEditor`, §11) |

The component has no border of its own and its editable area only a small padding and
height: give the border through its `class`, and size the content through `.stilo-content`, whose
rules replace the defaults. Svelte scopes the styles of a component to the elements of
its own markup, and the editor's elements are not in it: write these rules in a global
stylesheet, or with `:global(...)` in a `<style>` block:

```css
:global(.note-editor) {
  border: 1px solid #d1d9e0;
  border-radius: 6px;
}

:global(.note-editor .stilo-content) {
  min-height: 300px;
  padding: 16px;
}
```

Colors, font and sizes of the toolbar are `--stilo-*` CSS custom properties:
[API.md §6.5](../API.md#65-styles).

## 3. The component

```svelte
<script lang="ts">
  import 'stilo-editor/style.css';
  import { StiloEditor } from 'stilo-editor/svelte';

  let { initialHTML, onsave }: { initialHTML: string; onsave: (html: string) => void } =
    $props();
</script>

<StiloEditor
  class="note-editor"
  content={initialHTML}
  oninput={({ editor }) => onsave(editor.getHTML())}
/>
```

The component renders a `<div>` that holds the toolbar, a `<div>` holding the editor and, with
`statusBar`, a `<div>` holding the status bar. `class`, `style` and the other attributes go on
the outer `<div>`. The editor is destroyed when the component unmounts.

## 4. Props and events

The props are read once, when the editor is created; `editable` and the callbacks follow their
changes. To create the editor again with other props, wrap the component in `{#key}`.

| Prop | Default | Meaning |
|---|---|---|
| `extensions` | `[defaultExtensions()]` | Extensions to load (§12) |
| `content` | empty document | Initial HTML (§5) |
| `editable` | `true` | Whether the content can be edited (§6) |
| `autofocus`, `ariaLabel`, `compactParagraphs` | | The editor options: [API.md §2.1](../API.md#21-options) |
| `toolbar` | `true` | `false` hides the toolbar; an object passes the toolbar options `items` and `sticky` (§8) |
| `statusBar` | `false` | Shows the word and character count under the editor |
| `messages` | `en` | Strings of the toolbar and the status bar (§10) |
| `editor` | | The `Editor`, for `bind:editor`; `null` until it is created |
| `onready` | | Called with the `Editor` once it is created |
| `oninput`, `onselectionchange`, `ontransaction`, `onfocus`, `onblur` | | Called at the events `input`, `selectionchange`, `transaction`, `focus`, `blur`, with the same payload: [API.md §2.4](../API.md#24-events) |

Bind `editor` to call its methods from your markup
([API.md §2.2–§3](../API.md#22-content)), and use `onready` for the events the component does
not forward:

```svelte
<script lang="ts">
  import type { Editor } from 'stilo-editor';
  import { StiloEditor } from 'stilo-editor/svelte';

  let editor = $state<Editor | null>(null);
</script>

<button type="button" disabled={!editor} onclick={() => editor?.commands.undo()}>Undo</button>
<StiloEditor
  bind:editor
  onready={(created) => created.on('imageRejected', ({ reason }) => showError(reason))}
/>
```

## 5. Reading and loading the content

`content` is the initial content, not a binding: the component does not give the HTML back at
every change, because serializing a large document at every keystroke would slow typing down.
Read it when you need it, on save (`editor` bound as in §4):

```svelte
<StiloEditor bind:editor />
<button type="button" onclick={() => save(editor?.getHTML() ?? '')}>Save</button>
```

or after a pause in typing:

```svelte
<script lang="ts">
  import type { EditorEvents } from 'stilo-editor';
  import { StiloEditor } from 'stilo-editor/svelte';

  let timer: ReturnType<typeof setTimeout> | undefined;

  function oninput({ editor }: EditorEvents['input']) {
    clearTimeout(timer);
    timer = setTimeout(() => save(editor.getHTML()), 1000);
  }
</script>

<StiloEditor {oninput} />
```

To open another document, wrap the component in a `{#key}` block that changes with it, so that a
new editor starts with an empty undo history:

```svelte
{#key documentId}
  <StiloEditor content={documentHTML} />
{/key}
```

or load it into the same editor: `editor?.setHTML(html, { resetHistory: true })`.
`getText()`, `getJSON()`, `setJSON()` and `isEmpty` are in
[API.md §2.2](../API.md#22-content); the HTML that comes out is described in
[API.md §5](../API.md#5-html-in-and-out).

## 6. Read-only

`editable` follows its changes, so the editor can switch between editing and reading:

```svelte
<script lang="ts">
  import { StiloEditor } from 'stilo-editor/svelte';

  let readOnly = $state(false);
</script>

<label><input type="checkbox" bind:checked={readOnly} /> Read-only</label>
<StiloEditor editable={!readOnly} />
```

In read-only mode the toolbar disables its buttons, except find, and the commands do not
change the content: `editor.commands.toggleBold()` returns `false`, and so does `.can()`.
Loading a document with `setHTML` still works. To only show a document, without the toolbar:
`<StiloEditor editable={false} toolbar={false} />`.

## 7. Server-side rendering

The editor needs the browser. With server-side rendering (SvelteKit) the component renders its
empty `<div>` on the server and creates the editor, with its toolbar, in the browser; `onready`
is called in the browser only. No `browser` check is needed.

## 8. Toolbar items

`toolbar` takes the toolbar options: `items`, groups of item IDs, and `sticky`, which keeps the
toolbar visible at the top of the scrolling area (default `true`):

```svelte
<StiloEditor
  toolbar={{
    items: [
      ['undo', 'redo'],
      ['heading', 'bold', 'italic', 'link'],
      ['bulletList', 'orderedList', 'taskList'],
    ],
  }}
/>
```

The item IDs, and the functions that create the color buttons, the font list and the font size
control with your own lists, are in [API.md §6.1](../API.md#61-toolbar). A button whose
extension is not loaded is not shown.

## 9. Custom buttons

A custom button is an object in `items`; its icon comes from the
[`lucide`](https://lucide.dev) package (add it to your dependencies) and its label from
`messages`:

```svelte
<script lang="ts">
  import { Minus } from 'lucide';
  import { StiloEditor } from 'stilo-editor/svelte';
  import { DEFAULT_TOOLBAR, en, type ToolbarButton } from 'stilo-editor/ui';

  const emDash: ToolbarButton = {
    id: 'emDash',
    kind: 'button',
    icon: Minus,
    labelKey: 'myApp.emDash',
    run: (editor) => {
      editor.commands.insertText('—');
    },
  };
</script>

<StiloEditor
  toolbar={{ items: [...DEFAULT_TOOLBAR, [emDash]] }}
  messages={{ ...en, 'myApp.emDash': 'Em dash' }}
/>
```

The fields of a button (`isActive`, `isEnabled`, `shortcut`, …) are in
[API.md §6.2](../API.md#62-custom-buttons).

## 10. Languages

`en` (default) and `it` are exported by `stilo-editor/ui`:

```svelte
<script lang="ts">
  import { StiloEditor } from 'stilo-editor/svelte';
  import { it } from 'stilo-editor/ui';
</script>

<StiloEditor messages={it} />
```

To change a few strings, spread a locale: `messages={{ ...en, 'toolbar.bold': 'Strong' }}`. The
keys: [API.md §6.4](../API.md#64-languages).

## 11. A UI of your own

The `stiloEditor` action creates the editor alone, without the default toolbar:
`use:stiloEditor={options}` takes the editor options ([API.md §2.1](../API.md#21-options))
without `element`, and `onready`, and creates the editor inside its element. The editor is
destroyed with the element.

Your buttons call the commands ([API.md §3](../API.md#3-commands)). The editor does not update
your state when it changes: keep the button states in `$state`, updated at every `transaction`
event:

```svelte
<script lang="ts">
  import 'stilo-editor/content.css';
  import { defaultExtensions, type Editor } from 'stilo-editor';
  import { stiloEditor } from 'stilo-editor/svelte';

  let editor = $state<Editor | null>(null);
  let buttons = $state({ bold: false, italic: false, canUndo: false, canRedo: false });

  function onready(created: Editor) {
    editor = created;
    const update = () => {
      buttons = {
        bold: created.isActive('bold'),
        italic: created.isActive('italic'),
        canUndo: created.commands.undo.can(),
        canRedo: created.commands.redo.can(),
      };
    };
    update();
    created.on('transaction', update);
  }

  function keepFocus(event: MouseEvent) {
    event.preventDefault();
  }
</script>

<div class="plain-editor">
  <div role="toolbar">
    <button
      type="button"
      aria-pressed={buttons.bold}
      onmousedown={keepFocus}
      onclick={() => editor?.commands.toggleBold()}
    >
      Bold
    </button>
    <button
      type="button"
      aria-pressed={buttons.italic}
      onmousedown={keepFocus}
      onclick={() => editor?.commands.toggleItalic()}
    >
      Italic
    </button>
    <button
      type="button"
      disabled={!buttons.canUndo}
      onmousedown={keepFocus}
      onclick={() => editor?.commands.undo()}
    >
      Undo
    </button>
    <button
      type="button"
      disabled={!buttons.canRedo}
      onmousedown={keepFocus}
      onclick={() => editor?.commands.redo()}
    >
      Redo
    </button>
  </div>
  <div use:stiloEditor={{ extensions: [defaultExtensions()], onready }}></div>
</div>
```

- `editor.isActive(name, attrs?)` tells whether a mark or a node is active at the selection,
  `editor.commands.<name>.can()` whether a command would apply:
  [API.md §2.3](../API.md#23-selection-state-and-focus) and [§3](../API.md#3-commands).
- `keepFocus` on `mousedown` keeps the focus and the selection in the editor while a button is
  clicked, as the default toolbar does.
- The options are read once; `editable` follows its changes. The `transaction` handler goes away
  with the editor.
- On Svelte 5, `fromAction` from `svelte/attachments` turns either action into an attachment
  (`{@attach}`).

The status bar of the default UI also works with your own UI: `createStatusBar` in
[API.md §6.3](../API.md#63-status-bar).

## 12. Extensions

Every feature is an extension. `defaultExtensions(options?)` loads them all: turn one off with
`false`, or pass its options:

```svelte
<script lang="ts">
  import { defaultExtensions } from 'stilo-editor';
  import { StiloEditor } from 'stilo-editor/svelte';

  const extensions = [
    defaultExtensions({
      code: false,
      heading: { levels: [1, 2, 3] },
      placeholder: { placeholder: 'Write something…' },
    }),
  ];
</script>

<StiloEditor {extensions} />
```

For an editor with only some features, list the extensions one by one:

```svelte
<script lang="ts">
  import { Bold, Document, History, Italic, Paragraph, Text } from 'stilo-editor';
  import { StiloEditor } from 'stilo-editor/svelte';

  const extensions = [Document(), Text(), Paragraph(), Bold(), Italic(), History()];
</script>

<StiloEditor {extensions} toolbar={{ items: [['undo', 'redo'], ['bold', 'italic']] }} />
```

The names, the extensions and their options are in [API.md §4](../API.md#4-extensions).

## 13. TypeScript

The package ships its types. The wrapper exports:

| Type | From | For |
|---|---|---|
| `StiloEditorProps` | `stilo-editor/svelte` | The props of `StiloEditor` |
| `StiloEditorWithUIOptions` | both entries | The options of `stiloEditorWithUI` |
| `StiloEditorCallbacks` | both entries | Its callbacks alone (`oninput`, …) |
| `StiloEditorOptions` | both entries | The options of `stiloEditor` |

`Editor`, `EditorOptions`, `EditorEvents` and `JSONContent` come from `stilo-editor`;
`ToolbarButton`, `ToolbarItem` and `Messages` from `stilo-editor/ui`. Commands are typed by the
extensions that declare them: `editor.commands.setHeading({ level: 2 })` is checked.

## 14. Svelte 4

On Svelte 4, import from `stilo-editor/svelte/action` only: `stilo-editor/svelte` contains a
component written with runes, which the Svelte 4 compiler cannot compile.

`use:stiloEditorWithUI={options}` creates the toolbar, the editor and the status bar inside its
element, which must be empty. The options are the props of `StiloEditor` (§4) except `editor`
and the attributes: get the editor from `onready`.

```svelte
<script>
  import 'stilo-editor/style.css';
  import { stiloEditorWithUI } from 'stilo-editor/svelte/action';

  export let initialHTML;
  export let readOnly = false;
</script>

<div
  class="note-editor"
  use:stiloEditorWithUI={{
    content: initialHTML,
    editable: !readOnly,
    statusBar: true,
    oninput: ({ editor }) => save(editor.getHTML()),
  }}
></div>
```

Svelte passes the new options to the action when the values they read change: `editable` and
the callbacks follow, the rest is read once. The editor is destroyed with the element. The
`<div>` is in your markup, so its class can be styled without `:global`; the editor's elements
inside it still need `:global(.stilo-content)`.

The tasks of §5–§12 work the same way with the options of the action, in the Svelte 4 syntax:
the editor from `onready` instead of `bind:editor`, plain `let` variables instead of `$state`,
`on:click` and `on:mousedown|preventDefault` instead of `onclick` and `keepFocus`.
