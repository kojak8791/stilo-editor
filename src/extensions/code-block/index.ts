import { newlineInCode } from 'prosemirror-commands';
import type { NodeType } from 'prosemirror-model';
import { type Command, type EditorState, TextSelection, type Transaction } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';
import { isNodeActive } from '../../core/helpers/active';
import { textblockTypeInputRule } from '../../core/helpers/input-rules';
import { setTextblockType } from '../../core/helpers/nodes';

declare module '../../core/types' {
  interface Commands {
    /**
     * Turns the selected textblocks into one code block (sibling blocks are joined, one line
     * each), or sets the language of the code block.
     */
    setCodeBlock: (attrs?: CodeBlockAttributes) => Command;
    /** Turns the selected code blocks into paragraphs, one per line. */
    unsetCodeBlock: () => Command;
    /** Removes the code block if active, otherwise adds it. */
    toggleCodeBlock: (attrs?: CodeBlockAttributes) => Command;
  }
}

/** Attributes of the `codeBlock` node. */
export interface CodeBlockAttributes {
  /** The language, written as `class="language-<language>"`; `null` for none. */
  language?: string | null;
}

const LANGUAGE_CLASS = /^language-([\w-]+)$/;
const LANGUAGE = /^[\w-]+$/;

/** The language of `language-<x>` in the class of `element`, `null` without one. */
function parseLanguage(element: Element | null): string | null {
  for (const token of element?.classList ?? []) {
    const match = LANGUAGE_CLASS.exec(token);
    if (match) return match[1]!;
  }
  return null;
}

/** Joins the sibling code blocks between `from` and `to`, a newline between each pair. */
function joinCodeBlocks(tr: Transaction, type: NodeType, from: number, to: number): void {
  const joins: number[] = [];
  tr.doc.nodesBetween(from, to, (node, pos, parent, index) => {
    if (node.type === type && index > 0 && parent?.child(index - 1).type === type) {
      joins.push(pos);
    }
    return !node.isTextblock;
  });
  for (const pos of joins.reverse()) tr.join(pos).insertText('\n', pos - 1);
}

/**
 * The `codeBlock` node (`<pre><code class="language-x">`), plain text without marks,
 * docs/SPEC.md F-306.
 */
export const CodeBlock = defineExtension({
  name: 'codeBlock',
  // Its Enter comes before the list item's, which would split the item.
  priority: 101,
  nodes: () => ({
    codeBlock: {
      group: 'block',
      content: 'text*',
      marks: '',
      code: true,
      defining: true,
      attrs: { language: { default: null } },
      parseDOM: [
        {
          tag: 'pre',
          preserveWhitespace: 'full',
          getAttrs: (node: HTMLElement) => ({
            language: parseLanguage(node.querySelector('code')) ?? parseLanguage(node),
          }),
        },
      ],
      toDOM: (node) => [
        'pre',
        ['code', node.attrs.language ? { class: `language-${node.attrs.language}` } : {}, 0],
      ],
    },
  }),
  commands: ({ schema }) => {
    const codeBlock = schema.nodes.codeBlock!;
    const paragraph = schema.nodes.paragraph!;

    const setCodeBlock = (attrs: CodeBlockAttributes = {}): Command => {
      const language = attrs.language ?? null;
      if (language !== null && !LANGUAGE.test(language)) return () => false;
      return (state, dispatch) =>
        setTextblockType(codeBlock, { language })(
          state,
          dispatch &&
            ((tr) => {
              joinCodeBlocks(tr, codeBlock, tr.selection.from, tr.selection.to);
              dispatch(tr);
            }),
        );
    };

    const unsetCodeBlock = (): Command => (state, dispatch) => {
      if (!isNodeActive(state, codeBlock)) return false;
      if (dispatch) {
        const { from, to } = state.selection;
        const tr = state.tr;
        const blocks: [number, number][] = [];
        const newlines: number[] = [];
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.type !== codeBlock) return true;
          blocks.push([pos, pos + node.nodeSize]);
          for (let i = node.textContent.indexOf('\n'); i >= 0; ) {
            newlines.push(pos + 1 + i);
            i = node.textContent.indexOf('\n', i + 1);
          }
          return false;
        });
        for (const pos of newlines.reverse()) tr.split(pos + 1).delete(pos, pos + 1);
        for (const [start, end] of blocks) {
          tr.setBlockType(tr.mapping.map(start, 1), tr.mapping.map(end, -1), paragraph);
        }
        dispatch(tr.scrollIntoView());
      }
      return true;
    };

    return {
      setCodeBlock,
      unsetCodeBlock,
      toggleCodeBlock: (attrs) => (state, dispatch) =>
        isNodeActive(state, codeBlock)
          ? unsetCodeBlock()(state, dispatch)
          : setCodeBlock(attrs)(state, dispatch),
    };
  },
  keymap: ({ editor, schema }) => {
    const inCodeBlock = (state: EditorState) =>
      state.selection.$from.parent.type === schema.nodes.codeBlock;
    return {
      'Mod-Alt-c': () => editor.commands.toggleCodeBlock(),
      // On an empty last line, Enter leaves the code block for a new paragraph.
      Enter: (state, dispatch) => {
        const { $from, empty } = state.selection;
        if (!inCodeBlock(state)) return false;
        const atEmptyLastLine =
          empty &&
          $from.parentOffset === $from.parent.content.size &&
          $from.parent.textContent.endsWith('\n');
        if (!atEmptyLastLine) return newlineInCode(state, dispatch);
        if (dispatch) {
          const after = $from.after();
          const tr = state.tr.delete($from.pos - 1, $from.pos);
          tr.insert(after - 1, schema.nodes.paragraph!.create());
          dispatch(tr.setSelection(TextSelection.create(tr.doc, after)).scrollIntoView());
        }
        return true;
      },
      'Shift-Enter': (state, dispatch) => inCodeBlock(state) && newlineInCode(state, dispatch),
      // At the start of an empty code block, Backspace turns it into a paragraph.
      Backspace: (state, dispatch) =>
        inCodeBlock(state) &&
        state.selection.empty &&
        state.selection.$from.parent.content.size === 0 &&
        setTextblockType(schema.nodes.paragraph!)(state, dispatch),
    };
  },
  inputRules: ({ schema }) => [
    textblockTypeInputRule(/^```([\w-]+)?\s$/, schema.nodes.codeBlock!, (match) => ({
      language: match[1] ?? null,
    })),
  ],
});
