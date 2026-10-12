import { closeHistory } from 'prosemirror-history';
import type { Node, Schema } from 'prosemirror-model';
import { EditorState, type Plugin, Selection, type Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { EventEmitter, type EventHandler } from './events';
import { ExtensionManager } from './extension-manager';
import { isMarkActive, isNodeActive } from './helpers/active';
import { parseHTML } from './html/parse';
import { sanitizeToString } from './html/sanitize';
import { createClipboardSerializer, serializeHTML } from './html/serialize';
import type {
  CommandRunners,
  EditorEvents,
  EditorOptions,
  JSONContent,
  SetContentOptions,
} from './types';

/** Transaction meta key: when `true`, the transaction does not emit `update`. */
const SKIP_UPDATE_META = 'stiloSkipUpdate';

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
  readonly view: EditorView;
  /** The schema built from the extensions. */
  readonly schema: Schema;
  /** Runs a command: `editor.commands.toggleBold()` returns whether it applied. */
  readonly commands: CommandRunners;

  private readonly manager: ExtensionManager;
  private readonly plugins: Plugin[];
  private readonly dryRunners: CommandRunners;
  private readonly emitter = new EventEmitter<EditorEvents>();
  private readonly compactParagraphs: boolean;
  private destroyed = false;

  /**
   * Creates the editor:
   *
   * 1. `ExtensionManager` from `options.extensions` → `schema`;
   * 2. `createPlugins(this)`; command runners are built from the manager's commands;
   * 3. initial document from `parseHTML(schema, options.content ?? '')`;
   * 4. `EditorView` mounted inside `options.element`, with attributes `class="stilo-content"`,
   *    `role="textbox"`, `aria-multiline="true"`, `aria-label` (if given); `editable` from
   *    options (default `true`); `transformPastedHTML` → `sanitizeToString`;
   *    `clipboardSerializer` → `createClipboardSerializer`; transactions go
   *    through the editor's dispatch (see events in `EditorEvents`);
   * 5. `autofocus`: `true`/`'start'` → focus at start, `'end'` → focus at end.
   */
  constructor(options: EditorOptions) {
    this.manager = new ExtensionManager(options.extensions);
    this.schema = this.manager.schema;
    this.plugins = this.manager.createPlugins(this);
    this.commands = this.createRunners(true);
    this.dryRunners = this.createRunners(false);
    this.compactParagraphs = options.compactParagraphs ?? true;

    const editable = options.editable ?? true;
    const clipboardSerializer = createClipboardSerializer(this.schema, {
      compactParagraphs: this.compactParagraphs,
    });
    this.view = new EditorView(options.element, {
      state: this.createState(parseHTML(this.schema, options.content ?? '')),
      editable: () => editable,
      attributes: {
        class: 'stilo-content',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(options.ariaLabel ? { 'aria-label': options.ariaLabel } : {}),
      },
      transformPastedHTML: (html) => sanitizeToString(html),
      clipboardSerializer,
      dispatchTransaction: (tr) => this.dispatch(tr),
      handleDOMEvents: {
        focus: (_view, event) => this.emitter.emit('focus', { editor: this, event }),
        blur: (_view, event) => this.emitter.emit('blur', { editor: this, event }),
      },
    });

    if (options.autofocus) this.focus(options.autofocus === 'end' ? 'end' : 'start');
  }

  /** Current editor state. */
  get state(): EditorState {
    return this.view.state;
  }

  /** `true` when the document is a single empty paragraph. */
  get isEmpty(): boolean {
    const { doc } = this.state;
    const first = doc.firstChild;
    return doc.childCount === 1 && first?.type.name === 'paragraph' && first.content.size === 0;
  }

  /** Whether the content is editable. */
  get isEditable(): boolean {
    return this.view.editable;
  }

  /** Whether {@link destroy} has been called. */
  get isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Canonical HTML of the document (`serializeHTML`, honoring `compactParagraphs`). Empty
   * document → `<p></p>`.
   */
  getHTML(): string {
    const { compactParagraphs } = this;
    return serializeHTML(this.schema, this.state.doc.content, { compactParagraphs });
  }

  /**
   * Replaces the content with `html` (sanitized and parsed with `parseHTML`).
   *
   * - `resetHistory: false` (default): one transaction replacing the whole content
   *   (`tr.replaceWith(0, doc.content.size, newDoc.content)`), selection at document start;
   *   undoable as its own step (`closeHistory`: never grouped with the changes before it).
   * - `resetHistory: true`: a new `EditorState` with the same plugins; `update` is emitted with
   *   `transaction: null`.
   * - `emitUpdate: false` suppresses the `update` event.
   */
  setHTML(html: string, options?: SetContentOptions): void {
    this.setContent(parseHTML(this.schema, html), options);
  }

  /** The document as ProseMirror JSON (`doc.toJSON()`). */
  getJSON(): JSONContent {
    return this.state.doc.toJSON();
  }

  /** Same as {@link setHTML}, from ProseMirror JSON (`Node.fromJSON`). */
  setJSON(json: JSONContent, options?: SetContentOptions): void {
    this.setContent(this.schema.nodeFromJSON(json), options);
  }

  /**
   * Plain text: `doc.textBetween(0, doc.content.size, '\n\n')`. Leaf nodes provide their own
   * text through `leafText` in their node spec (hard break → `\n`).
   */
  getText(): string {
    const { doc } = this.state;
    return doc.textBetween(0, doc.content.size, '\n\n');
  }

  /** Command runners that do not dispatch: `editor.can().toggleBold()`. */
  can(): CommandRunners {
    return this.dryRunners;
  }

  /**
   * Whether a mark or node named `name` is active (`isMarkActive` / `isNodeActive`).
   * Unknown names return `false`.
   */
  isActive(name: string, attrs?: Record<string, unknown>): boolean {
    const markType = this.schema.marks[name];
    if (markType) return isMarkActive(this.state, markType, attrs);
    const nodeType = this.schema.nodes[name];
    return nodeType ? isNodeActive(this.state, nodeType, attrs) : false;
  }

  /** Switches read-only mode on/off. */
  setEditable(editable: boolean): void {
    this.view.setProps({ editable: () => editable });
  }

  /** Focuses the editor; optionally moves the cursor to the start or end of the document. */
  focus(position?: 'start' | 'end'): void {
    if (position) {
      const { doc } = this.state;
      const selection = position === 'start' ? Selection.atStart(doc) : Selection.atEnd(doc);
      this.view.dispatch(this.state.tr.setSelection(selection));
    }
    this.view.focus();
  }

  /** Removes focus from the editor. */
  blur(): void {
    this.view.dom.blur();
  }

  /** Registers an event handler. */
  on<E extends keyof EditorEvents>(event: E, handler: EventHandler<EditorEvents[E]>): void {
    this.emitter.on(event, handler);
  }

  /** Removes an event handler. */
  off<E extends keyof EditorEvents>(event: E, handler: EventHandler<EditorEvents[E]>): void {
    this.emitter.off(event, handler);
  }

  /** Emits `destroy`, destroys the view, removes all handlers. Calling it twice is a no-op. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emitter.emit('destroy', { editor: this });
    this.view.destroy();
    this.emitter.clear();
  }

  private createState(doc: Node): EditorState {
    return EditorState.create({ schema: this.schema, doc, plugins: this.plugins });
  }

  /** Builds `commands` (dispatching) or `can()` (dry run) from the extension commands. */
  private createRunners(shouldDispatch: boolean): CommandRunners {
    const runners: Record<string, (...args: never[]) => boolean> = {};
    for (const [name, factory] of this.manager.commands) {
      runners[name] = (...args) =>
        factory(...args)(
          this.state,
          shouldDispatch ? (tr) => this.view.dispatch(tr) : undefined,
          this.view,
        );
    }
    return runners as CommandRunners;
  }

  private setContent(doc: Node, options: SetContentOptions = {}): void {
    const { resetHistory = false, emitUpdate = true } = options;
    if (resetHistory) {
      this.view.updateState(this.createState(doc));
      if (emitUpdate) this.emitter.emit('update', { editor: this, transaction: null });
      return;
    }
    const tr = this.state.tr.replaceWith(0, this.state.doc.content.size, doc.content);
    tr.setSelection(Selection.atStart(tr.doc));
    closeHistory(tr);
    if (!emitUpdate) tr.setMeta(SKIP_UPDATE_META, true);
    this.view.dispatch(tr);
  }

  private dispatch(tr: Transaction): void {
    if (this.destroyed) return;
    const previous = this.state;
    const { state, transactions } = previous.applyTransaction(tr);
    this.view.updateState(state);

    const payload = { editor: this, transaction: tr };
    this.emitter.emit('transaction', payload);
    if (transactions.some((applied) => applied.docChanged)) {
      if (!tr.getMeta(SKIP_UPDATE_META)) this.emitter.emit('update', payload);
    } else if (!previous.selection.eq(state.selection)) {
      this.emitter.emit('selectionUpdate', payload);
    }
  }
}
