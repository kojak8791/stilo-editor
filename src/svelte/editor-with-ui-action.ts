import type { ActionReturn } from 'svelte/action';
import {
  defaultExtensions,
  Editor,
  type EditorEvents,
  type EditorOptions,
  type EventHandler,
} from '../index';
import { createStatusBar, createToolbar, type Messages, type ToolbarOptions } from '../ui/index';
import { followEditable, type StiloEditorOptions } from './editor-action';

/** Editor events forwarded to the callbacks of {@link stiloEditorWithUI}. */
const CALLBACKS = {
  input: 'oninput',
  selectionchange: 'onselectionchange',
  transaction: 'ontransaction',
  focus: 'onfocus',
  blur: 'onblur',
} as const;

type ForwardedEvent = keyof typeof CALLBACKS;

/** Callbacks of {@link stiloEditorWithUI}: `oninput` for `input`, and so on. */
export type StiloEditorCallbacks = {
  [E in ForwardedEvent as (typeof CALLBACKS)[E]]?: EventHandler<EditorEvents[E]>;
};

/** Options of {@link stiloEditorWithUI}, and props of the `StiloEditor` component. */
export interface StiloEditorWithUIOptions
  extends Omit<StiloEditorOptions, 'extensions'>,
    StiloEditorCallbacks {
  /** Extensions to load. Default: `[defaultExtensions()]`. */
  extensions?: EditorOptions['extensions'];
  /** The default toolbar: `true` (default), `false`, or its options without `container`. */
  toolbar?: boolean | Omit<ToolbarOptions, 'container' | 'messages'>;
  /** The status bar with the word and character count, under the editor. Default: `false`. */
  statusBar?: boolean;
  /** Strings of the toolbar and the status bar. Default: `en`. */
  messages?: Messages;
}

/**
 * Svelte action that creates the editor with the default UI inside its element:
 * `<div use:stiloEditorWithUI={options}>`. The options are read once, when the editor is
 * created, except `editable` and the callbacks, which follow their changes.
 */
export function stiloEditorWithUI(
  node: HTMLElement,
  options: StiloEditorWithUIOptions = {},
): ActionReturn<StiloEditorWithUIOptions> {
  let current = options;
  const {
    extensions = [defaultExtensions()],
    toolbar = true,
    statusBar = false,
    messages,
    onready,
    ...editorOptions
  } = options;
  const toolbarHost = toolbar ? appendDiv(node) : null;
  const editorHost = appendDiv(node);
  const statusHost = statusBar ? appendDiv(node) : null;
  const editor = new Editor({ ...editorOptions, extensions, element: editorHost });
  if (toolbarHost) {
    const toolbarOptions = toolbar === true ? {} : toolbar;
    createToolbar(editor, { ...toolbarOptions, container: toolbarHost, messages });
  }
  if (statusHost) createStatusBar(editor, { container: statusHost, messages });
  for (const event of Object.keys(CALLBACKS) as ForwardedEvent[]) {
    forward(editor, event, () => current);
  }
  onready?.(editor);
  return {
    update: (next) => {
      current = next;
      followEditable(editor, next.editable);
    },
    // Destroying the editor also destroys the toolbar and the status bar.
    destroy: () => {
      editor.destroy();
      for (const host of [toolbarHost, editorHost, statusHost]) host?.remove();
    },
  };
}

/** Appends an empty `<div>` to `node`. */
function appendDiv(node: HTMLElement): HTMLDivElement {
  return node.appendChild(document.createElement('div'));
}

/** Calls the current callback of `event` at every `event` of the editor. */
function forward<E extends ForwardedEvent>(
  editor: Editor,
  event: E,
  options: () => StiloEditorCallbacks,
): void {
  editor.on(event, (payload) => {
    const callback = options()[CALLBACKS[event]] as EventHandler<EditorEvents[E]> | undefined;
    callback?.(payload);
  });
}
