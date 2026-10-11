import { NodeSelection, TextSelection } from 'prosemirror-state';
import { Editor } from '../../src/core/editor';
import { defineExtension, type Extension } from '../../src/core/extension';
import { Document, Paragraph, Text } from '../../src/extensions';

/**
 * Minimal extensions for testing the core without depending on the real extensions.
 * `strong` is a mark, `title` is a block with a `level` attribute that allows no marks,
 * `rule` is an atom block.
 */
export const TestStrong = defineExtension({
  name: 'strong',
  marks: () => ({
    strong: { parseDOM: [{ tag: 'strong' }], toDOM: () => ['strong', 0] },
  }),
});

export const TestTitle = defineExtension({
  name: 'title',
  nodes: () => ({
    title: {
      group: 'block',
      content: 'text*',
      marks: '',
      attrs: { level: { default: 1 } },
      parseDOM: [
        { tag: 'h1', attrs: { level: 1 } },
        { tag: 'h2', attrs: { level: 2 } },
      ],
      toDOM: (node) => [`h${node.attrs.level}`, 0],
    },
  }),
});

export const TestRule = defineExtension({
  name: 'rule',
  nodes: () => ({
    rule: { group: 'block', atom: true, parseDOM: [{ tag: 'hr' }], toDOM: () => ['hr'] },
  }),
});

/** Creates an editor with `Document`, `Text`, `Paragraph`, the test extensions and `extra`. */
export function createCoreEditor(content = '', extra: Extension[] = []): Editor {
  return new Editor({
    element: document.createElement('div'),
    extensions: [Document(), Text(), Paragraph(), TestStrong(), TestTitle(), TestRule(), ...extra],
    content,
  });
}

/** Sets a text selection (`to` defaults to `from`). */
export function select(editor: Editor, from: number, to = from): void {
  const { state } = editor;
  editor.view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, from, to)));
}

/** Selects the node at `pos`. */
export function selectNode(editor: Editor, pos: number): void {
  const { state } = editor;
  editor.view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)));
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
