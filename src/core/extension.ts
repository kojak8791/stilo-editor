import type { InputRule } from 'prosemirror-inputrules';
import type { MarkSpec, NodeSpec, Schema } from 'prosemirror-model';
import type { Command, Plugin } from 'prosemirror-state';
import type { Editor } from './editor';
import type { CommandFactories } from './types';

/** Context passed to the runtime parts of an extension. */
export interface ExtensionContext<Options> {
  options: Readonly<Options>;
  schema: Schema;
  editor: Editor;
}

/** Definition of an extension. See docs/ARCHITECTURE.md §6. */
export interface ExtensionSpec<Options extends object = Record<string, never>> {
  /** Unique camelCase name, equal to the main node/mark of the extension. */
  name: string;
  /** Default 100. Higher = earlier in schema order and higher keymap precedence. */
  priority?: number;
  defaultOptions?: Options;
  nodes?(options: Readonly<Options>): Record<string, NodeSpec>;
  marks?(options: Readonly<Options>): Record<string, MarkSpec>;
  commands?(ctx: ExtensionContext<Options>): Partial<CommandFactories>;
  keymap?(ctx: ExtensionContext<Options>): Record<string, Command>;
  inputRules?(ctx: ExtensionContext<Options>): InputRule[];
  plugins?(ctx: ExtensionContext<Options>): Plugin[];
}

/** A configured extension instance, created by the factory returned by {@link defineExtension}. */
export interface Extension<Options extends object = object> {
  readonly name: string;
  readonly priority: number;
  readonly options: Readonly<Options>;
  readonly spec: ExtensionSpec<Options>;
}

/** Default extension priority. */
export const DEFAULT_PRIORITY = 100;

/**
 * Defines an extension. Returns a factory that creates configured instances:
 *
 * ```ts
 * export const Heading = defineExtension<{ levels: number[] }>({ name: 'heading', ... });
 * const heading = Heading({ levels: [1, 2, 3] });
 * ```
 */
export function defineExtension<Options extends object = Record<string, never>>(
  spec: ExtensionSpec<Options>,
): (options?: Partial<Options>) => Extension<Options> {
  return (options) => ({
    name: spec.name,
    priority: spec.priority ?? DEFAULT_PRIORITY,
    options: Object.freeze({ ...spec.defaultOptions, ...options } as Options),
    spec,
  });
}
