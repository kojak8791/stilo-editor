import type { Schema } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { notImplemented } from './errors';
import type { EventHandler } from './events';
import type {
  CommandRunners,
  EditorEvents,
  EditorOptions,
  JSONContent,
  SetContentOptions,
} from './types';

/**
 * The Stilo editor. See docs/ARCHITECTURE.md §5.
 *
 * ```ts
 * const editor = new Editor({
 *   element: document.querySelector('#editor')!,
 *   extensions: [StarterKit()],
 *   content: '<p>Hello <strong>world</strong></p>',
 * });
 * ```
 */
export class Editor {
  /** The ProseMirror view (escape hatch). */
  readonly view!: EditorView;
  /** The schema built from the extensions. */
  readonly schema!: Schema;
  /** Runs a command: `editor.commands.toggleBold()` returns whether it applied. */
  readonly commands!: CommandRunners;

  /**
   * Creates the editor:
   *
   * 1. `ExtensionManager` from `options.extensions` → `schema`;
   * 2. `createPlugins(this)`; command runners are built from the manager's commands;
   * 3. initial document from `parseHTML(schema, options.content ?? '')`;
   * 4. `EditorView` mounted inside `options.element`, with attributes `class="stilo-content"`,
   *    `role="textbox"`, `aria-multiline="true"`, `aria-label` (if given); `editable` from
   *    options (default `true`); `transformPastedHTML` → `sanitizeToString`; transactions go
   *    through the editor's dispatch (see events in `EditorEvents`);
   * 5. `autofocus`: `true`/`'start'` → focus at start, `'end'` → focus at end.
   */
  constructor(_options: EditorOptions) {
    notImplemented('Editor');
  }

  /** Current editor state. */
  get state(): EditorState {
    return notImplemented('Editor.state');
  }

  /** `true` when the document is a single empty paragraph. */
  get isEmpty(): boolean {
    return notImplemented('Editor.isEmpty');
  }

  /** Whether the content is editable. */
  get isEditable(): boolean {
    return notImplemented('Editor.isEditable');
  }

  /** Whether {@link destroy} has been called. */
  get isDestroyed(): boolean {
    return notImplemented('Editor.isDestroyed');
  }

  /** Canonical HTML of the document (`serializeHTML`). Empty document → `<p></p>`. */
  getHTML(): string {
    return notImplemented('Editor.getHTML');
  }

  /**
   * Replaces the content with `html` (sanitized and parsed with `parseHTML`).
   *
   * - `resetHistory: false` (default): one transaction replacing the whole content
   *   (`tr.replaceWith(0, doc.content.size, newDoc.content)`), selection at document start;
   *   undoable.
   * - `resetHistory: true`: a new `EditorState` with the same plugins; `update` is emitted with
   *   `transaction: null`.
   * - `emitUpdate: false` suppresses the `update` event.
   */
  setHTML(_html: string, _options?: SetContentOptions): void {
    notImplemented('Editor.setHTML');
  }

  /** The document as ProseMirror JSON (`doc.toJSON()`). */
  getJSON(): JSONContent {
    return notImplemented('Editor.getJSON');
  }

  /** Same as {@link setHTML}, from ProseMirror JSON (`Node.fromJSON`). */
  setJSON(_json: JSONContent, _options?: SetContentOptions): void {
    notImplemented('Editor.setJSON');
  }

  /**
   * Plain text: `doc.textBetween(0, doc.content.size, '\n\n')`. Leaf nodes provide their own
   * text through `leafText` in their node spec (hard break → `\n`).
   */
  getText(): string {
    return notImplemented('Editor.getText');
  }

  /** Command runners that do not dispatch: `editor.can().toggleBold()`. */
  can(): CommandRunners {
    return notImplemented('Editor.can');
  }

  /**
   * Whether a mark or node named `name` is active (`isMarkActive` / `isNodeActive`).
   * Unknown names return `false`.
   */
  isActive(_name: string, _attrs?: Record<string, unknown>): boolean {
    return notImplemented('Editor.isActive');
  }

  /** Switches read-only mode on/off. */
  setEditable(_editable: boolean): void {
    notImplemented('Editor.setEditable');
  }

  /** Focuses the editor; optionally moves the cursor to the start or end of the document. */
  focus(_position?: 'start' | 'end'): void {
    notImplemented('Editor.focus');
  }

  /** Removes focus from the editor. */
  blur(): void {
    notImplemented('Editor.blur');
  }

  /** Registers an event handler. */
  on<E extends keyof EditorEvents>(_event: E, _handler: EventHandler<EditorEvents[E]>): void {
    notImplemented('Editor.on');
  }

  /** Removes an event handler. */
  off<E extends keyof EditorEvents>(_event: E, _handler: EventHandler<EditorEvents[E]>): void {
    notImplemented('Editor.off');
  }

  /** Emits `destroy`, destroys the view, removes all handlers. Calling it twice is a no-op. */
  destroy(): void {
    notImplemented('Editor.destroy');
  }
}
