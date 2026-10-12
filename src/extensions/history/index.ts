import { history, redo, undo } from 'prosemirror-history';
import type { Command } from 'prosemirror-state';
import { defineExtension } from '../../core/extension';

declare module '../../core/types' {
  interface Commands {
    /** Undoes the last change. */
    undo: () => Command;
    /** Redoes the last undone change. */
    redo: () => Command;
  }
}

/** Options of {@link History}. */
export interface HistoryOptions {
  /** Maximum number of undo steps kept (approximately). Default: 100. */
  depth: number;
  /** Changes closer in time than this (ms) and adjacent are grouped in one step. Default: 500. */
  newGroupDelay: number;
}

/**
 * Undo/redo with `prosemirror-history`, docs/SPEC.md F-101, F-102. Swappable: another extension
 * (e.g. collaboration) may provide `undo`/`redo` instead.
 */
export const History = defineExtension<HistoryOptions>({
  name: 'history',
  defaultOptions: { depth: 100, newGroupDelay: 500 },
  commands: () => ({
    undo: () => undo,
    redo: () => redo,
  }),
  keymap: ({ editor }) => ({
    'Mod-z': () => editor.commands.undo(),
    'Mod-Shift-z': () => editor.commands.redo(),
    'Mod-y': () => editor.commands.redo(),
  }),
  plugins: ({ options }) => [history(options)],
});
