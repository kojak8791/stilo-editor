/** Public API of the Stilo default UI. */

/** Shortcut formatting utilities. */
export { formatShortcut, isMacPlatform } from './components/shortcut';
/** English UI strings. */
export { en } from './i18n/en';
/** Italian UI strings. */
export { it } from './i18n/it';

/** i18n types. */
export type { MessageKey, Messages } from './i18n/types';
/** Default toolbar items and layout. */
export { DEFAULT_ITEMS, DEFAULT_TOOLBAR } from './toolbar/items';
/** Toolbar element and creation function. */
export { createToolbar, type Toolbar, type ToolbarOptions } from './toolbar/toolbar';
/** Toolbar item types. */
export type { ToolbarButton, ToolbarItem } from './toolbar/types';
