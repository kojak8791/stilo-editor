import type { Mark } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { Editor } from '../../src/core/editor';
import type { Extension } from '../../src/core/extension';
import { serializeHTML } from '../../src/core/html/serialize';
import { StarterKit } from '../../src/extensions';

/**
 * Selection markers in test HTML: `|` is the cursor, `[` and `]` delimit a range.
 * Test content must not contain these characters as text.
 */
const MARKERS = ['|', '[', ']'] as const;

type Marker = (typeof MARKERS)[number];

/** Options of {@link createTestEditor}. */
export interface TestEditorOptions {
  /** Default: `[StarterKit()]`. */
  extensions?: Array<Extension | Extension[]>;
  /** Initial HTML, optionally with selection markers. Default: empty document. */
  html?: string;
}

/**
 * Creates an editor from HTML with selection markers:
 *
 * ```ts
 * createTestEditor({ html: '<p>a|b</p>' });   // cursor between "a" and "b"
 * createTestEditor({ html: '<p>[ab]c</p>' }); // "ab" selected
 * ```
 *
 * The markers are removed from the document and become the selection of a fresh state, so
 * they leave no undo step. Without markers the selection is at the start of the document.
 */
export function createTestEditor(options: TestEditorOptions = {}): Editor {
  const editor = new Editor({
    element: document.createElement('div'),
    extensions: options.extensions ?? [StarterKit()],
    content: options.html ?? '',
  });
  const { state } = editor;

  // Markers become text characters in the parsed document: find their positions.
  const found: Array<{ marker: Marker; pos: number }> = [];
  state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    [...node.text!].forEach((char, index) => {
      if ((MARKERS as readonly string[]).includes(char)) {
        found.push({ marker: char as Marker, pos: pos + index });
      }
    });
  });
  if (found.length === 0) return editor;

  // Delete from the last marker to the first so earlier positions stay valid; each marker's
  // final position is its original one minus the markers before it.
  const tr = state.tr;
  for (const { pos } of [...found].reverse()) tr.delete(pos, pos + 1);
  const [anchor, head] = selectionFromMarkers(found.map(({ marker, pos }, i) => [marker, pos - i]));

  editor.view.updateState(
    EditorState.create({
      doc: tr.doc,
      plugins: state.plugins,
      selection: TextSelection.create(tr.doc, anchor, head),
    }),
  );
  return editor;
}

/** Validates the markers and returns the selection `[anchor, head]`. */
function selectionFromMarkers(markers: Array<[Marker, number]>): [number, number] {
  const sequence = markers.map(([marker]) => marker).join('');
  if (sequence === '|') return [markers[0]![1], markers[0]![1]];
  if (sequence === '[]') return [markers[0]![1], markers[1]![1]];
  throw new Error(`Invalid selection markers "${sequence}": use one "|" or one "[" … "]".`);
}

/**
 * The canonical HTML of the editor with the selection markers re-inserted. Markers carry marks
 * so that they read naturally:
 *
 * - `|` gets the marks the next typed character would get (stored marks, else the marks at the
 *   cursor): `<strong>b|</strong>` means typing continues in bold, `<strong>b</strong>|` that
 *   it does not;
 * - `[` gets the marks of the first selected character and `]` those of the last one, so the
 *   brackets hug the selected text.
 *
 * Only text selections are supported.
 */
export function getHTMLWithSelection(editor: Editor): string {
  const { state } = editor;
  const { selection } = state;
  if (!(selection instanceof TextSelection)) {
    throw new Error('getHTMLWithSelection supports text selections only.');
  }

  const { $from, $to } = selection;
  const points: Array<[number, Marker, readonly Mark[]]> = selection.empty
    ? [[$from.pos, '|', state.storedMarks ?? $from.marks()]]
    : [
        [$to.pos, ']', $to.nodeBefore?.marks ?? []],
        [$from.pos, '[', $from.nodeAfter?.marks ?? []],
      ];
  // Insert from the end so the earlier position stays valid.
  const tr = state.tr;
  for (const [pos, marker, marks] of points) tr.insert(pos, state.schema.text(marker, marks));
  return serializeHTML(state.schema, tr.doc.content);
}

/** Types `text` character by character, letting input rules handle each character. */
export function typeText(editor: Editor, text: string): void {
  const { view } = editor;
  for (const char of text) {
    const { from, to } = view.state.selection;
    const insert = () => view.state.tr.insertText(char, from, to);
    const handled = view.someProp('handleTextInput', (handler) =>
      handler(view, from, to, char, insert),
    );
    if (!handled) view.dispatch(insert());
  }
}

/**
 * Sends a key combination to the editor's keymaps, e.g. `pressKey(editor, 'Mod-b')`. `Mod` is
 * `Ctrl` (the test environment is not a Mac). Returns whether a keymap handled the key.
 */
export function pressKey(editor: Editor, combo: string): boolean {
  const parts = combo.split('-');
  const key = parts.pop()!;
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: parts.includes('Mod') || parts.includes('Ctrl'),
    shiftKey: parts.includes('Shift'),
    altKey: parts.includes('Alt'),
    metaKey: parts.includes('Meta'),
    bubbles: true,
    cancelable: true,
  });
  return editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event)) ?? false;
}

/** Runs the editor's paste logic on `html` (sanitized by the editor). Returns whether it was handled. */
export function pasteHTML(editor: Editor, html: string): boolean {
  return editor.view.pasteHTML(html, new Event('paste') as ClipboardEvent);
}

/** Runs the editor's paste logic on plain `text`. Returns whether it was handled. */
export function pasteText(editor: Editor, text: string): boolean {
  return editor.view.pasteText(text, new Event('paste') as ClipboardEvent);
}

/** What copying the current selection puts on the clipboard: `html` and plain `text`. */
export function copySelection(editor: Editor): { html: string; text: string } {
  const { dom, text } = editor.view.serializeForClipboard(editor.state.selection.content());
  return { html: dom.innerHTML, text };
}
