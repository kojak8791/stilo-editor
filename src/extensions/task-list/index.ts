import { InputRule } from 'prosemirror-inputrules';
import type { NodeType } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import { canJoin, findWrapping } from 'prosemirror-transform';
import { defineExtension } from '../../core/extension';
import { toggleList } from '../../core/helpers/lists';

declare module '../../core/types' {
  interface Commands {
    /** Wraps the selection in a task list, lifts it out, or converts another list type. */
    toggleTaskList: () => Command;
  }
}

/**
 * `[ ] ` or `[x] ` at the start of a textblock: wraps it in a task list, its item checked for
 * `[x] ` (`[X] ` too), and joins it to a task list right before it.
 */
function taskListInputRule(taskList: NodeType): InputRule {
  return new InputRule(/^\s*\[([ xX])\]\s$/, (state, match, start, end) => {
    const tr = state.tr.delete(start, end);
    const range = tr.doc.resolve(start).blockRange();
    const wrapping = range && findWrapping(range, taskList);
    if (!range || !wrapping) return null;
    tr.wrap(range, wrapping);
    // The list opens at range.start, its item right after it.
    if (match[1] !== ' ') tr.setNodeAttribute(range.start + 1, 'checked', true);
    const before = tr.doc.resolve(range.start).nodeBefore;
    if (before?.type === taskList && canJoin(tr.doc, range.start)) tr.join(range.start);
    return tr;
  });
}

/**
 * The `taskList` node (`<ul data-type="taskList">`), docs/SPEC.md F-406. Requires `TaskItem`.
 */
export const TaskList = defineExtension({
  name: 'taskList',
  nodes: () => ({
    taskList: {
      group: 'block list',
      content: 'taskItem+',
      // Before the `ul` rule of `bulletList`.
      parseDOM: [{ tag: 'ul[data-type="taskList"]', priority: 51 }],
      toDOM: () => ['ul', { 'data-type': 'taskList' }, 0],
    },
  }),
  commands: ({ schema }) => ({
    toggleTaskList: () => toggleList(schema.nodes.taskList!, schema.nodes.taskItem!),
  }),
  keymap: ({ editor }) => ({
    'Mod-Shift-9': () => editor.commands.toggleTaskList(),
  }),
  inputRules: ({ schema }) => [taskListInputRule(schema.nodes.taskList!)],
});
