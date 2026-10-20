import {
  createElement,
  type ReactElement,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
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

/** Editor events forwarded to the props of {@link StiloEditor}. */
const EVENT_PROPS = {
  input: 'onInput',
  selectionchange: 'onSelectionChange',
  transaction: 'onTransaction',
  focus: 'onFocus',
  blur: 'onBlur',
} as const;

type ForwardedEvent = keyof typeof EVENT_PROPS;

/** Event props of {@link StiloEditor}: `onInput` for `input`, and so on. */
export type StiloEditorEventProps = {
  [E in ForwardedEvent as (typeof EVENT_PROPS)[E]]?: EventHandler<EditorEvents[E]>;
};

/** Props of {@link StiloEditor}. */
export interface StiloEditorProps
  extends Omit<EditorOptions, 'element' | 'extensions'>,
    StiloEditorEventProps {
  /** Extensions to load. Default: `[defaultExtensions()]`. */
  extensions?: EditorOptions['extensions'];
  /** The default toolbar: `true` (default), `false`, or its options without `container`. */
  toolbar?: boolean | Omit<ToolbarOptions, 'container' | 'messages'>;
  /** The status bar with the word and character count, under the editor. Default: `false`. */
  statusBar?: boolean;
  /** Strings of the toolbar and the status bar. Default: `en`. */
  messages?: Messages;
  /** Class of the element that holds the toolbar, the editor and the status bar. */
  className?: string;
  /** Called once the editor is created, with the editor. */
  onReady?: (editor: Editor) => void;
}

/**
 * The editor with the default UI. The props are read once, when the editor is created, except
 * `editable` and the event handlers, which follow their changes.
 */
export function StiloEditor(props: StiloEditorProps): ReactElement {
  const [setup] = useState(() => ({
    extensions: props.extensions ?? [defaultExtensions()],
    toolbar: props.toolbar ?? true,
    statusBar: props.statusBar ?? false,
    messages: props.messages,
  }));
  const { ref, editor } = useStiloEditor({ ...props, extensions: setup.extensions });
  const toolbarHost = useRef<HTMLDivElement>(null);
  const statusHost = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const { toolbar, statusBar, messages } = setup;
    let toolbarInstance: Toolbar | undefined;
    let statusBarInstance: StatusBar | undefined;
    if (toolbar && toolbarHost.current) {
      const options = toolbar === true ? {} : toolbar;
      toolbarInstance = createToolbar(editor, {
        ...options,
        container: toolbarHost.current,
        messages,
      });
    }
    if (statusBar && statusHost.current) {
      statusBarInstance = createStatusBar(editor, { container: statusHost.current, messages });
    }
    const unlisten = (Object.keys(EVENT_PROPS) as ForwardedEvent[]).map((event) =>
      forward(editor, event, latest),
    );
    latest.current.onReady?.(editor);
    return () => {
      // Destroying the editor already removed the UI and the handlers.
      if (editor.isDestroyed) return;
      toolbarInstance?.destroy();
      statusBarInstance?.destroy();
      for (const off of unlisten) off();
    };
  }, [editor, setup]);

  return createElement(
    'div',
    { className: props.className },
    setup.toolbar ? createElement('div', { ref: toolbarHost }) : null,
    createElement('div', { ref }),
    setup.statusBar ? createElement('div', { ref: statusHost }) : null,
  );
}

/** Calls the current prop handler of `event` on every emit; returns the unsubscribe function. */
function forward<E extends ForwardedEvent>(
  editor: Editor,
  event: E,
  latest: RefObject<StiloEditorProps>,
): () => void {
  const handler = (payload: EditorEvents[E]) => {
    const prop = latest.current[EVENT_PROPS[event]] as EventHandler<EditorEvents[E]> | undefined;
    prop?.(payload);
  };
  editor.on(event, handler);
  return () => editor.off(event, handler);
}
