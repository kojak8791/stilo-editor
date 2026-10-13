import { baseKeymap } from 'prosemirror-commands';
import { type InputRule, inputRules, undoInputRule } from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import { type MarkSpec, type NodeSpec, Schema } from 'prosemirror-model';
import type { Plugin } from 'prosemirror-state';
import type { Editor } from './editor';
import { StiloError } from './errors';
import type { Extension } from './extension';
import type { CommandFactory } from './types';

/**
 * Schema order of the built-in marks, outermost first. It defines how marks nest in the HTML
 * output (docs/ARCHITECTURE.md §6.2). Marks not listed here come after these, in extension
 * order.
 */
export const MARK_ORDER: readonly string[] = [
  'link',
  'highlight',
  'textStyle',
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
  return extensions.flat().sort((a, b) => b.priority - a.priority);
}

/** Throws the error for a name defined twice. */
function assertUnique(isDuplicate: boolean, kind: string, name: string): void {
  if (isDuplicate) throw new StiloError(`Duplicate ${kind} name "${name}".`);
}

/** Position of a mark in the schema: {@link MARK_ORDER} first, then all the others. */
function markRank(name: string): number {
  const index = MARK_ORDER.indexOf(name);
  return index === -1 ? MARK_ORDER.length : index;
}

/**
 * Builds the schema, plugins and commands from a list of extensions.
 * See docs/ARCHITECTURE.md §6.2 for the rules.
 */
export class ExtensionManager {
  /** The extensions, flattened and sorted with {@link sortExtensions}. */
  readonly extensions: readonly Extension[];
  readonly schema: Schema;
  private readonly commandFactories = new Map<string, CommandFactory>();

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
    this.extensions = sortExtensions(extensions);
    const extensionNames = new Set<string>();
    const nodes = new Map<string, NodeSpec>();
    const marks = new Map<string, MarkSpec>();
    for (const extension of this.extensions) {
      assertUnique(extensionNames.has(extension.name), 'extension', extension.name);
      extensionNames.add(extension.name);
      for (const [name, spec] of Object.entries(extension.spec.nodes?.(extension.options) ?? {})) {
        assertUnique(nodes.has(name), 'node', name);
        nodes.set(name, spec);
      }
      for (const [name, spec] of Object.entries(extension.spec.marks?.(extension.options) ?? {})) {
        assertUnique(marks.has(name), 'mark', name);
        marks.set(name, spec);
      }
    }
    for (const name of REQUIRED_NODES) {
      if (!nodes.has(name)) throw new StiloError(`The schema requires a "${name}" node.`);
    }
    const sortedMarks = [...marks].sort(([a], [b]) => markRank(a) - markRank(b));
    this.schema = new Schema({
      nodes: Object.fromEntries(nodes),
      marks: Object.fromEntries(sortedMarks),
      topNode: 'doc',
    });
  }

  /**
   * Command factories of all extensions, by command name. Empty until {@link createPlugins}
   * has been called.
   */
  get commands(): ReadonlyMap<string, CommandFactory> {
    return this.commandFactories;
  }

  /**
   * Called once by the editor. For each extension in order, with context
   * `{ options, schema, editor }`: collects `commands` (duplicate name → `StiloError`),
   * `inputRules`, `keymap`, `plugins`. Returns, in this order:
   *
   * 1. one `inputRules({ rules })` plugin with all input rules;
   * 2. `keymap({ Backspace: undoInputRule })`: it applies only right after an input rule, so it
   *    takes precedence over the extensions (Backspace after `- ` gives back `- `);
   * 3. one `keymap()` plugin per extension that defines a keymap, in extension order;
   * 4. all extension plugins, in extension order;
   * 5. `keymap(baseKeymap)` from prosemirror-commands.
   */
  createPlugins(editor: Editor): Plugin[] {
    const rules: InputRule[] = [];
    const keymaps: Plugin[] = [];
    const plugins: Plugin[] = [];
    for (const extension of this.extensions) {
      const { spec } = extension;
      const ctx = { options: extension.options, schema: this.schema, editor };
      // `Commands` is filled by module augmentation, so its entries are command factories.
      const commands = Object.entries(spec.commands?.(ctx) ?? {}) as [string, CommandFactory][];
      for (const [name, factory] of commands) {
        assertUnique(this.commandFactories.has(name), 'command', name);
        this.commandFactories.set(name, factory);
      }
      rules.push(...(spec.inputRules?.(ctx) ?? []));
      const bindings = spec.keymap?.(ctx);
      if (bindings) keymaps.push(keymap(bindings));
      plugins.push(...(spec.plugins?.(ctx) ?? []));
    }
    return [
      inputRules({ rules }),
      keymap({ Backspace: undoInputRule }),
      ...keymaps,
      ...plugins,
      keymap(baseKeymap),
    ];
  }
}
