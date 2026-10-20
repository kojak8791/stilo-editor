import type { Component } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
import type { Editor } from '../index';
import type { StiloEditorWithUIOptions } from './editor-with-ui-action';

/**
 * Props of `StiloEditor`: the options of `stiloEditorWithUI`, `editor` to bind, and the
 * attributes of its element.
 */
export interface StiloEditorProps
  extends StiloEditorWithUIOptions,
    Omit<HTMLAttributes<HTMLDivElement>, keyof StiloEditorWithUIOptions> {
  /** The editor, for `bind:editor`; `null` until it is created. */
  editor?: Editor | null;
}

/**
 * The editor with the default UI. The props are read once, when the editor is created, except
 * `editable` and the callbacks, which follow their changes.
 */
declare const StiloEditor: Component<StiloEditorProps, object, 'editor'>;
export default StiloEditor;
