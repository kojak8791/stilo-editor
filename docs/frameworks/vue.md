# Stilo with Vue

`stilo-editor/vue` gives Vue 3.4 and later the editor with the default toolbar, the
`StiloEditor` component, and the editor alone for a UI of your own, the `useStiloEditor`
composable. This guide shows every task in Vue; the reference tables (commands, extensions,
toolbar item IDs, events, CSS custom properties) are in [API.md](../API.md) and linked where
they are needed.

## 1. Install

```sh
npm install stilo-editor
```

`vue` is an optional peer dependency of `stilo-editor`: the wrapper uses the Vue of your
application, nothing else to install.

## 2. Styles

Import the styles once, for example in the component that shows the editor:

| Import | When |
|---|---|
| `stilo-editor/style.css` | With the default toolbar (`StiloEditor`) |
| `stilo-editor/content.css` | With a UI of your own (`useStiloEditor`, §11) |

The component has no border of its own and its editable area only a small padding and
height: give the border through its `class`, and size the content through `.stilo-content`, whose
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

In a `<style scoped>` block, reach the content with `.note-editor :deep(.stilo-content)`: the
editor creates its elements outside your template. Colors, font and sizes of the toolbar are
`--stilo-*` CSS custom properties: [API.md §6.5](../API.md#65-styles).

## 3. The component

```vue
<script setup lang="ts">
import 'stilo-editor/style.css';
import { StiloEditor } from 'stilo-editor/vue';

defineProps<{ initialHTML: string }>();
const emit = defineEmits<{ save: [html: string] }>();
</script>

<template>
  <StiloEditor
    class="note-editor"
    :content="initialHTML"
    @input="({ editor }) => emit('save', editor.getHTML())"
  />
</template>
```

The component renders a `<div>` that holds the toolbar, a `<div>` holding the editor and, with
`status-bar`, a `<div>` holding the status bar. `class`, `style` and the other attributes go on
the outer `<div>`. The editor is destroyed when the component unmounts.

## 4. Props and events

The props are read once, when the editor is created; only `editable` follows its changes. To
create the editor again with other props, change its `key`.

| Prop | Default | Meaning |
|---|---|---|
| `extensions` | `[defaultExtensions()]` | Extensions to load (§12) |
| `content` | empty document | Initial HTML (§5) |
| `editable` | `true` | Whether the content can be edited (§6) |
| `autofocus`, `aria-label`, `compact-paragraphs`, `markdown-shortcuts` | | The editor options: [API.md §2.1](../API.md#21-options) |
| `toolbar` | `true` | `false` hides the toolbar; an object passes the toolbar options `items` and `sticky` (§8) |
| `status-bar` | `false` | Shows the word and character count under the editor |
| `messages` | `en` | Strings of the toolbar and the status bar (§10) |

The boolean props accept the bare attribute: `<StiloEditor status-bar />`.

| Event | Payload |
|---|---|
| `ready` | The `Editor`, once it is created |
| `input`, `selection-change`, `transaction`, `focus`, `blur` | The events `input`, `selectionchange`, `transaction`, `focus`, `blur`, with the same payload: [API.md §2.4](../API.md#24-events) |

`ready` gives you the `Editor`: keep it to call its methods
([API.md §2.2–§3](../API.md#22-content)) and to listen to the events the component does not
emit. Keep it in a `shallowRef` or a plain variable: a `ref` would make the whole editor deeply
reactive.

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import type { Editor } from 'stilo-editor';
import { StiloEditor } from 'stilo-editor/vue';

const editor = shallowRef<Editor | null>(null);

function onReady(created: Editor) {
  editor.value = created;
  created.on('imageRejected', ({ reason }) => showError(reason));
}
</script>

<template>
  <StiloEditor @ready="onReady" />
</template>
```

## 5. Reading and loading the content

`content` is the initial content and the component has no `v-model`: it does not give the HTML
back at every change, because serializing a large document at every keystroke would slow typing
down. Read it when you need it, on save (`editor` is the `shallowRef` of §4):

```vue
<template>
  <StiloEditor @ready="(created) => (editor = created)" />
  <button type="button" @click="save(editor?.getHTML() ?? '')">Save</button>
</template>
```

or after a pause in typing:

```vue
<script setup lang="ts">
import type { EditorEvents } from 'stilo-editor';
import { StiloEditor } from 'stilo-editor/vue';

let timer: ReturnType<typeof setTimeout> | undefined;

function onInput({ editor }: EditorEvents['input']) {
  clearTimeout(timer);
  timer = setTimeout(() => save(editor.getHTML()), 1000);
}
</script>

<template>
  <StiloEditor @input="onInput" />
</template>
```

To open another document, give the component a `key` that changes with it, so that a new editor
starts with an empty undo history:

```vue
<StiloEditor :key="documentId" :content="documentHTML" />
```

or load it into the same editor: `editor.value?.setHTML(html, { resetHistory: true })`.
`getText()`, `getJSON()`, `setJSON()` and `isEmpty` are in
[API.md §2.2](../API.md#22-content); the HTML that comes out is described in
[API.md §5](../API.md#5-html-in-and-out).

## 6. Read-only

`editable` follows its changes, so the editor can switch between editing and reading:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { StiloEditor } from 'stilo-editor/vue';

const readOnly = ref(false);
</script>

<template>
  <StiloEditor :editable="!readOnly" />
</template>
```

In read-only mode the toolbar disables its buttons, except find, and the commands do not
change the content: `editor.commands.toggleBold()` returns `false`, and so does `.can()`.
Loading a document with `setHTML` still works. To only show a document, without the toolbar:
`<StiloEditor :editable="false" :toolbar="false" />`.

## 7. Server-side rendering

The editor needs the browser. With server-side rendering (Nuxt) the component renders its empty
`<div>` elements on the server and creates the editor, with its toolbar, in the browser; `ready`
is emitted in the browser only. No `<ClientOnly>` is needed.

## 8. Toolbar items

`toolbar` takes the toolbar options: `items`, groups of item IDs, and `sticky`, which keeps the
toolbar visible at the top of the scrolling area (default `true`):

```vue
<StiloEditor
  :toolbar="{
    items: [
      ['undo', 'redo'],
      ['heading', 'bold', 'italic', 'link'],
      ['bulletList', 'orderedList', 'taskList'],
    ],
  }"
/>
```

The item IDs, and the functions that create the color buttons, the font list and the font size
control with your own lists, are in [API.md §6.1](../API.md#61-toolbar). A button whose
extension is not loaded is not shown.

The toolbar sticks with CSS only: an element with `overflow: hidden`, even only
`overflow-x`, between the editor and the scrolling area of the page stops it, and the toolbar
scrolls away with the content. Use `overflow-x: clip` there: it cuts the content the same way
and keeps the toolbar in view.

## 9. Custom buttons

A custom button is an object in `items`; its icon comes from the
[`lucide`](https://lucide.dev) package (add it to your dependencies) and its label from
`messages`:

```vue
<script setup lang="ts">
import { Minus } from 'lucide';
import { StiloEditor } from 'stilo-editor/vue';
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

<template>
  <StiloEditor
    :toolbar="{ items: [...DEFAULT_TOOLBAR, [emDash]] }"
    :messages="{ ...en, 'myApp.emDash': 'Em dash' }"
  />
</template>
```

The fields of a button (`isActive`, `isEnabled`, `shortcut`, …) are in
[API.md §6.2](../API.md#62-custom-buttons).

## 10. Languages

`en` (default) and `it` are exported by `stilo-editor/ui`:

```vue
<script setup lang="ts">
import { it } from 'stilo-editor/ui';
import { StiloEditor } from 'stilo-editor/vue';
</script>

<template>
  <StiloEditor :messages="it" />
</template>
```

To change a few strings, spread a locale: `:messages="{ ...en, 'toolbar.bold': 'Strong' }"`.
The keys: [API.md §6.4](../API.md#64-languages).

## 11. A UI of your own

`useStiloEditor(options)` creates the editor alone, without the default toolbar: it takes the
editor options ([API.md §2.1](../API.md#21-options)) without `element` and returns
`{ element, editor }`. Bind `element` as the template ref of the element that holds the editor;
`editor` is a `shallowRef`, `null` until that element is mounted, and on the server. The editor
is created when the element appears and destroyed when it goes, also with `v-if`.

Your buttons call the commands ([API.md §3](../API.md#3-commands)). The editor does not trigger
renders when it changes: keep the button states in a ref, updated at every `transaction` event:

```vue
<script setup lang="ts">
import 'stilo-editor/content.css';
import { ref, watch } from 'vue';
import { defaultExtensions, type Editor } from 'stilo-editor';
import { useStiloEditor } from 'stilo-editor/vue';

const { element, editor } = useStiloEditor({ extensions: [defaultExtensions()] });
const buttons = ref({ bold: false, italic: false, canUndo: false, canRedo: false });

function readButtons(current: Editor) {
  buttons.value = {
    bold: current.isActive('bold'),
    italic: current.isActive('italic'),
    canUndo: current.commands.undo.can(),
    canRedo: current.commands.redo.can(),
  };
}

watch(editor, (current, _previous, onCleanup) => {
  if (!current) return;
  const update = () => readButtons(current);
  update();
  current.on('transaction', update);
  onCleanup(() => current.off('transaction', update));
});
</script>

<template>
  <div class="plain-editor">
    <div role="toolbar" @mousedown.prevent>
      <button type="button" :aria-pressed="buttons.bold" @click="editor?.commands.toggleBold()">
        Bold
      </button>
      <button
        type="button"
        :aria-pressed="buttons.italic"
        @click="editor?.commands.toggleItalic()"
      >
        Italic
      </button>
      <button type="button" :disabled="!buttons.canUndo" @click="editor?.commands.undo()">
        Undo
      </button>
      <button type="button" :disabled="!buttons.canRedo" @click="editor?.commands.redo()">
        Redo
      </button>
    </div>
    <div ref="element" />
  </div>
</template>
```

- `editor.isActive(name, attrs?)` tells whether a mark or a node is active at the selection,
  `editor.commands.<name>.can()` whether a command would apply:
  [API.md §2.3](../API.md#23-selection-state-and-focus) and [§3](../API.md#3-commands).
- `@mousedown.prevent` keeps the focus and the selection in the editor while a button is
  clicked, as the default toolbar does.
- The options are read once. `editable` follows its changes when it is a ref or a getter:
  `useStiloEditor({ extensions, editable: () => !props.readOnly })`.

The status bar of the default UI also works with your own UI: `createStatusBar` in
[API.md §6.3](../API.md#63-status-bar).

## 12. Extensions

Every feature is an extension. `defaultExtensions(options?)` loads them all: turn one off with
`false`, or pass its options:

```vue
<script setup lang="ts">
import { defaultExtensions } from 'stilo-editor';
import { StiloEditor } from 'stilo-editor/vue';

const extensions = [
  defaultExtensions({
    code: false,
    heading: { levels: [1, 2, 3] },
    placeholder: { placeholder: 'Write something…' },
  }),
];
</script>

<template>
  <StiloEditor :extensions="extensions" />
</template>
```

For an editor with only some features, list the extensions one by one:

```vue
<script setup lang="ts">
import { Bold, Document, History, Italic, Paragraph, Text } from 'stilo-editor';
import { StiloEditor } from 'stilo-editor/vue';

const extensions = [Document(), Text(), Paragraph(), Bold(), Italic(), History()];
</script>

<template>
  <StiloEditor
    :extensions="extensions"
    :toolbar="{ items: [['undo', 'redo'], ['bold', 'italic']] }"
  />
</template>
```

The names, the extensions and their options are in [API.md §4](../API.md#4-extensions).

## 13. TypeScript

The package ships its types. The wrapper exports:

| Type | For |
|---|---|
| `StiloEditorProps` | The props of `StiloEditor` |
| `StiloEditorEmits` | Its events and their payloads |
| `UseStiloEditorOptions`, `UseStiloEditorResult` | The options and the result of `useStiloEditor` |

`Editor`, `EditorOptions`, `EditorEvents` and `JSONContent` come from `stilo-editor`;
`ToolbarButton`, `ToolbarItem` and `Messages` from `stilo-editor/ui`. Commands are typed by the
extensions that declare them: `editor.commands.setHeading({ level: 2 })` is checked.
