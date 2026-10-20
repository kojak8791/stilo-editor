import { closeHistory } from 'prosemirror-history';
import type { Node, Schema } from 'prosemirror-model';
import {
  type Command,
  EditorState,
  type Plugin,
  Selection,
  type Transaction,
} from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { createDropMovePlugin } from './drop';
import { EventEmitter, type EventHandler } from './events';
import type { ExtensionContext } from './extension';
import { ExtensionManager } from './extension-manager';
import { getMarkAttributes, getNodeAttributes, isMarkActive, isNodeActive } from './helpers/active';
import { parseHTML } from './html/parse';
import { cleanPastedHTML } from './html/paste';
import { sanitizeToString } from './html/sanitize';
import { createClipboardSerializer, serializeHTML } from './html/serialize';
import type {
  CommandRunner,
  CommandRunners,
  EditorEvents,
  EditorOptions,
  JSONContent,
  SetContentOptions,
} from './types';

/** Transaction meta key: when `true`, the transaction does not emit `input`. */
const SKIP_INPUT_META = 'stiloSkipInput';

/** Transaction meta key of the empty transaction that `setEditable` dispatches. */
const EDITABLE_META = 'stiloEditable';

/**
 * Transaction meta key of the empty transaction applied to every new `EditorState`: plugins can
 * normalize the loaded document in `appendTransaction` (e.g. the `Table` extension fixes
 * irregular tables), before the view shows it and without an undo step.
 */
export const LOAD_META = 'stiloLoad';

/**
 * The Stilo editor. See docs/ARCHITECTURE.md §5.
 *
 * ```ts
 * const editor = new Editor({
 *   element: document.querySelector('#editor')!,
 *   extensions: [defaultExtensions()],
 *   content: '<p>Hello <strong>world</strong></p>',
 * });
 * ```
 */
export class Editor {
  /** The ProseMirror view (escape hatch). */
  readonly view: EditorView;
  /** The schema built from the extensions. */
  readonly schema: Schema;
  /**
   * Runs a command: `editor.commands.toggleBold()` returns whether it applied;
   * `editor.commands.toggleBold.can()` tells whether it would apply, without applying it.
   */
  readonly commands: CommandRunners;

  private readonly manager: ExtensionManager;
  private readonly plugins: Plugin[];
  private readonly emitter = new EventEmitter<EditorEvents>();
  private readonly compactParagraphs: boolean;
  private destroyed = false;

  /**
   * Creates the editor:
   *
   * 1. `ExtensionManager` from `options.extensions` → `schema`;
   * 2. `createPlugins(this, emit)`, then the core `createDropMovePlugin()`; command runners are built
   *    from the manager's commands;
   * 3. initial document from `parseHTML(schema, options.content ?? '')`;
   * 4. `EditorView` mounted inside `options.element`, with attributes `class="stilo-content"`,
   *    `role="textbox"`, `aria-multiline="true"`, `aria-label` (if given); `editable` from
   *    options (default `true`); `transformPastedHTML` → `cleanPastedHTML`, then
   *    `sanitizeToString`; `clipboardSerializer` → `createClipboardSerializer`; transactions go
   *    through the editor's dispatch (see events in `EditorEvents`);
   * 5. `autofocus`: `true`/`'start'` → focus at start, `'end'` → focus at end.
   */
  constructor(options: EditorOptions) {
    this.manager = new ExtensionManager(options.extensions);
    this.schema = this.manager.schema;
    const emit: ExtensionContext<object>['emit'] = (event, payload) =>
      this.emitter.emit(event, payload);
    this.plugins = [...this.manager.createPlugins(this, emit), createDropMovePlugin()];
    this.commands = this.createRunners();
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
      transformPastedHTML: (html) => sanitizeToString(cleanPastedHTML(html)),
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
   * - `resetHistory: true`: a new `EditorState` with the same plugins; `input` is emitted with
   *   `transaction: null`.
   * - `emitInput: false` suppresses the `input` event.
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

  /**
   * Attributes of the mark or node named `name` at the selection (`getMarkAttributes` /
   * `getNodeAttributes`), e.g. the `href` of the link at the cursor. `{}` when there is none or
   * the name is unknown.
   */
  getAttributes(name: string): Record<string, unknown> {
    const markType = this.schema.marks[name];
    if (markType) return getMarkAttributes(this.state, markType);
    const nodeType = this.schema.nodes[name];
    return nodeType ? getNodeAttributes(this.state, nodeType) : {};
  }

  /**
   * Switches read-only mode on/off. A change dispatches an empty transaction, so the UIs that
   * refresh on `transaction` follow it.
   */
  setEditable(editable: boolean): void {
    if (editable === this.isEditable) return;
    this.view.setProps({ editable: () => editable });
    this.view.dispatch(this.state.tr.setMeta(EDITABLE_META, editable));
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
    const state = EditorState.create({ schema: this.schema, doc, plugins: this.plugins });
    return state.applyTransaction(state.tr.setMeta(LOAD_META, true)).state;
  }

  /** Builds `commands` from the extension commands; `can` does not apply them. */
  private createRunners(): CommandRunners {
    const runners: Record<string, CommandRunner<never[]>> = {};
    for (const [name, factory] of this.manager.commands) {
      const run = (...args: never[]) => this.runCommand(factory(...args), true);
      const can = (...args: never[]) => this.runCommand(factory(...args), false);
      runners[name] = Object.assign(run, { can });
    }
    return runners as CommandRunners;
  }

  /**
   * Runs `command`, or only tells whether it would apply. In read-only mode a command that
   * changes the document or the stored marks does not apply and returns `false`; the others
   * (selection, search) do. To know, the command builds its transaction: `can` costs as much
   * as a run there.
   */
  private runCommand(command: Command, apply: boolean): boolean {
    if (this.isEditable) {
      return command(this.state, apply ? (tr) => this.view.dispatch(tr) : undefined, this.view);
    }
    let blocked = false;
    const result = command(
      this.state,
      (tr) => {
        if (tr.docChanged || tr.storedMarksSet) blocked = true;
        else if (apply) this.view.dispatch(tr);
      },
      this.view,
    );
    return result && !blocked;
  }

  private setContent(doc: Node, options: SetContentOptions = {}): void {
    const { resetHistory = false, emitInput = true } = options;
    this.clearDOMSelection();
    if (resetHistory) {
      this.view.updateState(this.createState(doc));
      if (emitInput) this.emitter.emit('input', { editor: this, transaction: null });
      return;
    }
    const tr = this.state.tr.replaceWith(0, this.state.doc.content.size, doc.content);
    tr.setSelection(Selection.atStart(tr.doc));
    closeHistory(tr);
    if (!emitInput) tr.setMeta(SKIP_INPUT_META, true);
    this.view.dispatch(tr);
  }

  /**
   * Removes the DOM selection when it lies inside the editor. Replacing many nodes while the
   * browser tracks a selection in them is much slower (Chromium, 50,000 paragraphs: 42 s →
   * 1.6 s); ProseMirror puts the selection back after the update when the editor has focus.
   */
  private clearDOMSelection(): void {
    const selection = this.view.dom.ownerDocument.getSelection();
    if (selection?.rangeCount && this.view.dom.contains(selection.anchorNode)) {
      selection.removeAllRanges();
    }
  }

  private dispatch(tr: Transaction): void {
    if (this.destroyed) return;
    const previous = this.state;
    const { state, transactions } = previous.applyTransaction(tr);
    this.view.updateState(state);

    const payload = { editor: this, transaction: tr };
    this.emitter.emit('transaction', payload);
    if (transactions.some((applied) => applied.docChanged)) {
      if (!tr.getMeta(SKIP_INPUT_META)) this.emitter.emit('input', payload);
    } else if (!previous.selection.eq(state.selection)) {
      this.emitter.emit('selectionchange', payload);
    }
  }
}
