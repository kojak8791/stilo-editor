export { Editor } from './core/editor';
export { StiloError } from './core/errors';
export type { EventHandler } from './core/events';
export type { Extension, ExtensionContext, ExtensionSpec } from './core/extension';
export { DEFAULT_PRIORITY, defineExtension } from './core/extension';
export { attrsMatch, isMarkActive, isNodeActive } from './core/helpers/active';
export { markInputRule } from './core/helpers/input-rules';
export { setMark, toggleMark, unsetMark } from './core/helpers/marks';
export { textDecorationRules } from './core/helpers/parse-rules';
export type {
  CommandFactories,
  CommandFactory,
  CommandName,
  CommandRunners,
  Commands,
  EditorEvents,
  EditorOptions,
  JSONContent,
  SetContentOptions,
} from './core/types';
export * from './extensions';
