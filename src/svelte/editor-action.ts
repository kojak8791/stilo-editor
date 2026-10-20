import type { ActionReturn } from 'svelte/action';
import { Editor, type EditorOptions } from '../index';

/** Options of {@link stiloEditor}: the editor options without `element`. */
export interface StiloEditorOptions extends Omit<EditorOptions, 'element'> {
  /** Called with the editor once it is created. */
  onready?: (editor: Editor) => void;
}

/**
 * Svelte action that creates an editor inside its element and destroys it when the element
 * goes: `<div use:stiloEditor={options}>`. The options are read once, when the editor is
 * created; only `editable` follows their changes.
 */
export function stiloEditor(
  node: HTMLElement,
  options: StiloEditorOptions,
): ActionReturn<StiloEditorOptions> {
  const { onready, ...editorOptions } = options;
  const editor = new Editor({ ...editorOptions, element: node });
  onready?.(editor);
  return {
    update: (next) => followEditable(editor, next.editable),
    destroy: () => editor.destroy(),
  };
}

/** Applies a new value of the `editable` option. */
export function followEditable(editor: Editor, editable: boolean | undefined): void {
  const value = editable ?? true;
  if (editor.isEditable !== value) editor.setEditable(value);
}
