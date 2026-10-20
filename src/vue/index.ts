/** Public API of the Stilo Vue wrapper. */

/** The editor with the default UI. */
export { StiloEditor, type StiloEditorEmits, type StiloEditorProps } from './stilo-editor';
/** The editor alone, for a custom UI. */
export {
  type UseStiloEditorOptions,
  type UseStiloEditorResult,
  useStiloEditor,
} from './use-stilo-editor';
