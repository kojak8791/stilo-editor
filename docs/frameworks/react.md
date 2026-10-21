# Stilo with React

`stilo-editor/react` gives React 18 and 19 the editor with the default toolbar, the
`StiloEditor` component, and the editor alone for a UI of your own, the `useStiloEditor` hook.
This guide shows every task in React; the reference tables (commands, extensions, toolbar item
IDs, events, CSS custom properties) are in [API.md](../API.md) and linked where they are needed.

## 1. Install

```sh
npm install stilo-editor
```

`react` is an optional peer dependency of `stilo-editor`: the wrapper uses the React of your
application, nothing else to install.

## 2. Styles

Import the styles once, for example in the component that shows the editor:

| Import | When |
|---|---|
| `stilo-editor/style.css` | With the default toolbar (`StiloEditor`) |
| `stilo-editor/content.css` | With a UI of your own (`useStiloEditor`, §11) |

The component has no border of its own and its editable area only a small padding and
height: give the border through `className`, and size the content through `.stilo-content`, whose
rules replace the defaults:

```css
.note-editor {
  border: 1px solid #d1d9e0;
  border-radius: 6px;
}

.note-editor .stilo-content {
  min-height: 300px;
  padding: 16px;
}
```

Colors, font and sizes of the toolbar are `--stilo-*` CSS custom properties:
[API.md §6.5](../API.md#65-styles).

## 3. The component

```tsx
import 'stilo-editor/style.css';
import { StiloEditor } from 'stilo-editor/react';

export function NoteEditor({ initialHTML, onSave }: NoteEditorProps) {
  return (
    <StiloEditor
      className="note-editor"
      content={initialHTML}
      onInput={({ editor }) => onSave(editor.getHTML())}
    />
  );
}
```

The component renders a `<div>` with `className` that holds the toolbar, a `<div>` holding the
editor and, with `statusBar`, a `<div>` holding the status bar. The editor is destroyed when the
component unmounts.

## 4. Props and events

The props are read once, when the editor is created; only `editable` and the event handlers
follow their changes. To create the editor again with other props, change its React `key`.

| Prop | Default | Meaning |
|---|---|---|
| `extensions` | `[defaultExtensions()]` | Extensions to load (§12) |
| `content` | empty document | Initial HTML (§5) |
| `editable` | `true` | Whether the content can be edited (§6) |
| `autofocus`, `ariaLabel`, `compactParagraphs`, `markdownShortcuts` | | The editor options: [API.md §2.1](../API.md#21-options) |
| `toolbar` | `true` | `false` hides the toolbar; an object passes the toolbar options `items` and `sticky` (§8) |
| `statusBar` | `false` | Shows the word and character count under the editor |
| `messages` | `en` | Strings of the toolbar and the status bar (§10) |
| `className` | none | Class of the component's element |
| `onReady` | none | Called with the `Editor` once it is created |
| `onInput`, `onSelectionChange`, `onTransaction`, `onFocus`, `onBlur` | none | The events `input`, `selectionchange`, `transaction`, `focus`, `blur`, with the same payload: [API.md §2.4](../API.md#24-events) |

`onReady` gives you the `Editor`: keep it in a ref to call its methods
([API.md §2.2–§3](../API.md#22-content)) and to listen to the events the props do not cover:

```tsx
import { useRef } from 'react';
import type { Editor } from 'stilo-editor';
import { StiloEditor } from 'stilo-editor/react';

export function PostEditor() {
  const editorRef = useRef<Editor | null>(null);
  return (
    <StiloEditor
      onReady={(editor) => {
        editorRef.current = editor;
        editor.on('imageRejected', ({ reason }) => showError(reason));
      }}
    />
  );
}
```

## 5. Reading and loading the content

`content` is the initial content, like `defaultValue` of an input: the component does not give
the HTML back at every change, because serializing a large document at every keystroke would
slow typing down. Read it when you need it, on save:

```tsx
const editorRef = useRef<Editor | null>(null);

<StiloEditor onReady={(editor) => { editorRef.current = editor; }} />
<button type="button" onClick={() => save(editorRef.current?.getHTML() ?? '')}>
  Save
</button>
```

or after a pause in typing:

```tsx
const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

<StiloEditor
  onInput={({ editor }) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(editor.getHTML()), 1000);
  }}
/>
```

To open another document, give the component a `key` that changes with it, so that a new editor
starts with an empty undo history:

```tsx
<StiloEditor key={documentId} content={documentHTML} />
```

or load it into the same editor: `editorRef.current?.setHTML(html, { resetHistory: true })`.
`getText()`, `getJSON()`, `setJSON()` and `isEmpty` are in
[API.md §2.2](../API.md#22-content); the HTML that comes out is described in
[API.md §5](../API.md#5-html-in-and-out).

## 6. Read-only

`editable` follows its changes, so the editor can switch between editing and reading:

```tsx
const [readOnly, setReadOnly] = useState(false);

<StiloEditor editable={!readOnly} />
```

In read-only mode the toolbar disables its buttons, except find, and the commands do not
change the content: `editor.commands.toggleBold()` returns `false`, and so does `.can()`.
Loading a document with `setHTML` still works. To only show a document, without the toolbar:
`<StiloEditor editable={false} toolbar={false} />`.

## 7. Server-side rendering

The editor needs the browser. With server-side rendering (Next.js, Remix, React Router) the
component renders its empty `<div>` elements on the server and creates the editor, with its
toolbar, in the browser; `onReady` is called in the browser only.

In the Next.js App Router, `stilo-editor/react` is marked `'use client'`: a Server Component can
render `<StiloEditor content={html} />` with props that are plain data (`content`, `editable`,
`toolbar={false}`, `statusBar`, `className`). Event handlers, `onReady`, `extensions` and
custom toolbar items are functions, which cannot leave a Server Component: render the editor
from a Client Component of yours (a file that starts with `'use client'`) and pass them there.

## 8. Toolbar items

`toolbar` takes the toolbar options: `items`, groups of item IDs, and `sticky`, which keeps the
toolbar visible at the top of the scrolling area (default `true`):

```tsx
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

The toolbar sticks with CSS only: an element with `overflow: hidden`, even only
`overflow-x`, between the editor and the scrolling area of the page stops it, and the toolbar
scrolls away with the content. Use `overflow-x: clip` there: it cuts the content the same way
and keeps the toolbar in view. The `globals.css` of a new Next.js app sets `overflow-x: hidden` on
`html, body`: change it to `clip`.

## 9. Custom buttons

A custom button is an object in `items`; its icon comes from the
[`lucide`](https://lucide.dev) package (add it to your dependencies) and its label from
`messages`:

```tsx
import { Minus } from 'lucide';
import { StiloEditor } from 'stilo-editor/react';
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

export function ArticleEditor() {
  return (
    <StiloEditor
      toolbar={{ items: [...DEFAULT_TOOLBAR, [emDash]] }}
      messages={{ ...en, 'myApp.emDash': 'Em dash' }}
    />
  );
}
```

Define the button outside the component: the toolbar is created once. The fields of a button
(`isActive`, `isEnabled`, `shortcut`, …) are in
[API.md §6.2](../API.md#62-custom-buttons).

## 10. Languages

`en` (default) and `it` are exported by `stilo-editor/ui`:

```tsx
import { it } from 'stilo-editor/ui';

<StiloEditor messages={it} />
```

To change a few strings, spread a locale: `messages={{ ...en, 'toolbar.bold': 'Strong' }}`. The
keys: [API.md §6.4](../API.md#64-languages).

## 11. A UI of your own

`useStiloEditor(options)` creates the editor alone, without the default toolbar: it takes the
editor options ([API.md §2.1](../API.md#21-options)) without `element` and returns
`{ ref, editor }`. Pass `ref` to the element that holds the editor; `editor` is `null` until that
element is mounted, and on the server.

Your buttons call the commands ([API.md §3](../API.md#3-commands)). The editor does not
re-render your component when it changes: keep the button states in React state, updated at
every `transaction` event:

```tsx
import 'stilo-editor/content.css';
import { useEffect, useState } from 'react';
import { defaultExtensions, type Editor } from 'stilo-editor';
import { useStiloEditor } from 'stilo-editor/react';

function readButtons(editor: Editor) {
  return {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    canUndo: editor.commands.undo.can(),
    canRedo: editor.commands.redo.can(),
  };
}

export function PlainEditor() {
  const { ref, editor } = useStiloEditor({ extensions: [defaultExtensions()] });
  const [buttons, setButtons] = useState<ReturnType<typeof readButtons> | null>(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => setButtons(readButtons(editor));
    update();
    editor.on('transaction', update);
    return () => editor.off('transaction', update);
  }, [editor]);

  return (
    <div className="plain-editor">
      <div role="toolbar" onMouseDown={(event) => event.preventDefault()}>
        <button
          type="button"
          aria-pressed={buttons?.bold}
          onClick={() => editor?.commands.toggleBold()}
        >
          Bold
        </button>
        <button
          type="button"
          aria-pressed={buttons?.italic}
          onClick={() => editor?.commands.toggleItalic()}
        >
          Italic
        </button>
        <button type="button" disabled={!buttons?.canUndo} onClick={() => editor?.commands.undo()}>
          Undo
        </button>
        <button type="button" disabled={!buttons?.canRedo} onClick={() => editor?.commands.redo()}>
          Redo
        </button>
      </div>
      <div ref={ref} />
    </div>
  );
}
```

- `editor.isActive(name, attrs?)` tells whether a mark or a node is active at the selection,
  `editor.commands.<name>.can()` whether a command would apply:
  [API.md §2.3](../API.md#23-selection-state-and-focus) and [§3](../API.md#3-commands).
- `onMouseDown` with `preventDefault` keeps the focus and the selection in the editor while a
  button is clicked, as the default toolbar does.
- As with the component, the options are read once and only `editable` follows its changes.

The status bar of the default UI also works with your own UI: `createStatusBar` in
[API.md §6.3](../API.md#63-status-bar).

## 12. Extensions

Every feature is an extension. `defaultExtensions(options?)` loads them all: turn one off with
`false`, or pass its options:

```tsx
import { defaultExtensions } from 'stilo-editor';

const extensions = [
  defaultExtensions({
    code: false,
    heading: { levels: [1, 2, 3] },
    placeholder: { placeholder: 'Write something…' },
  }),
];

<StiloEditor extensions={extensions} />
```

For an editor with only some features, list the extensions one by one:

```tsx
import { Bold, Document, History, Italic, Paragraph, Text } from 'stilo-editor';

<StiloEditor
  extensions={[Document(), Text(), Paragraph(), Bold(), Italic(), History()]}
  toolbar={{ items: [['undo', 'redo'], ['bold', 'italic']] }}
/>
```

The names, the extensions and their options are in [API.md §4](../API.md#4-extensions).

## 13. TypeScript

The package ships its types. The wrapper exports:

| Type | For |
|---|---|
| `StiloEditorProps` | The props of `StiloEditor` |
| `StiloEditorEventProps` | Its event props alone (`onInput`, …) |
| `UseStiloEditorOptions`, `UseStiloEditorResult` | The options and the result of `useStiloEditor` |

`Editor`, `EditorOptions`, `EditorEvents` and `JSONContent` come from `stilo-editor`;
`ToolbarButton`, `ToolbarItem` and `Messages` from `stilo-editor/ui`. Commands are typed by the
extensions that declare them: `editor.commands.setHeading({ level: 2 })` is checked.
