/** Public API of the Stilo React wrapper. */

/** The editor with the default UI. */
export { StiloEditor, type StiloEditorEventProps, type StiloEditorProps } from './stilo-editor';
/** The editor alone, for a custom UI. */
export {
  type UseStiloEditorOptions,
  type UseStiloEditorResult,
  useStiloEditor,
} from './use-stilo-editor';
