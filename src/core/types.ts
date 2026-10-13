import type { Command, Transaction } from 'prosemirror-state';
import type { Editor } from './editor';
import type { Extension } from './extension';

/**
 * Registry of all editor commands. Each extension adds its own entries through module
 * augmentation:
 *
 * ```ts
 * declare module '../../core/types' {
 *   interface Commands {
 *     toggleBold: () => Command;
 *   }
 * }
 * ```
 */
// biome-ignore lint/suspicious/noEmptyInterface: filled by module augmentation in extensions.
export interface Commands {}

/** Name of a registered command. */
export type CommandName = keyof Commands;

/** A function that receives command arguments and returns a ProseMirror command. */
export type CommandFactory = (...args: never[]) => Command;

/** The command factories an extension provides. */
export type CommandFactories = {
  [K in CommandName]: Commands[K];
};

/**
 * An executable command: same arguments as its factory, returns whether the command applied.
 * `can(...args)` runs it without dispatching: whether it would apply.
 */
export type CommandRunner<A extends unknown[]> = ((...args: A) => boolean) & {
  can: (...args: A) => boolean;
};

/** Executable commands, by name. */
export type CommandRunners = {
  [K in CommandName]: Commands[K] extends (...args: infer A) => Command ? CommandRunner<A> : never;
};

/** ProseMirror JSON representation of a document or node. */
export interface JSONContent {
  type: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

/** Options of the {@link Editor} constructor. */
export interface EditorOptions {
  /** Container element; the editor appends its own DOM inside it. */
  element: HTMLElement;
  /** Extensions to load. Nested arrays (e.g. `defaultExtensions()`) are flattened. */
  extensions: Array<Extension | Extension[]>;
  /** Initial HTML content. Default: empty document. */
  content?: string;
  /** Whether the content is editable. Default: `true`. */
  editable?: boolean;
  /** Focus the editor after creation. Default: `false`. */
  autofocus?: boolean | 'start' | 'end';
  /** `aria-label` of the editable area. */
  ariaLabel?: string;
  /**
   * Write a list item (and, from M2, a table cell) whose only content is one paragraph without
   * attributes without its `<p>`: `<li>text</li>`. `false` keeps ProseMirror's standard output,
   * `<li><p>text</p></li>`. Default: `true`. See docs/decisions/0001-tight-list-items.md.
   */
  compactParagraphs?: boolean;
}

/** Options of `setHTML` / `setJSON`. */
export interface SetContentOptions {
  /**
   * `false` (default): replace the content with one undoable transaction.
   * `true`: create a fresh state; history and all plugin states start from scratch.
   */
  resetHistory?: boolean;
  /** Emit the `input` event. Default: `true`. */
  emitInput?: boolean;
}

/** Events emitted by the {@link Editor}. */
export interface EditorEvents {
  /** Every applied transaction. */
  transaction: { editor: Editor; transaction: Transaction };
  /** The document changed. `transaction` is `null` when the state was replaced (`resetHistory`). */
  input: { editor: Editor; transaction: Transaction | null };
  /** The selection changed while the document did not. */
  selectionchange: { editor: Editor; transaction: Transaction };
  focus: { editor: Editor; event: FocusEvent };
  blur: { editor: Editor; event: FocusEvent };
  destroy: { editor: Editor };
}
