import type { Schema } from 'prosemirror-model';
import type { Plugin } from 'prosemirror-state';
import type { Editor } from './editor';
import { notImplemented } from './errors';
import type { Extension } from './extension';
import type { CommandFactory } from './types';

/**
 * Schema order of the built-in marks, outermost first. It defines how marks nest in the HTML
 * output (docs/ARCHITECTURE.md §6.2). Marks not listed here come after these, in extension
 * order.
 */
export const MARK_ORDER: readonly string[] = [
  'link',
  'textStyle',
  'highlight',
  'bold',
  'italic',
  'underline',
  'strike',
  'subscript',
  'superscript',
  'code',
];

/** Nodes every schema must contain. */
export const REQUIRED_NODES: readonly string[] = ['doc', 'paragraph', 'text'];

/**
 * Flattens nested arrays one level and sorts extensions by `priority` (descending), keeping the
 * order of appearance for equal priorities (stable sort).
 */
export function sortExtensions(extensions: Array<Extension | Extension[]>): Extension[] {
  return notImplemented('sortExtensions');
}

/**
 * Builds the schema, plugins and commands from a list of extensions.
 * See docs/ARCHITECTURE.md §6.2 for the rules.
 */
export class ExtensionManager {
  /** The extensions, flattened and sorted with {@link sortExtensions}. */
  readonly extensions: readonly Extension[];
  readonly schema: Schema;

  /**
   * Sorts the extensions and creates the schema:
   *
   * - duplicate extension names → `StiloError`;
   * - nodes from `spec.nodes(options)` in extension order; duplicate node name → `StiloError`;
   * - marks from `spec.marks(options)`, ordered by {@link MARK_ORDER} then extension order;
   *   duplicate mark name → `StiloError`;
   * - any of {@link REQUIRED_NODES} missing → `StiloError`;
   * - `topNode` is `doc`.
   */
  constructor(extensions: Array<Extension | Extension[]>) {
    notImplemented('ExtensionManager');
  }

  /**
   * Command factories of all extensions, by command name. Empty until {@link createPlugins}
   * has been called.
   */
  get commands(): ReadonlyMap<string, CommandFactory> {
    return notImplemented('ExtensionManager.commands');
  }

  /**
   * Called once by the editor. For each extension in order, with context
   * `{ options, schema, editor }`: collects `commands` (duplicate name → `StiloError`),
   * `inputRules`, `keymap`, `plugins`. Returns, in this order:
   *
   * 1. one `inputRules({ rules })` plugin with all input rules;
   * 2. one `keymap()` plugin per extension that defines a keymap, in extension order;
   * 3. all extension plugins, in extension order;
   * 4. `keymap({ Backspace: undoInputRule })`;
   * 5. `keymap(baseKeymap)` from prosemirror-commands.
   */
  createPlugins(editor: Editor): Plugin[] {
    return notImplemented('ExtensionManager.createPlugins');
  }
}
