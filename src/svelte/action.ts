/** Public API of `stilo-editor/svelte/action`: the Svelte actions, for Svelte 4 and 5. */

/** The editor alone, for a custom UI. */
export { type StiloEditorOptions, stiloEditor } from './editor-action';
/** The editor with the default UI. */
export {
  type StiloEditorCallbacks,
  type StiloEditorWithUIOptions,
  stiloEditorWithUI,
} from './editor-with-ui-action';
