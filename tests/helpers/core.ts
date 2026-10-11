import { NodeSelection, TextSelection } from 'prosemirror-state';
import { Editor } from '../../src/core/editor';
import { defineExtension, type Extension } from '../../src/core/extension';
import { Document, Paragraph, Text } from '../../src/extensions';

/**
 * Minimal extensions for testing the core without depending on the real extensions:
 * `strong` is a mark, `code` a mark that excludes all others, `title` a block with a `level`
 * attribute that allows no marks, `rule` an atom block, `list` / `item` a bullet list.
 */
export const TestStrong = defineExtension({
  name: 'strong',
  marks: () => ({
    strong: { parseDOM: [{ tag: 'strong' }], toDOM: () => ['strong', 0] },
  }),
});

export const TestCode = defineExtension({
  name: 'code',
  marks: () => ({
    code: { excludes: '_', parseDOM: [{ tag: 'code' }], toDOM: () => ['code', 0] },
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

/**
 * Two list types, `list` (`<ul>`) and `numbered` (`<ol>`), in the `list` group, whose items
 * (`<li>`) hold `paragraph block*`, like the real lists.
 */
export const TestList = defineExtension({
  name: 'list',
  nodes: () => ({
    list: {
      group: 'block list',
      content: 'item+',
      parseDOM: [{ tag: 'ul' }],
      toDOM: () => ['ul', 0],
    },
    numbered: {
      group: 'block list',
      content: 'item+',
      parseDOM: [{ tag: 'ol' }],
      toDOM: () => ['ol', 0],
    },
    item: {
      content: 'paragraph block*',
      defining: true,
      parseDOM: [{ tag: 'li' }],
      toDOM: () => ['li', 0],
    },
  }),
});

/** Creates an editor with `Document`, `Text`, `Paragraph`, the test extensions and `extra`. */
export function createCoreEditor(content = '', extra: Extension[] = []): Editor {
  return new Editor({
    element: document.createElement('div'),
    extensions: [
      Document(),
      Text(),
      Paragraph(),
      TestStrong(),
      TestCode(),
      TestTitle(),
      TestRule(),
      TestList(),
      ...extra,
    ],
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
