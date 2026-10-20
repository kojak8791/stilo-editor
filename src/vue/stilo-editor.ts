import { defineComponent, h, type PropType, shallowRef, watch } from 'vue';
import {
  defaultExtensions,
  type Editor,
  type EditorEvents,
  type EditorOptions,
  type EventHandler,
} from '../index';
import {
  createStatusBar,
  createToolbar,
  type Messages,
  type StatusBar,
  type Toolbar,
  type ToolbarOptions,
} from '../ui/index';
import { useStiloEditor } from './use-stilo-editor';

/** Editor events forwarded by {@link StiloEditor}. */
type ForwardedEvent = 'input' | 'selectionchange' | 'transaction' | 'focus' | 'blur';

/** A handler for each forwarded event. */
type Emitters = { [E in ForwardedEvent]: EventHandler<EditorEvents[E]> };

/**
 * Events of {@link StiloEditor}: `ready` with the editor once it is created, and the editor
 * events with the same payload, `selectionchange` under the name `selectionChange`.
 */
export type StiloEditorEmits = {
  ready: (editor: Editor) => void;
  input: EventHandler<EditorEvents['input']>;
  selectionChange: EventHandler<EditorEvents['selectionchange']>;
  transaction: EventHandler<EditorEvents['transaction']>;
  focus: EventHandler<EditorEvents['focus']>;
  blur: EventHandler<EditorEvents['blur']>;
};

/** Props of {@link StiloEditor}. */
export interface StiloEditorProps extends Omit<EditorOptions, 'element' | 'extensions'> {
  /** Extensions to load. Default: `[defaultExtensions()]`. */
  extensions?: EditorOptions['extensions'];
  /** The default toolbar: `true` (default), `false`, or its options without `container`. */
  toolbar?: boolean | Omit<ToolbarOptions, 'container' | 'messages'>;
  /** The status bar with the word and character count, under the editor. Default: `false`. */
  statusBar?: boolean;
  /** Strings of the toolbar and the status bar. Default: `en`. */
  messages?: Messages;
}

// Every prop is declared, or Vue would pass it to the element as an attribute. Boolean props
// accept the bare attribute (`<StiloEditor status-bar>`); the editor options stay `undefined`
// when absent, so the editor applies its own defaults.
const PROPS = {
  extensions: null,
  content: null,
  editable: { type: Boolean, default: undefined },
  autofocus: {
    type: [Boolean, String] as PropType<EditorOptions['autofocus']>,
    default: undefined,
  },
  ariaLabel: null,
  compactParagraphs: { type: Boolean, default: undefined },
  toolbar: { type: [Boolean, Object] as PropType<StiloEditorProps['toolbar']>, default: true },
  statusBar: { type: Boolean, default: false },
  messages: null,
} satisfies Record<keyof StiloEditorProps, unknown>;

// Vue is external to the build, so bundlers do not see that `defineComponent` is pure: without
// the mark, an app with `useStiloEditor` alone keeps the default UI (checked by `npm run size`).
/**
 * The editor with the default UI. The props are read once, when the editor is created, except
 * `editable`, which follows its changes.
 */
export const StiloEditor = /* @__PURE__ */ defineComponent<StiloEditorProps, StiloEditorEmits>(
  (props, { emit }) => {
    const { extensions = [defaultExtensions()], toolbar, statusBar, messages, ...options } = props;
    const { element, editor } = useStiloEditor({
      ...options,
      extensions,
      editable: () => props.editable,
    });
    const toolbarHost = shallowRef<HTMLElement | null>(null);
    const statusHost = shallowRef<HTMLElement | null>(null);
    const emitters: Emitters = {
      input: (payload) => emit('input', payload),
      selectionchange: (payload) => emit('selectionChange', payload),
      transaction: (payload) => emit('transaction', payload),
      focus: (payload) => emit('focus', payload),
      blur: (payload) => emit('blur', payload),
    };

    watch(editor, (current, _previous, onCleanup) => {
      if (!current) return;
      let toolbarInstance: Toolbar | undefined;
      let statusBarInstance: StatusBar | undefined;
      if (toolbar && toolbarHost.value) {
        const toolbarOptions = toolbar === true ? {} : toolbar;
        toolbarInstance = createToolbar(current, {
          ...toolbarOptions,
          container: toolbarHost.value,
          messages,
        });
      }
      if (statusBar && statusHost.value) {
        statusBarInstance = createStatusBar(current, { container: statusHost.value, messages });
      }
      const unlisten = (Object.keys(emitters) as ForwardedEvent[]).map((event) =>
        forward(current, event, emitters),
      );
      emit('ready', current);
      onCleanup(() => {
        // Destroying the editor already removed the UI and the handlers.
        if (current.isDestroyed) return;
        toolbarInstance?.destroy();
        statusBarInstance?.destroy();
        for (const off of unlisten) off();
      });
    });

    return () =>
      h('div', null, [
        toolbar ? h('div', { ref: toolbarHost }) : null,
        h('div', { ref: element }),
        statusBar ? h('div', { ref: statusHost }) : null,
      ]);
  },
  {
    name: 'StiloEditor',
    props: PROPS,
    emits: ['ready', 'input', 'selectionChange', 'transaction', 'focus', 'blur'],
  },
);

/** Subscribes the handler of `event` to the editor; returns the unsubscribe function. */
function forward<E extends ForwardedEvent>(
  editor: Editor,
  event: E,
  emitters: Emitters,
): () => void {
  const handler = emitters[event];
  editor.on(event, handler);
  return () => editor.off(event, handler);
}
