/** Keys of the built-in UI strings (dot.case). */
export type MessageKey =
  | 'toolbar.label'
  | 'toolbar.undo'
  | 'toolbar.redo'
  | 'toolbar.bold'
  | 'toolbar.italic'
  | 'toolbar.underline'
  | 'toolbar.strike'
  | 'toolbar.code'
  | 'toolbar.clearFormatting'
  | 'toolbar.bulletList'
  | 'toolbar.orderedList'
  | 'toolbar.blockquote'
  | 'toolbar.horizontalRule'
  | 'toolbar.heading'
  | 'heading.paragraph'
  | 'heading.h1'
  | 'heading.h2'
  | 'heading.h3'
  | 'heading.h4'
  | 'heading.h5'
  | 'heading.h6';

/** UI strings: every {@link MessageKey}, plus the label keys of custom toolbar items. */
export type Messages = Readonly<Record<MessageKey, string>> & Readonly<Record<string, string>>;
