import { useEffect, useRef, useState } from 'react';
import { Editor, type EditorOptions } from '../index';

/** Options of {@link useStiloEditor}: the editor options without `element`. */
export type UseStiloEditorOptions = Omit<EditorOptions, 'element'>;

/** What {@link useStiloEditor} returns. */
export interface UseStiloEditorResult {
  /** Ref of the element that holds the editor. */
  ref: (element: HTMLElement | null) => void;
  /** The editor; `null` before the element is mounted, on the server and after unmount. */
  editor: Editor | null;
}

/**
 * Creates an editor inside the element that gets `ref` and destroys it when the element goes.
 * The options are read once, when the editor is created; only `editable` follows its changes.
 */
export function useStiloEditor(options: UseStiloEditorOptions): UseStiloEditorResult {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const initialOptions = useRef(options);

  useEffect(() => {
    if (!element) return;
    const created = new Editor({ ...initialOptions.current, element });
    setEditor(created);
    return () => {
      created.destroy();
      setEditor(null);
    };
  }, [element]);

  const editable = options.editable ?? true;
  useEffect(() => {
    // A Strict Mode remount runs this once more for the editor it has just destroyed.
    if (editor && !editor.isDestroyed && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  return { ref: setElement, editor };
}
