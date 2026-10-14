import { type Node, NodeRange, type NodeType } from 'prosemirror-model';
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import { type Command, type EditorState, Plugin } from 'prosemirror-state';
import { StepMap } from 'prosemirror-transform';
import { defineExtension } from '../../core/extension';
import { backspaceInList } from '../../core/helpers/lists';
import { TaskItemView } from './task-item-view';

declare module '../../core/types' {
  interface Commands {
    /**
     * Splits the task item at the cursor: the text keeps the item's state, a new empty item is
     * unchecked. In an empty item, lifts it.
     */
    splitTaskItem: () => Command;
    /** Nests the selected task items one level deeper. */
    sinkTaskItem: () => Command;
    /** Lifts the selected task items one level up (out of the list at the top level). */
    liftTaskItem: () => Command;
    /**
     * Checks the selected task items, or unchecks them when all are checked. `false` outside a
     * task item and in a code block.
     */
    toggleTaskChecked: () => Command;
  }
}

/**
 * Splits a task item: `splitListItem` gives an unchecked item at the end and copies the state in
 * the middle. At the start of a non-empty checked item, the empty item made before the text is
 * unchecked instead of the text.
 */
function splitTaskItem(taskItem: NodeType): Command {
  return (state, dispatch) => {
    const { $from } = state.selection;
    const item = $from.depth >= 2 ? $from.node(-1) : null;
    const before =
      item?.type === taskItem &&
      item.attrs.checked === true &&
      $from.parentOffset === 0 &&
      $from.index(-1) === 0 &&
      $from.parent.content.size > 0;
    if (!before) return splitListItem(taskItem, { checked: false })(state, dispatch);
    return splitListItem(taskItem, { checked: true })(
      state,
      dispatch && ((tr) => dispatch(tr.setNodeAttribute($from.before(-1), 'checked', false))),
    );
  };
}

/**
 * The task items of the selection: for each selected textblock, the innermost task item around
 * it, by position. One pass, without resolving positions (each resolve scans the siblings).
 */
function selectedTaskItems(state: EditorState, taskItem: NodeType): Map<number, Node> {
  const items = new Map<number, Node>();
  // The task items around the visited node, innermost last.
  const around: Array<{ pos: number; node: Node }> = [];
  const { from, to } = state.selection;
  state.doc.nodesBetween(from, to, (node, pos) => {
    let last = around.at(-1);
    while (last && last.pos + last.node.nodeSize <= pos) {
      around.pop();
      last = around.at(-1);
    }
    if (node.type === taskItem) around.push({ pos, node });
    if (!node.isTextblock) return true;
    if (last) items.set(last.pos, last.node);
    return false;
  });
  return items;
}

/**
 * Checks the selected task items, or unchecks them when all are checked. One step that replaces
 * the siblings holding them: a step per item would copy the parent's children each time.
 */
function toggleTaskChecked(taskItem: NodeType): Command {
  return (state, dispatch) => {
    if (state.selection.$from.parent.type.spec.code) return false;
    const items = selectedTaskItems(state, taskItem);
    if (items.size === 0) return false;
    if (dispatch) {
      const checked = [...items.values()].some((item) => item.attrs.checked !== true);
      let start = state.doc.content.size;
      let end = 0;
      for (const [pos, item] of items) {
        start = Math.min(start, pos);
        end = Math.max(end, pos + item.nodeSize);
      }
      const $start = state.doc.resolve(start);
      const range = new NodeRange($start, state.doc.resolve(end), $start.sharedDepth(end));
      const rebuild = (node: Node, pos: number): Node => {
        if (node.isTextblock || node.isLeaf) return node;
        const children: Node[] = [];
        node.forEach((child, offset) => {
          children.push(rebuild(child, pos + 1 + offset));
        });
        const attrs = items.has(pos) ? { ...node.attrs, checked } : node.attrs;
        return node.type.create(attrs, children, node.marks);
      };
      const nodes: Node[] = [];
      for (let index = range.startIndex, pos = range.start; index < range.endIndex; index++) {
        const child = range.parent.child(index);
        nodes.push(rebuild(child, pos));
        pos += child.nodeSize;
      }
      // The sizes do not change, so the selection keeps its positions.
      const tr = state.tr.replaceWith(range.start, range.end, nodes);
      dispatch(tr.setSelection(state.selection.map(tr.doc, StepMap.empty)));
    }
    return true;
  };
}

/**
 * The `taskItem` node (`<li data-checked="true|false">`), docs/SPEC.md F-406. Required by
 * `TaskList`. In the editor, a node view draws the checkbox (`TaskItemView`).
 */
export const TaskItem = defineExtension({
  name: 'taskItem',
  nodes: () => ({
    taskItem: {
      content: 'paragraph block*',
      defining: true,
      attrs: { checked: { default: false } },
      // Before the `li` rule of `listItem`.
      parseDOM: [
        {
          tag: 'li',
          context: 'taskList/',
          priority: 51,
          getAttrs: (element: HTMLElement) => ({
            checked: element.getAttribute('data-checked') === 'true',
          }),
        },
      ],
      toDOM: (node) => ['li', { 'data-checked': String(node.attrs.checked === true) }, 0],
    },
  }),
  commands: ({ schema }) => {
    const taskItem = schema.nodes.taskItem!;
    return {
      splitTaskItem: () => splitTaskItem(taskItem),
      sinkTaskItem: () => sinkListItem(taskItem),
      liftTaskItem: () => liftListItem(taskItem),
      toggleTaskChecked: () => toggleTaskChecked(taskItem),
    };
  },
  keymap: ({ editor, schema }) => ({
    Enter: () => editor.commands.splitTaskItem(),
    Tab: () => editor.commands.sinkTaskItem(),
    'Shift-Tab': () => editor.commands.liftTaskItem(),
    Backspace: backspaceInList(schema.nodes.taskItem!),
    'Mod-Enter': () => editor.commands.toggleTaskChecked(),
  }),
  plugins: () => [
    new Plugin({
      props: {
        nodeViews: {
          taskItem: (node, view, getPos) => new TaskItemView(node, view, getPos),
        },
      },
    }),
  ],
});
