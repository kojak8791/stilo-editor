import { type MaybeRefOrGetter, type ShallowRef, shallowRef, toValue, watch } from 'vue';
import { Editor, type EditorOptions } from '../index';

/** Options of {@link useStiloEditor}: the editor options without `element`. */
export interface UseStiloEditorOptions extends Omit<EditorOptions, 'element' | 'editable'> {
  /** Whether the content is editable; a ref or a getter is followed. Default: `true`. */
  editable?: MaybeRefOrGetter<boolean | undefined>;
}

/** What {@link useStiloEditor} returns. */
export interface UseStiloEditorResult {
  /** Template ref of the element that holds the editor: `<div ref="element">`. */
  element: ShallowRef<HTMLElement | null>;
  /** The editor; `null` before the element is mounted, on the server and after unmount. */
  editor: ShallowRef<Editor | null>;
}

/**
 * Creates an editor inside the element bound to `element` and destroys it when the element goes.
 * The options are read once, when the editor is created; only `editable` follows its changes.
 */
export function useStiloEditor(options: UseStiloEditorOptions): UseStiloEditorResult {
  const element = shallowRef<HTMLElement | null>(null);
  const editor = shallowRef<Editor | null>(null);
  const editable = () => toValue(options.editable) ?? true;

  watch(
    element,
    (target, _previous, onCleanup) => {
      if (!target) return;
      const created = new Editor({ ...options, editable: editable(), element: target });
      editor.value = created;
      onCleanup(() => {
        created.destroy();
        editor.value = null;
      });
    },
    { flush: 'post' },
  );

  watch(editable, (value) => {
    if (editor.value && editor.value.isEditable !== value) editor.value.setEditable(value);
  });

  return { element, editor };
}
